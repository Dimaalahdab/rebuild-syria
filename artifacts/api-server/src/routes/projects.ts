import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import {
  GetProjectHeader,
  GetProjectParams,
  GetProjectResponse,
  GetProjectsHeader,
  GetProjectsResponse,
  JoinProjectBody,
  JoinProjectParams,
  JoinProjectResponse,
  MatchVolunteersBody,
  MatchVolunteersResponse,
} from "@workspace/api-zod";
import { sqlite } from "../lib/sqlite";
import { parseSkills, projectRecord } from "../lib/records";
import { matchVolunteers as askGemma, safeProviderError } from "../lib/gemma";
import { gemmaRateLimit } from "../lib/gemma-rate-limit";

const router: IRouter = Router();

function projectRows(userId: string) {
  return sqlite.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM project_memberships pm WHERE pm.project_id = p.id) AS joined_count,
      EXISTS(
        SELECT 1 FROM project_memberships mine
        WHERE mine.project_id = p.id AND mine.user_id = ?
      ) AS joined_by_user
    FROM projects p
    WHERE p.is_safe = 1 AND p.status IN ('open', 'in_progress', 'completed')
    ORDER BY CASE p.status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, p.created_at DESC
  `).all(userId) as Record<string, unknown>[];
}

function projectRow(id: string, userId: string) {
  return sqlite.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM project_memberships pm WHERE pm.project_id = p.id) AS joined_count,
      EXISTS(
        SELECT 1 FROM project_memberships mine
        WHERE mine.project_id = p.id AND mine.user_id = ?
      ) AS joined_by_user
    FROM projects p
    WHERE p.id = ? AND p.is_safe = 1
      AND p.status IN ('open', 'in_progress', 'completed')
  `).get(userId, id) as Record<string, unknown> | undefined;
}

router.get("/projects", (req, res): void => {
  const header = GetProjectsHeader.safeParse({
    "X-Demo-User-Id": req.get("X-Demo-User-Id") ?? undefined,
  });
  if (!header.success) {
    res.status(400).json({ error: header.error.message });
    return;
  }
  const rows = projectRows(header.data["X-Demo-User-Id"] ?? "");
  res.json(GetProjectsResponse.parse(rows.map((row) => projectRecord(row, Number(row.joined_by_user) === 1))));
});

router.get("/projects/:id", (req, res): void => {
  const params = GetProjectParams.safeParse(req.params);
  const header = GetProjectHeader.safeParse({
    "X-Demo-User-Id": req.get("X-Demo-User-Id") ?? undefined,
  });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!header.success) {
    res.status(400).json({ error: header.error.message });
    return;
  }
  const row = projectRow(params.data.id, header.data["X-Demo-User-Id"] ?? "");
  if (!row) {
    res.status(404).json({ error: "Safe project not found." });
    return;
  }
  res.json(GetProjectResponse.parse(projectRecord(row, Number(row.joined_by_user) === 1)));
});

router.post("/projects/:id/join", (req, res): void => {
  const params = JoinProjectParams.safeParse(req.params);
  const input = JoinProjectBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!input.success) {
    res.status(400).json({ error: input.error.message });
    return;
  }
  const user = sqlite.prepare("SELECT id, role FROM users WHERE id = ?").get(input.data.userId) as
    | Record<string, unknown>
    | undefined;
  if (!user) {
    res.status(400).json({ error: "Create a demo profile before joining a project." });
    return;
  }
  if (user.role !== "volunteer") {
    res.status(400).json({ error: "Choose the volunteer role in your demo profile to join projects." });
    return;
  }
  const project = sqlite.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM project_memberships pm WHERE pm.project_id = p.id) AS joined_count
    FROM projects p WHERE p.id = ?
  `).get(params.data.id) as Record<string, unknown> | undefined;
  if (!project || Number(project.is_safe) !== 1 || project.status !== "open") {
    res.status(400).json({ error: "This project is not open for volunteers." });
    return;
  }
  const alreadyJoined = sqlite.prepare(`
    SELECT 1 FROM project_memberships WHERE project_id = ? AND user_id = ?
  `).get(params.data.id, input.data.userId);
  if (alreadyJoined) {
    res.status(409).json({ error: "You have already joined this project." });
    return;
  }
  if (Number(project.joined_count) >= Number(project.volunteer_limit)) {
    res.status(409).json({ error: "This project has reached its volunteer limit." });
    return;
  }

  const membershipId = randomUUID();
  sqlite.prepare(`
    INSERT INTO project_memberships (id, project_id, user_id, status)
    VALUES (?, ?, ?, 'joined')
  `).run(membershipId, params.data.id, input.data.userId);
  res.status(201).json(JoinProjectResponse.parse({ success: true, membershipId }));
});

router.post("/match-volunteers", gemmaRateLimit, async (req, res): Promise<void> => {
  const input = MatchVolunteersBody.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: input.error.message });
    return;
  }
  const project = sqlite.prepare("SELECT * FROM projects WHERE id = ? AND is_safe = 1 AND status = 'open'").get(
    input.data.projectId,
  ) as Record<string, unknown> | undefined;
  if (!project) {
    res.status(404).json({ error: "Open safe project not found." });
    return;
  }

  const requiredSkills = parseSkills(project.required_skills_json);
  const volunteers = sqlite.prepare(`
    SELECT id, city, skills_json FROM users WHERE role = 'volunteer'
  `).all() as Record<string, unknown>[];
  const ranked = volunteers
    .map((volunteer) => {
      const skills = parseSkills(volunteer.skills_json);
      const overlap = skills.filter((skill) => requiredSkills.includes(skill)).length;
      const sameCity = volunteer.city === project.city;
      return {
        userId: String(volunteer.id),
        city: String(volunteer.city),
        skills,
        score: overlap * 2 + (sameCity ? 3 : 0),
        sameCity,
        overlap,
      };
    })
    .filter((volunteer) => volunteer.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 10)
    .map(({ userId, city, skills, sameCity, overlap }) => ({ userId, city, skills, sameCity, overlap }));

  try {
    const result = await askGemma(
      {
        title: String(project.title),
        city: String(project.city),
        requiredSkills,
      },
      ranked.map(({ userId, city, skills }) => ({ userId, city, skills })),
      input.data.language ?? "ar",
    );
    const recommendations = result.recommendations.slice(0, 3).map((recommendation) => {
      const volunteer = ranked.find((item) => item.userId === recommendation.userId);
      return {
        ...recommendation,
        city: volunteer?.city ?? "",
        skills: volunteer?.skills ?? [],
      };
    });
    res.json(
      MatchVolunteersResponse.parse({
        source: "gemma",
        model: result.model,
        recommendations,
      }),
    );
  } catch (error) {
    req.log.warn(
      { error: safeProviderError(error) },
      "Gemma volunteer matching unavailable; using skill and city ranking",
    );
    const recommendations = ranked.slice(0, 3).map(({ userId, city, skills, sameCity, overlap }) => ({
      userId,
      city,
      skills,
      reason: input.data.language === "en"
        ? sameCity && overlap
          ? "In the same city and has skills required for this project."
          : sameCity
            ? "In the same city and can take part locally."
            : "Has skills that match the needs of this project."
        : sameCity && overlap
          ? "في المدينة نفسها ولديه مهارات مطلوبة للمشروع."
          : sameCity
            ? "في المدينة نفسها ويمكنه المشاركة محلياً."
            : "يمتلك مهارات تتوافق مع احتياجات المشروع.",
    }));
    res.json(
      MatchVolunteersResponse.parse({
        source: "fallback",
        model: null,
        recommendations,
      }),
    );
  }
});

export default router;
