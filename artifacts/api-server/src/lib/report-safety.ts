import { AnalyzeIssueResponse } from "@workspace/api-zod";
import { sqlite } from "./sqlite";

export function reportAnalysis(reportId: string) {
  const row = sqlite.prepare(`
    SELECT model_name, result_json FROM ai_analyses
    WHERE report_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1
  `).get(reportId) as { model_name: string; result_json: string } | undefined;
  if (!row) return { analysis: null, model: null, malformed: false };
  try {
    const result = AnalyzeIssueResponse.safeParse({
      model: row.model_name, analysis: JSON.parse(row.result_json),
    });
    if (result.success) return { ...result.data, malformed: false };
  } catch { /* Fail closed: a malformed saved analysis cannot authorize volunteers. */ }
  return { analysis: null, model: row.model_name, malformed: true };
}

export function reportIsUnsafe(report: Record<string, unknown>): boolean {
  if (report.category === "Roads" || report.category === "Buildings") return true;
  const result = reportAnalysis(String(report.id ?? ""));
  if (result.malformed || result.analysis?.requiresProfessionalReview) return true;
  if (result.analysis?.category === "Roads" || result.analysis?.category === "Buildings") return true;
  const text = [
    report.title, report.description, report.required_skills_json,
    result.analysis?.description, ...(result.analysis?.safetyFlags ?? []),
    ...(result.analysis?.requiredSkills ?? []),
  ].join(" ");
  return /road|pothole|building[\s-]*damage|damaged[\s-]*(school|building)|school[\s-]*damage|structur|collapse|electri|power line|live wire|construction|unexploded|ordnance|explosive|طريق|حفرة|مبنى متضرر|مدرسة متضررة|تصدع|تشققات|انهيار|كهرب|ذخائر|متفجر|أسلاك|إنشائي/iu.test(text);
}
