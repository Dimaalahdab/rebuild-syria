import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
// Trust only the nearest reverse proxy, not an arbitrary leftmost forwarded IP.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api", router);

// A built website can be served by this same Express process outside the
// managed development preview, where Vite remains a separate service.
const frontendDirectory = resolve(process.cwd(), "../rebuild-syria/dist/public");
const frontendIndex = resolve(frontendDirectory, "index.html");
if (existsSync(frontendIndex)) {
  app.use(express.static(frontendDirectory, { index: false }));
  app.get("/{*path}", (req, res, next) => {
    if (req.path === "/api" || req.path.startsWith("/api/")) {
      next();
      return;
    }
    res.set("Cache-Control", "no-store").sendFile(frontendIndex);
  });
}

export default app;
