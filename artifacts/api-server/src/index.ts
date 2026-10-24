import app from "./app";
import { logger } from "./lib/logger";
import { safeProviderError, verifyGemmaOnStartup } from "./lib/gemma";
import { migrateLegacyImages } from "./lib/images";

const imageMigration = migrateLegacyImages();
logger.info(imageMigration, "Legacy image migration checked");

const rawPort = process.env["PORT"] || "3000";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "Server listening");
  void verifyGemmaOnStartup()
    .then((model) => logger.info({ model }, "Gemma model is available"))
    .catch((error: unknown) =>
      logger.warn({ error: safeProviderError(error) }, "Gemma model availability check failed"),
    );
});

server.on("error", (error) => {
  logger.error({ error }, "Error listening on port");
  process.exit(1);
});
