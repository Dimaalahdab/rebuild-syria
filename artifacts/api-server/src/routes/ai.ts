import { Router, type IRouter } from "express";
import {
  AnalyzeIssueBody,
  AnalyzeIssueResponse,
  TestGemmaConnectionResponse,
} from "@workspace/api-zod";
import { analyzeIssue, safeProviderError, testGemmaConnection, REQUESTED_GEMMA_MODEL } from "../lib/gemma";
import { fileAsBlob, handleImageUpload, hasValidImageSignature } from "../lib/uploads";
import { logger } from "../lib/logger";
import { gemmaRateLimit } from "../lib/gemma-rate-limit";

const router: IRouter = Router();
let nextDiagnosticTestAt = 0;
const TEST_COOLDOWN_MS = 60_000;

router.get("/ai-test", async (req, res): Promise<void> => {
  if (Date.now() < nextDiagnosticTestAt) {
    res.status(429).json({ error: "The Gemma connection test can be run once per minute." });
    return;
  }
  nextDiagnosticTestAt = Date.now() + TEST_COOLDOWN_MS;
  try {
    const result = await testGemmaConnection();
    res.json(
      TestGemmaConnectionResponse.parse({
        success: true,
        model: result.model,
        available: true,
        response: result.response,
      }),
    );
  } catch (error) {
    const message = safeProviderError(error);
    req.log.error({ error: message, requestedModel: REQUESTED_GEMMA_MODEL }, "Gemma connection test failed");
    res.status(502).json({ error: message });
  }
});

router.post("/analyze-issue", gemmaRateLimit, handleImageUpload, async (req, res): Promise<void> => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "Choose a photo before asking Gemma to analyze the report." });
    return;
  }
  if (!hasValidImageSignature(file)) {
    res.status(400).json({ error: "The image contents do not match a JPEG, PNG, or WebP file." });
    return;
  }

  const input = AnalyzeIssueBody.safeParse({
    image: fileAsBlob(file),
    city: req.body.city,
    neighborhood: req.body.neighborhood,
    description: req.body.description,
    language: req.body.language,
  });
  if (!input.success) {
    res.status(400).json({ error: input.error.message });
    return;
  }

  try {
    const result = await analyzeIssue(
      file.buffer,
      file.mimetype,
      input.data.description,
      input.data.city,
      input.data.neighborhood,
      input.data.language ?? "ar",
    );
    res.json(AnalyzeIssueResponse.parse(result));
  } catch (error) {
    const message = safeProviderError(error);
    req.log.error({ error: message }, "Gemma image analysis failed");
    res.status(502).json({ error: message });
  }
});

export default router;
