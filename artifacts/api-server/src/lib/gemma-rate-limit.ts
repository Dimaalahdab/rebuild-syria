import { createHash } from "node:crypto";
import type { RequestHandler } from "express";
import { sqlite } from "./sqlite";

export const GEMMA_REQUEST_LIMIT = 20;
const WINDOW_MS = 60_000;

export const consumeGemmaRequest = sqlite.transaction((ip: string, now = Date.now()) => {
  const normalized = ip.replace(/^::ffff:/, "");
  const hash = createHash("sha256").update(normalized).digest("hex");
  sqlite.prepare("DELETE FROM gemma_rate_limits WHERE reset_at <= ?").run(now);
  const row = sqlite.prepare("SELECT request_count, reset_at FROM gemma_rate_limits WHERE ip_hash = ?")
    .get(hash) as { request_count: number; reset_at: number } | undefined;
  if (row && row.request_count >= GEMMA_REQUEST_LIMIT) {
    return { allowed: false, remaining: 0, resetAt: row.reset_at };
  }
  const resetAt = row?.reset_at ?? now + WINDOW_MS;
  sqlite.prepare(`
    INSERT INTO gemma_rate_limits (ip_hash, request_count, reset_at) VALUES (?, 1, ?)
    ON CONFLICT(ip_hash) DO UPDATE SET request_count = request_count + 1
  `).run(hash, resetAt);
  return { allowed: true, remaining: GEMMA_REQUEST_LIMIT - (row?.request_count ?? 0) - 1, resetAt };
});

// One shared allowance across both AI routes, checked before reading images
// or invoking the paid provider. SQLite keeps it intact across process restarts.
export const gemmaRateLimit: RequestHandler = (req, res, next) => {
  const result = consumeGemmaRequest(req.ip ?? req.socket.remoteAddress ?? "unknown");
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  res.set({
    "RateLimit-Limit": String(GEMMA_REQUEST_LIMIT),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(retryAfter),
  });
  if (!result.allowed) {
    res.set("Retry-After", String(retryAfter));
    res.status(429).json({ error: "تم بلوغ حد ٢٠ طلب تحليل في الدقيقة. انتظر قليلاً ثم حاول مجدداً." });
    return;
  }
  next();
};
