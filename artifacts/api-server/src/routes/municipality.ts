import { Router, type IRouter, type Request, type Response } from "express";
import {
  DecideReportBody, DecideReportResponse,
  DecideVolunteerApplicationBody, DecideVolunteerApplicationResponse,
  GetAppConfigResponse, GetMunicipalityDashboardResponse,
  GetUserActivityResponse, GetUserNotificationsResponse,
  MarkNotificationsReadBody, MarkNotificationsReadResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../lib/admin-auth";
import { pilotCity } from "../lib/pilot-city";
import { sqlite } from "../lib/sqlite";
import { membershipRecord, projectRecord, reportRecord } from "../lib/records";
import {
  decideApplication, decideReport, markSeen, MEMBERSHIP_SELECT,
  notifications, REPORT_STATUSES, WorkflowError,
} from "../lib/municipality";

type Row = Record<string, unknown>;
const router: IRouter = Router();
function fail(error: unknown, req: Request, res: Response) {
  if (error instanceof WorkflowError) res.status(error.status).json({ error: error.message });
  else {
    req.log.error({ error: error instanceof Error ? error.message : String(error) }, "Municipality operation failed");
    res.status(500).json({ error: "The municipality update could not be saved. Please try again." });
  }
}
function userExists(id: string, res: Response): boolean {
  if (sqlite.prepare("SELECT 1 FROM users WHERE id = ?").get(id)) return true;
  res.status(404).json({ error: "Profile not found." });
  return false;
}

router.get("/config", (_req, res) => { res.json(GetAppConfigResponse.parse(pilotCity)); });
router.get("/admin/municipality", requireAdmin, (_req, res) => {
  const reports = (sqlite.prepare("SELECT * FROM reports ORDER BY created_at DESC").all() as Row[]).map(reportRecord);
  const priority: Record<string, number> = { high: 0, medium: 1, low: 2 };
  reports.sort((left, right) => (priority[left.analysis?.suggestedPriority ?? "medium"] ?? 1) -
    (priority[right.analysis?.suggestedPriority ?? "medium"] ?? 1) || right.createdAt.localeCompare(left.createdAt));
  const applications = (sqlite.prepare(`${MEMBERSHIP_SELECT}
    ORDER BY CASE pm.status WHEN 'pending' THEN 0 WHEN 'accepted' THEN 1 ELSE 2 END,
      COALESCE(pm.updated_at, pm.created_at) DESC
  `).all() as Row[]).map(membershipRecord);
  const pendingProjects = (sqlite.prepare(`
    SELECT p.*, (SELECT COUNT(*) FROM project_memberships pm WHERE pm.project_id = p.id AND pm.status IN ('accepted', 'confirmed')) AS joined_count
    FROM projects p WHERE p.status = 'pending' ORDER BY p.created_at DESC
  `).all() as Row[]).map((row) => projectRecord(row));
  const reportsByStatus: Record<string, number> = Object.fromEntries(REPORT_STATUSES.map((status) => [status, 0]));
  for (const report of reports) reportsByStatus[report.status] = (reportsByStatus[report.status] ?? 0) + 1;
  const timing = sqlite.prepare(`
    SELECT AVG(MAX(0, (julianday(decided_at) - julianday(created_at)) * 24)) AS hours
    FROM reports WHERE decided_at IS NOT NULL
  `).get() as Row;
  res.json(GetMunicipalityDashboardResponse.parse({
    reports, applications, pendingProjects,
    counters: {
      reportsByStatus,
      pendingApplications: applications.filter((application) => application.status === "pending").length,
      averageDecisionHours: timing.hours == null ? null : Math.round(Number(timing.hours) * 100) / 100,
    },
  }));
});

router.post("/admin/reports/:id/decision", requireAdmin, (req, res) => {
  const input = DecideReportBody.safeParse(req.body);
  if (!input.success) { res.status(400).json({ error: input.error.message }); return; }
  try { res.json(DecideReportResponse.parse(decideReport(String(req.params.id), input.data))); }
  catch (error) { fail(error, req, res); }
});
router.post("/admin/memberships/:id/decision", requireAdmin, (req, res) => {
  const input = DecideVolunteerApplicationBody.safeParse(req.body);
  if (!input.success) { res.status(400).json({ error: input.error.message }); return; }
  try { res.json(DecideVolunteerApplicationResponse.parse(decideApplication(String(req.params.id), input.data))); }
  catch (error) { fail(error, req, res); }
});
router.get("/users/:id/activity", (req, res) => {
  const id = String(req.params.id);
  if (!userExists(id, res)) return;
  const reports = (sqlite.prepare("SELECT * FROM reports WHERE author_id = ? ORDER BY COALESCE(updated_at, created_at) DESC").all(id) as Row[]).map(reportRecord);
  const volunteering = (sqlite.prepare(`${MEMBERSHIP_SELECT} WHERE pm.user_id = ?
    ORDER BY COALESCE(pm.updated_at, pm.created_at) DESC`).all(id) as Row[]).map(membershipRecord);
  res.json(GetUserActivityResponse.parse({ reports, volunteering, notifications: notifications(id) }));
});
router.get("/users/:id/notifications", (req, res) => {
  const id = String(req.params.id);
  if (userExists(id, res)) res.json(GetUserNotificationsResponse.parse(notifications(id)));
});
router.post("/users/:id/notifications/read", (req, res) => {
  const id = String(req.params.id);
  if (!userExists(id, res)) return;
  const input = MarkNotificationsReadBody.safeParse(req.body);
  if (!input.success) { res.status(400).json({ error: input.error.message }); return; }
  try { res.json(MarkNotificationsReadResponse.parse(markSeen(id, input.data.latestChangeId))); }
  catch (error) { fail(error, req, res); }
});
export default router;
