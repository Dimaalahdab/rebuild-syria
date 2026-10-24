import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import {
  ConfirmParticipationHeader,
  ConfirmParticipationParams,
  ConfirmParticipationResponse,
  CreateProjectFromReportBody,
  CreateProjectFromReportHeader,
  CreateProjectFromReportParams,
  CreateProjectFromReportResponse,
  GetAdminSummaryHeader,
  GetAdminSummaryResponse,
  UpdateProjectStatusBody,
  UpdateProjectStatusHeader,
  UpdateProjectStatusParams,
  UpdateProjectStatusResponse,
  VerifyReportHeader,
  VerifyReportParams,
  VerifyReportResponse,
} from "@workspace/api-zod";
import { sqlite } from "../lib/sqlite";
import { membershipRecord, projectRecord, reportRecord } from "../lib/records";
import { validSkills } from "../lib/skills";
import { requireAdmin } from "../lib/admin-auth";
import { reportIsUnsafe } from "../lib/report-safety";
import { confirmAttendance, notify, WorkflowError } from "../lib/municipality";

const router: IRouter = Router();

router.get("/admin/summary", requireAdmin, (req, res): void => {
  const header = GetAdminSummaryHeader.safeParse({
    "X-Admin-Pin": req.get("X-Admin-Pin"),
  });
  if (!header.success) {
    res.status(401).json({ error: "The demo admin PIN is required." });
    return;
  }

  const reports = sqlite.prepare(`
    SELECT * FROM reports WHERE status = 'new' ORDER BY created_at DESC
  `).all() as Record<string, unknown>[];
  const projects = sqlite.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM project_memberships pm WHERE pm.project_id = p.id AND pm.status IN ('accepted','confirmed')) AS joined_count,
      0 AS joined_by_user
    FROM projects p WHERE p.status = 'pending' ORDER BY p.created_at DESC
  `).all() as Record<string, unknown>[];
  const memberships = sqlite.prepare(`
    SELECT pm.id, pm.project_id, p.title AS project_title, pm.user_id,
      u.name AS user_name, u.city, pm.status
    FROM project_memberships pm
    JOIN projects p ON p.id = pm.project_id
    JOIN users u ON u.id = pm.user_id
    WHERE pm.status = 'accepted'
    ORDER BY pm.created_at DESC
  `).all() as Record<string, unknown>[];
  res.json(
    GetAdminSummaryResponse.parse({
      unverifiedReports: reports.map(reportRecord),
      pendingProjects: projects.map((row) => projectRecord(row)),
      joinedMemberships: memberships.map(membershipRecord),
    }),
  );
});

router.post("/admin/reports/:id/verify", requireAdmin, (req, res): void => {
  const params = VerifyReportParams.safeParse(req.params);
  const header = VerifyReportHeader.safeParse({ "X-Admin-Pin": req.get("X-Admin-Pin") });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!header.success) {
    res.status(400).json({ error: header.error.message });
    return;
  }
  const report = sqlite.prepare("SELECT * FROM reports WHERE id = ?").get(params.data.id) as
    | Record<string, unknown>
    | undefined;
  if (!report) {
    res.status(404).json({ error: "Report not found." });
    return;
  }

  const verify = sqlite.transaction(() => {
    sqlite.prepare("UPDATE reports SET status = 'under_review', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(params.data.id);
    if (report.status !== "under_review") notify(report.author_id, "report", params.data.id);
    if (report.author_id) {
      const award = sqlite.prepare(`
        INSERT OR IGNORE INTO impact_events (id, user_id, event_type, source_id, points)
        VALUES (?, ?, 'report_verified', ?, 10)
      `).run(randomUUID(), String(report.author_id), params.data.id);
      if (award.changes > 0) {
        sqlite.prepare("UPDATE users SET points = points + 10, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
          .run(String(report.author_id));
      }
    }
  });
  verify();
  const updated = sqlite.prepare("SELECT * FROM reports WHERE id = ?").get(params.data.id) as Record<string, unknown>;
  res.json(VerifyReportResponse.parse(reportRecord(updated)));
});

router.post("/admin/reports/:id/project", requireAdmin, (req, res): void => {
  const params = CreateProjectFromReportParams.safeParse(req.params);
  const header = CreateProjectFromReportHeader.safeParse({ "X-Admin-Pin": req.get("X-Admin-Pin") });
  const input = CreateProjectFromReportBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!header.success) {
    res.status(400).json({ error: header.error.message });
    return;
  }
  if (!input.success) {
    res.status(400).json({ error: input.error.message });
    return;
  }
  if (!validSkills(input.data.requiredSkills)) {
    res.status(400).json({ error: "One or more selected skills are not supported." });
    return;
  }
  const report = sqlite.prepare("SELECT * FROM reports WHERE id = ?").get(params.data.id) as
    | Record<string, unknown>
    | undefined;
  if (!report) {
    res.status(404).json({ error: "Report not found." });
    return;
  }
  if (reportIsUnsafe(report) || reportIsUnsafe({
    ...report,
    title: input.data.title,
    description: input.data.description,
  })) {
    res.status(400).json({ error: "This report involves a hazard and cannot become a volunteer project." });
    return;
  }

  const id = randomUUID();
  sqlite.prepare(`
    INSERT INTO projects
      (id, report_id, title, city, neighborhood, description, required_skills_json, volunteer_limit, status, is_safe)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1)
  `).run(
    id,
    params.data.id,
    input.data.title.trim(),
    input.data.city.trim(),
    input.data.neighborhood.trim(),
    input.data.description.trim(),
    JSON.stringify(input.data.requiredSkills),
    input.data.volunteerLimit,
  );
  const row = sqlite.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM project_memberships pm WHERE pm.project_id = p.id AND pm.status IN ('accepted','confirmed')) AS joined_count,
      0 AS joined_by_user
    FROM projects p WHERE p.id = ?
  `).get(id) as Record<string, unknown>;
  res.status(201).json(CreateProjectFromReportResponse.parse(projectRecord(row)));
});

router.post("/admin/projects/:id/status", requireAdmin, (req, res): void => {
  const params = UpdateProjectStatusParams.safeParse(req.params);
  const header = UpdateProjectStatusHeader.safeParse({ "X-Admin-Pin": req.get("X-Admin-Pin") });
  const input = UpdateProjectStatusBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!header.success) {
    res.status(400).json({ error: header.error.message });
    return;
  }
  if (!input.success) {
    res.status(400).json({ error: input.error.message });
    return;
  }
  const project = sqlite.prepare("SELECT * FROM projects WHERE id = ?").get(params.data.id) as
    | Record<string, unknown>
    | undefined;
  if (!project) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  if (input.data.status === "open" && (
    Number(project.is_safe) !== 1 ||
    reportIsUnsafe({ ...project, category: null })
  )) {
    res.status(400).json({ error: "Unsafe work cannot be opened to volunteers." });
    return;
  }
  if (input.data.status === "open" && project.report_id) {
    const report = sqlite.prepare("SELECT * FROM reports WHERE id = ?").get(project.report_id) as
      | Record<string, unknown>
      | undefined;
    if (!report || reportIsUnsafe(report)) {
      res.status(400).json({ error: "This project needs professional review and cannot open to volunteers." });
      return;
    }
  }
  sqlite.prepare("UPDATE projects SET status = ? WHERE id = ?").run(input.data.status, params.data.id);
  const updated = sqlite.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM project_memberships pm WHERE pm.project_id = p.id AND pm.status IN ('accepted','confirmed')) AS joined_count,
      0 AS joined_by_user
    FROM projects p WHERE p.id = ?
  `).get(params.data.id) as Record<string, unknown>;
  res.json(UpdateProjectStatusResponse.parse(projectRecord(updated)));
});

router.post("/admin/memberships/:id/confirm", requireAdmin, (req, res): void => {
  const params = ConfirmParticipationParams.safeParse(req.params);
  const header = ConfirmParticipationHeader.safeParse({ "X-Admin-Pin": req.get("X-Admin-Pin") });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!header.success) {
    res.status(400).json({ error: header.error.message });
    return;
  }
  try {
    res.json(ConfirmParticipationResponse.parse(confirmAttendance(params.data.id)));
  } catch (error) {
    if (error instanceof WorkflowError) res.status(error.status).json({ error: error.message });
    else throw error;
  }
});

export default router;
