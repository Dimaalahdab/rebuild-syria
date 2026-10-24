import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import {
  AnalyzeIssueResponse,
  CreateReportBody,
  CreateReportResponse,
  GetReportParams,
  GetReportResponse,
  GetReportsResponse,
} from "@workspace/api-zod";
import { sqlite } from "../lib/sqlite";
import { reportRecord } from "../lib/records";
import { fileAsBlob, handleImageUpload, hasValidImageSignature } from "../lib/uploads";
import { saveImage } from "../lib/images";

const router: IRouter = Router();

router.get("/reports", (_req, res): void => {
  const rows = sqlite.prepare("SELECT * FROM reports ORDER BY created_at DESC").all() as Record<string, unknown>[];
  res.json(GetReportsResponse.parse(rows.map(reportRecord)));
});

router.post("/reports", handleImageUpload, async (req, res): Promise<void> => {
  const file = req.file;
  if (file && !hasValidImageSignature(file)) {
    res.status(400).json({ error: "The image contents do not match a JPEG, PNG, or WebP file." });
    return;
  }

  const input = CreateReportBody.safeParse({
    ...req.body,
    image: file ? fileAsBlob(file) : undefined,
  });
  if (!input.success) {
    res.status(400).json({ error: input.error.message });
    return;
  }

  const authorId = input.data.authorId?.trim() || null;
  if (authorId && !sqlite.prepare("SELECT 1 FROM users WHERE id = ?").get(authorId)) {
    res.status(400).json({ error: "The selected demo profile does not exist." });
    return;
  }

  let analysis: { model: string; analysis: Record<string, unknown> } | undefined;
  if (input.data.analysisJson) {
    let candidate: unknown;
    try {
      candidate = JSON.parse(input.data.analysisJson);
    } catch {
      res.status(400).json({ error: "The saved analysis is not valid JSON." });
      return;
    }
    const parsed = AnalyzeIssueResponse.safeParse(candidate);
    if (!parsed.success) {
      res.status(400).json({ error: "The saved AI analysis is missing required fields." });
      return;
    }
    analysis = parsed.data as { model: string; analysis: Record<string, unknown> };
  }
  if (analysis && !file) {
    res.status(400).json({ error: "A photo is required when saving an AI analysis." });
    return;
  }

  const id = randomUUID();
  try {
    const createReport = sqlite.transaction(() => {
      const imageId = file ? saveImage(file.buffer, file.mimetype) : null;
      const title =
        typeof analysis?.analysis.title === "string" ? analysis.analysis.title : null;
      const category =
        typeof analysis?.analysis.category === "string" ? analysis.analysis.category : null;
      sqlite.prepare(`
        INSERT INTO reports
          (id, author_id, city, neighborhood, description, image_id, category, title, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new')
      `).run(
        id,
        authorId,
        input.data.city.trim(),
        input.data.neighborhood.trim(),
        input.data.description.trim(),
        imageId,
        category,
        title,
      );
      if (analysis) {
        sqlite.prepare(`
          INSERT INTO ai_analyses (id, report_id, model_name, result_json)
          VALUES (?, ?, ?, ?)
        `).run(randomUUID(), id, analysis.model, JSON.stringify(analysis.analysis));
      }
    });
    createReport();
  } catch (error) {
    req.log.error({ error: error instanceof Error ? error.message : String(error) }, "Unable to save report");
    res.status(500).json({ error: "The report could not be saved. Please try again." });
    return;
  }

  const row = sqlite.prepare("SELECT * FROM reports WHERE id = ?").get(id) as Record<string, unknown>;
  res.status(201).json(CreateReportResponse.parse(reportRecord(row)));
});

router.get("/reports/:id", (req, res): void => {
  const params = GetReportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const row = sqlite.prepare("SELECT * FROM reports WHERE id = ?").get(params.data.id) as Record<string, unknown> | undefined;
  if (!row) {
    res.status(404).json({ error: "Report not found." });
    return;
  }
  res.json(GetReportResponse.parse(reportRecord(row)));
});

export default router;
