import { Router, type IRouter, type Request, type Response } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { checkDatabase } from "../lib/sqlite";

const router: IRouter = Router();

const healthCheck = (_req: Request, res: Response) => {
  try {
    checkDatabase();
    const data = HealthCheckResponse.parse({ status: "ok" });
    res.json(data);
  } catch {
    res.status(503).json({ status: "error" });
  }
};

router.get("/health", healthCheck);
router.get("/healthz", healthCheck);

export default router;
