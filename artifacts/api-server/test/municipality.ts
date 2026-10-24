import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DecideReportBody } from "../../../lib/api-zod/src/index";

const cwd = process.cwd();
const temp = mkdtempSync(join(tmpdir(), "rebuild-municipality-"));
process.chdir(temp);
try {
  const { sqlite } = await import("../src/lib/sqlite");
  const { pilotCity } = await import("../src/lib/pilot-city");
  const { reportRecord } = await import("../src/lib/records");
  const {
    decideReport: decideValidatedReport, decideApplication, applyForProject, confirmAttendance,
    getMembership, markSeen, notifications, WorkflowError,
  } = await import("../src/lib/municipality");
  // Exercise the same parsed contract values as the HTTP route, including Date coercion.
  const decideReport = (id: string, input: unknown) => decideValidatedReport(id, DecideReportBody.parse(input));
  type Row = Record<string, unknown>;
  const report = (id: string) => sqlite.prepare("SELECT * FROM reports WHERE id = ?").get(id) as Row;
  const points = (id: string) => Number((sqlite.prepare("SELECT points FROM users WHERE id = ?").get(id) as Row).points);
  const rejects = (run: () => unknown, status: number) => assert.throws(run, (error: unknown) => error instanceof WorkflowError && error.status === status);
  const time = "2026-12-12T09:30:00.000Z";
  for (const language of ["ar", "en"] as const) {
    const author = `author-${language}`, volunteer = `volunteer-${language}`, declined = `declined-${language}`;
    for (const id of [author, volunteer, declined]) sqlite.prepare("INSERT INTO users(id,name,role,city,skills_json) VALUES(?,?,'volunteer',?,'[\"Cleaning\",\"Organization\"]')").run(id, id, pilotCity.cityName);
    const school = `school-${language}`, garbage = `garbage-${language}`;
    const words = language === "ar"
      ? { school: "مدرسة متضررة تحتاج إلى مراجعة مهنية", garbage: "نفايات قرب الحديقة", note: "سيقوم فريق البلدية بالمعاينة", accepted: "تم قبول طلبك" }
      : { school: "Damaged school needs professional review", garbage: "Garbage near the park", note: "The municipality team will inspect", accepted: "Your application is accepted" };
    for (const [id, description, category, unsafe] of [
      [school, words.school, "Buildings", true], [garbage, words.garbage, "Waste", false],
    ] as const) {
      sqlite.prepare("INSERT INTO reports(id,author_id,city,neighborhood,description,title,category,language) VALUES(?,?,?,'Any free-text neighborhood',?,?,?,?)")
        .run(id, author, pilotCity.cityName, description, description, category, language);
      sqlite.prepare("INSERT INTO ai_analyses(id,report_id,model_name,result_json) VALUES(?,?,'controlled-workflow-test',?)")
        .run(`analysis-${id}`, id, JSON.stringify({
          category, title: description, description, suggestedPriority: unsafe ? "high" : "low",
          safetyFlags: unsafe ? [words.school] : ["Use gloves"],
          suggestedActions: [], requiredSkills: ["Cleaning"], suggestedMaterials: [],
          requiresProfessionalReview: unsafe,
        }));
    }
    rejects(() => decideReport(school, { status: "accepted_for_volunteers", assignedTo: "volunteers", note: "", scheduledAt: time }), 400);
    assert.equal(report(school).status, "new");
    assert.equal(reportRecord(report(school)).requiresProfessionalReview, true);
    decideReport(school, { status: "assigned_to_municipality", assignedTo: "municipality", note: words.note, scheduledAt: time });
    assert.equal(reportRecord(report(school)).municipalityNote, words.note);
    assert.equal(reportRecord(report(school)).scheduledAt, time);
    assert.equal(sqlite.prepare("SELECT id FROM projects WHERE report_id = ?").get(school), undefined);
    const displayedCursor = notifications(author).latestChangeId;
    decideReport(school, { status: "scheduled", assignedTo: "municipality", note: `${words.note}!`, scheduledAt: time });
    assert.equal(markSeen(author, displayedCursor).unreadCount, 1, "new arrivals must stay unread");
    assert.equal(markSeen(author, notifications(author).latestChangeId).unreadCount, 0);
    rejects(() => decideReport(garbage, { status: "rejected", assignedTo: "municipality", note: " " }), 400);
    rejects(() => decideReport(garbage, { status: "accepted_for_volunteers", assignedTo: "volunteers", note: "", scheduledAt: null }), 400);
    const acceptance = { status: "accepted_for_volunteers", assignedTo: "volunteers", note: words.note, scheduledAt: time } as const;
    decideReport(garbage, acceptance);
    decideReport(garbage, acceptance);
    const projects = sqlite.prepare("SELECT * FROM projects WHERE report_id = ?").all(garbage) as Row[];
    assert.equal(projects.length, 1, "repeated decisions cannot duplicate projects");
    assert.equal(projects[0].scheduled_at, time);
    const application = applyForProject(String(projects[0].id), volunteer);
    assert.equal(application.status, "pending");
    assert.equal(points(volunteer), 0);
    rejects(() => applyForProject(String(projects[0].id), volunteer), 409);
    rejects(() => confirmAttendance(application.membershipId), 400);
    decideApplication(application.membershipId, { status: "accepted", note: words.accepted });
    assert.equal(getMembership(application.membershipId)?.municipality_note, words.accepted);
    assert.equal(points(volunteer), 0, "acceptance must not award participation points");
    confirmAttendance(application.membershipId);
    confirmAttendance(application.membershipId);
    assert.equal(points(volunteer), 30, "attendance is awarded once");
    const other = applyForProject(String(projects[0].id), declined);
    decideApplication(other.membershipId, { status: "declined", note: "Optional note" });
    rejects(() => confirmAttendance(other.membershipId), 400);
    rejects(() => applyForProject(String(projects[0].id), declined), 409);
    assert.equal(points(declined), 0);
    sqlite.prepare("UPDATE projects SET volunteer_limit = 1 WHERE id = ?").run(projects[0].id);
    rejects(() => applyForProject(String(projects[0].id), author), 409);
    decideReport(garbage, { status: "completed", assignedTo: "volunteers", note: words.note });
    assert.equal(getMembership(application.membershipId)?.project_status, "completed");
    assert.equal(report(garbage).description, words.garbage);
    assert.equal(report(garbage).language, language);
    console.log(`PASS ${language}: school safety block/team routing, reporter updates/cursor race, garbage auto-project/date/idempotency, pending/duplicate/accept/decline/capacity/attendance-once, completion and original text`);
  }
  assert.equal(DecideReportBody.safeParse({ status: "anything", assignedTo: "volunteers", note: "" }).success, false);
  assert.equal(DecideReportBody.safeParse({ status: "scheduled", assignedTo: "municipality", note: "", scheduledAt: "not-a-date" }).success, false);
  sqlite.close();
} finally {
  process.chdir(cwd);
  rmSync(temp, { recursive: true, force: true });
}
