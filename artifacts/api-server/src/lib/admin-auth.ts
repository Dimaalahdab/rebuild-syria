import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const expected = Buffer.from(process.env.ADMIN_PIN || "1234");
  const supplied = Buffer.from(req.get("X-Admin-Pin") ?? "");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    res.status(401).json({ error: "The demo admin PIN is incorrect." });
    return;
  }
  next();
}
