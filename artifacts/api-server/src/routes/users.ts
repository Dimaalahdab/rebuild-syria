import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import {
  CreateUserBody,
  CreateUserResponse,
  GetUserImpactParams,
  GetUserImpactResponse,
  GetUserParams,
  GetUserProjectsParams,
  GetUserProjectsResponse,
  GetUserResponse,
  UpdateUserBody,
  UpdateUserParams,
  UpdateUserResponse,
} from "@workspace/api-zod";
import { sqlite } from "../lib/sqlite";
import { validSkills } from "../lib/skills";
import { projectRecord, userRecord } from "../lib/records";

const router: IRouter = Router();
router.post("/users", (req, res): void => {
  const input = CreateUserBody.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: input.error.message });
    return;
  }
  if (!validSkills(input.data.skills)) {
    res.status(400).json({ error: "One or more selected skills are not supported." });
    return;
  }

  const id = randomUUID();
  sqlite.prepare(`
    INSERT INTO users (id, name, role, city, skills_json)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, input.data.name.trim(), input.data.role, input.data.city.trim(), JSON.stringify(input.data.skills));
  const user = sqlite.prepare("SELECT * FROM users WHERE id = ?").get(id) as Record<string, unknown>;
  res.status(201).json(CreateUserResponse.parse(userRecord(user)));
});

router.get("/users/:id", (req, res): void => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = sqlite.prepare("SELECT * FROM users WHERE id = ?").get(params.data.id) as Record<string, unknown> | undefined;
  if (!user) {
    res.status(404).json({ error: "Profile not found." });
    return;
  }
  res.json(GetUserResponse.parse(userRecord(user)));
});

router.patch("/users/:id", (req, res): void => {
  const params = UpdateUserParams.safeParse(req.params);
  const input = UpdateUserBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!input.success) {
    res.status(400).json({ error: input.error.message });
    return;
  }
  if (input.data.skills && !validSkills(input.data.skills)) {
    res.status(400).json({ error: "One or more selected skills are not supported." });
    return;
  }

  const changes: string[] = [];
  const values: (string | number)[] = [];
  if (input.data.name !== undefined) {
    changes.push("name = ?");
    values.push(input.data.name.trim());
  }
  if (input.data.role !== undefined) {
    changes.push("role = ?");
    values.push(input.data.role);
  }
  if (input.data.city !== undefined) {
    changes.push("city = ?");
    values.push(input.data.city.trim());
  }
  if (input.data.skills !== undefined) {
    changes.push("skills_json = ?");
    values.push(JSON.stringify(input.data.skills));
  }
  if (!changes.length) {
    res.status(400).json({ error: "Choose at least one profile detail to update." });
    return;
  }
  changes.push("updated_at = CURRENT_TIMESTAMP");
  values.push(params.data.id);
  const result = sqlite.prepare(`UPDATE users SET ${changes.join(", ")} WHERE id = ?`).run(...values);
  if (result.changes === 0) {
    res.status(404).json({ error: "Profile not found." });
    return;
  }
  const user = sqlite.prepare("SELECT * FROM users WHERE id = ?").get(params.data.id) as Record<string, unknown>;
  res.json(UpdateUserResponse.parse(userRecord(user)));
});

router.get("/users/:id/impact", (req, res): void => {
  const params = GetUserImpactParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = sqlite.prepare("SELECT points FROM users WHERE id = ?").get(params.data.id) as Record<string, unknown> | undefined;
  if (!user) {
    res.status(404).json({ error: "Profile not found." });
    return;
  }
  const verifiedReports = Number(
    (sqlite.prepare("SELECT COUNT(*) AS count FROM reports WHERE author_id = ? AND status = 'verified'").get(params.data.id) as Record<string, unknown>).count,
  );
  const joinedProjects = Number(
    (sqlite.prepare("SELECT COUNT(*) AS count FROM project_memberships WHERE user_id = ?").get(params.data.id) as Record<string, unknown>).count,
  );
  const points = Number(user.points ?? 0);
  const badges: string[] = [];
  if (verifiedReports > 0) badges.push("مساهم في توثيق الحي");
  if (joinedProjects > 0) badges.push("متطوع مجتمعي");
  if (points >= 30) badges.push("أثر ملموس");
  res.json(GetUserImpactResponse.parse({ points, verifiedReports, joinedProjects, badges }));
});

router.get("/users/:id/projects", (req, res): void => {
  const params = GetUserProjectsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const exists = sqlite.prepare("SELECT 1 FROM users WHERE id = ?").get(params.data.id);
  if (!exists) {
    res.status(404).json({ error: "Profile not found." });
    return;
  }
  const rows = sqlite.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM project_memberships count_pm WHERE count_pm.project_id = p.id) AS joined_count,
      1 AS joined_by_user
    FROM projects p
    JOIN project_memberships pm ON pm.project_id = p.id
    WHERE pm.user_id = ?
    ORDER BY pm.created_at DESC
  `).all(params.data.id) as Record<string, unknown>[];
  res.json(GetUserProjectsResponse.parse(rows.map((row) => projectRecord(row, true))));
});

export default router;
