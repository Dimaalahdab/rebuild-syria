import { randomUUID } from "node:crypto";
import type { ApplicationDecisionInput, ReportDecisionInput } from "@workspace/api-zod";
import { sqlite } from "./sqlite";
import { membershipRecord, reportRecord } from "./records";
import { reportAnalysis, reportIsUnsafe } from "./report-safety";
import { validSkills } from "./skills";

type Row = Record<string, unknown>;
export const REPORT_STATUSES = [
  "new", "under_review", "accepted_for_volunteers", "assigned_to_municipality",
  "referred", "scheduled", "completed", "rejected",
] as const;

export class WorkflowError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function notify(userId: unknown, kind: string, sourceId: string): void {
  if (!userId) return;
  sqlite.prepare("INSERT INTO notification_changes (user_id, kind, source_id) VALUES (?, ?, ?)")
    .run(String(userId), kind, sourceId);
}

export function notifications(userId: string) {
  const row = sqlite.prepare(`
    SELECT COUNT(*) AS unread_count, COALESCE(MAX(n.id), 0) AS latest_id
    FROM notification_changes n JOIN users u ON u.id = n.user_id
    WHERE n.user_id = ? AND n.id > u.last_seen_change_id
  `).get(userId) as Row;
  return { unreadCount: Number(row.unread_count), latestChangeId: Number(row.latest_id) };
}

export function markSeen(userId: string, cursor: number) {
  const latest = sqlite.prepare("SELECT COALESCE(MAX(id), 0) AS id FROM notification_changes WHERE user_id = ?").get(userId) as Row;
  if (cursor > Number(latest.id)) throw new WorkflowError(400, "Invalid notification cursor.");
  sqlite.prepare("UPDATE users SET last_seen_change_id = MAX(last_seen_change_id, ?) WHERE id = ?")
    .run(cursor, userId);
  return notifications(userId);
}

export const MEMBERSHIP_SELECT = `
  SELECT pm.*, p.title AS project_title, p.status AS project_status,
    p.scheduled_at, p.municipality_note AS project_note,
    u.name AS user_name, u.city
  FROM project_memberships pm
  JOIN projects p ON p.id = pm.project_id
  JOIN users u ON u.id = pm.user_id
`;
export function getMembership(id: string): Row | undefined {
  return sqlite.prepare(`${MEMBERSHIP_SELECT} WHERE pm.id = ?`).get(id) as Row | undefined;
}

export const applyForProject = sqlite.transaction((projectId: string, userId: string) => {
  const user = sqlite.prepare("SELECT role FROM users WHERE id = ?").get(userId) as Row | undefined;
  if (!user) throw new WorkflowError(400, "Create a demo profile before joining a project.");
  if (user.role !== "volunteer") throw new WorkflowError(400, "Choose the volunteer role in your demo profile to join projects.");
  const project = sqlite.prepare("SELECT * FROM projects WHERE id = ?").get(projectId) as Row | undefined;
  if (!project || project.status !== "open" || Number(project.is_safe) !== 1) throw new WorkflowError(400, "This project is not open for volunteers.");
  const report = project.report_id ? sqlite.prepare("SELECT * FROM reports WHERE id = ?").get(project.report_id) as Row | undefined : undefined;
  if (reportIsUnsafe({ ...project, category: null }) || (report && reportIsUnsafe(report))) {
    throw new WorkflowError(400, "This report requires professional review and cannot be accepted for volunteers.");
  }
  const existing = sqlite.prepare("SELECT id FROM project_memberships WHERE project_id = ? AND user_id = ?").get(projectId, userId);
  if (existing) throw new WorkflowError(409, "You have already applied to this project.");
  const count = sqlite.prepare("SELECT COUNT(*) AS n FROM project_memberships WHERE project_id = ? AND status IN ('accepted','confirmed')").get(projectId) as Row;
  if (Number(count.n) >= Number(project.volunteer_limit)) throw new WorkflowError(409, "This project has reached its volunteer limit.");
  const membershipId = randomUUID();
  sqlite.prepare("INSERT INTO project_memberships (id, project_id, user_id, status) VALUES (?, ?, ?, 'pending')")
    .run(membershipId, projectId, userId);
  return { success: true, membershipId, status: "pending" as const };
});

export function awardVerification(report: Row) {
  if (!report.author_id) return;
  const event = sqlite.prepare(`
    INSERT OR IGNORE INTO impact_events (id, user_id, event_type, source_id, points)
    VALUES (?, ?, 'report_verified', ?, 10)
  `).run(randomUUID(), report.author_id, report.id);
  if (event.changes) sqlite.prepare("UPDATE users SET points = points + 10, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(report.author_id);
}

export const decideReport = sqlite.transaction((id: string, input: ReportDecisionInput) => {
  const report = sqlite.prepare("SELECT * FROM reports WHERE id = ?").get(id) as Row | undefined;
  if (!report) throw new WorkflowError(404, "Report not found.");
  const note = input.note.trim();
  // The generated server validator coerces ISO strings into Date objects.
  // Native SQLite bindings cannot accept Date, and comparisons must use ISO too.
  const requestedDate = input.scheduledAt === undefined ? report.scheduled_at : input.scheduledAt;
  const date = requestedDate == null ? null
    : new Date(requestedDate instanceof Date ? requestedDate.getTime() : String(requestedDate));
  if (date && Number.isNaN(date.getTime())) throw new WorkflowError(400, "A valid date and time are required.");
  const scheduledAt = date?.toISOString() ?? null;
  if (input.status === "rejected" && !note) throw new WorkflowError(400, "A rejection reason is required.");
  if (["accepted_for_volunteers", "scheduled"].includes(input.status) && !scheduledAt) {
    throw new WorkflowError(400, "A date and time are required for this decision.");
  }
  if (input.status === "accepted_for_volunteers" && input.assignedTo !== "volunteers") {
    throw new WorkflowError(400, "Volunteer acceptance must be handled by volunteers.");
  }
  if (input.status === "assigned_to_municipality" && input.assignedTo !== "municipality") {
    throw new WorkflowError(400, "This outcome must be assigned to the municipality team.");
  }
  if (input.status === "referred" && input.assignedTo !== "other_authority") {
    throw new WorkflowError(400, "A referred report must be assigned to another authority.");
  }
  if ((input.status === "accepted_for_volunteers" || input.assignedTo === "volunteers") && reportIsUnsafe(report)) {
    throw new WorkflowError(400, "This report requires professional review and cannot be accepted for volunteers.");
  }
  const changed = report.status !== input.status || report.assigned_to !== input.assignedTo ||
    (report.municipality_note ?? "") !== note || (report.scheduled_at ?? null) !== scheduledAt;
  const isOutcome = input.status !== "under_review";
  sqlite.prepare(`
    UPDATE reports SET status = ?, assigned_to = ?, municipality_note = ?, scheduled_at = ?,
      decided_at = CASE WHEN ? THEN COALESCE(decided_at, CURRENT_TIMESTAMP) ELSE decided_at END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(input.status, input.assignedTo, note, scheduledAt, isOutcome ? 1 : 0, id);
  if (isOutcome && input.status !== "rejected") awardVerification(report);

  const project = sqlite.prepare("SELECT * FROM projects WHERE report_id = ? ORDER BY created_at, rowid LIMIT 1").get(id) as Row | undefined;
  let projectId = project ? String(project.id) : null;
  if (input.status === "accepted_for_volunteers") {
    if (!projectId) {
      projectId = randomUUID();
      const analysis = reportAnalysis(id).analysis;
      const skills = analysis?.requiredSkills.filter((skill) => validSkills([skill])) ?? ["Cleaning", "Organization"];
      sqlite.prepare(`
        INSERT INTO projects (id, report_id, title, city, neighborhood, description,
          required_skills_json, volunteer_limit, status, is_safe, scheduled_at, municipality_note)
        VALUES (?, ?, ?, ?, ?, ?, ?, 12, 'open', 1, ?, ?)
      `).run(projectId, id, String(report.title || report.description).slice(0, 120),
        report.city, report.neighborhood, report.description, JSON.stringify(skills), scheduledAt, note);
    } else {
      sqlite.prepare("UPDATE projects SET status = 'open', scheduled_at = ?, municipality_note = ? WHERE id = ?")
        .run(scheduledAt, note, projectId);
    }
  } else if (projectId) {
    const status = input.status === "completed" ? "completed"
      : input.status === "scheduled" && input.assignedTo === "volunteers" ? "open"
      : input.status === "under_review" ? "pending" : "rejected";
    sqlite.prepare("UPDATE projects SET status = ?, scheduled_at = ?, municipality_note = ? WHERE id = ?")
      .run(status, scheduledAt, note, projectId);
  }
  if (changed) {
    notify(report.author_id, "report", id);
    if (projectId) {
      const members = sqlite.prepare("SELECT id, user_id FROM project_memberships WHERE project_id = ? AND status != 'declined'").all(projectId) as Row[];
      for (const member of members) notify(member.user_id, "volunteering", String(member.id));
    }
  }
  return reportRecord(sqlite.prepare("SELECT * FROM reports WHERE id = ?").get(id) as Row);
});

export const decideApplication = sqlite.transaction((id: string, input: ApplicationDecisionInput) => {
  const application = getMembership(id);
  if (!application) throw new WorkflowError(404, "Participation record not found.");
  if (application.status !== "pending") throw new WorkflowError(409, "This application has already been decided.");
  if (input.status === "accepted") {
    const project = sqlite.prepare("SELECT * FROM projects WHERE id = ?").get(application.project_id) as Row;
    if (project.status !== "open" || Number(project.is_safe) !== 1) throw new WorkflowError(400, "This project is not open for volunteers.");
    const report = project.report_id ? sqlite.prepare("SELECT * FROM reports WHERE id = ?").get(project.report_id) as Row | undefined : undefined;
    if (reportIsUnsafe({ ...project, category: null }) || (report && reportIsUnsafe(report))) {
      throw new WorkflowError(400, "This report requires professional review and cannot be accepted for volunteers.");
    }
    const count = sqlite.prepare("SELECT COUNT(*) AS n FROM project_memberships WHERE project_id = ? AND status IN ('accepted', 'confirmed')").get(project.id) as Row;
    if (Number(count.n) >= Number(project.volunteer_limit)) throw new WorkflowError(409, "This project has reached its volunteer limit.");
  }
  sqlite.prepare("UPDATE project_memberships SET status = ?, municipality_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(input.status, input.note?.trim() || null, id);
  notify(application.user_id, "volunteering", id);
  return membershipRecord(getMembership(id)!);
});

export const confirmAttendance = sqlite.transaction((id: string) => {
  const application = getMembership(id);
  if (!application) throw new WorkflowError(404, "Participation record not found.");
  if (!["accepted", "confirmed"].includes(String(application.status))) {
    throw new WorkflowError(400, "Only accepted volunteers can have attendance confirmed.");
  }
  if (application.status !== "confirmed" && application.project_status === "rejected") {
    throw new WorkflowError(400, "Attendance cannot be confirmed for a cancelled project.");
  }
  sqlite.prepare("UPDATE project_memberships SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
  const event = sqlite.prepare(`
    INSERT OR IGNORE INTO impact_events (id, user_id, event_type, source_id, points)
    VALUES (?, ?, 'participation_confirmed', ?, 30)
  `).run(randomUUID(), application.user_id, id);
  if (event.changes) {
    sqlite.prepare("UPDATE users SET points = points + 30, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(application.user_id);
    notify(application.user_id, "volunteering", id);
  }
  return membershipRecord(getMembership(id)!);
});
