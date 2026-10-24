import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AnalyzeIssueBody, MatchVolunteersBody, CreateReportBody } from "../../../lib/api-zod/src/index";

const originalCwd = process.cwd();
const directory = mkdtempSync(join(tmpdir(), "rebuild-locale-"));
process.chdir(directory);
try {
  const { sqlite } = await import("../src/lib/sqlite");
  const { reportRecord, projectRecord, membershipRecord } = await import("../src/lib/records");
  const { validSkills } = await import("../src/lib/skills");
  const image = new Blob(["fixture"], { type: "image/png" });
  const base = { image, city: "دمشق", neighborhood: "المزة", description: "اختبار" };
  for (const language of ["ar", "en"] as const) {
    assert.equal(AnalyzeIssueBody.parse({ ...base, language }).language, language);
    assert.equal(MatchVolunteersBody.parse({ projectId: "project-demo-cleanup", language }).language, language);
    assert.equal(CreateReportBody.parse({ ...base, language }).language, language);
  }
  assert.equal(AnalyzeIssueBody.parse(base).language, "ar");
  assert.equal(MatchVolunteersBody.parse({ projectId: "project-demo-cleanup" }).language, "ar");
  assert.equal(CreateReportBody.parse(base).language, "ar");
  assert.equal(AnalyzeIssueBody.safeParse({ ...base, language: "fr" }).success, false);
  assert.equal(MatchVolunteersBody.safeParse({ projectId: "project-demo-cleanup", language: "fr" }).success, false);
  const insert = sqlite.prepare(`
    INSERT INTO reports (id, city, neighborhood, description, title, language)
    VALUES (?, 'دمشق', 'المزة', ?, ?, ?)
  `);
  const originals = [
    ["legacy-ar", "وصف عربي محفوظ", "عنوان محفوظ", null],
    ["legacy-en", "Original English description", "Original English title", null],
    ["explicit-en", "Mixed content مدينة دمشق", "Saved with English interface", "en"],
  ] as const;
  for (const [id, description, title, language] of originals) {
    insert.run(id, description, title, language);
    const row = sqlite.prepare("SELECT * FROM reports WHERE id = ?").get(id) as Record<string, unknown>;
    const record = reportRecord(row);
    assert.equal(record.description, description);
    assert.equal(record.title, title);
    assert.equal(record.language, id === "legacy-ar" ? "ar" : "en");
    assert.equal(record.isDemo, false);
    assert.deepEqual(reportRecord(row), record);
  }
  const demoReport = sqlite.prepare("SELECT * FROM reports WHERE id = 'report-demo-waste'").get() as Record<string, unknown>;
  const demoProject = sqlite.prepare("SELECT * FROM projects WHERE id = 'project-demo-cleanup'").get() as Record<string, unknown>;
  assert.equal(reportRecord(demoReport).isDemo, true);
  assert.equal(projectRecord(demoProject).isDemo, true);
  assert.equal(membershipRecord({ id: "membership-demo-1" }).isDemo, true);
  assert.equal(validSkills(["Cleaning", "Organization"]), true);
  assert.equal(validSkills(["التنظيف"]), false);
  sqlite.close();
  console.log("PASS: ar/en contracts, Arabic default, invalid-language rejection, unchanged legacy content, content-language metadata, demo flags, and canonical English skills");
} finally {
  process.chdir(originalCwd);
  rmSync(directory, { recursive: true, force: true });
}
