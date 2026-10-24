import { Router, type IRouter } from "express";
import { sqlite } from "../lib/sqlite";

const router: IRouter = Router();
router.get("/images/:id", (req, res): void => {
  const image = sqlite.prepare("SELECT mime_type, data FROM images WHERE id = ?").get(req.params.id) as
    | { mime_type: string; data: Buffer }
    | undefined;
  if (!image) {
    res.status(404).json({ error: "Image not found." });
    return;
  }
  res.set({
    "Content-Type": image.mime_type,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "public, max-age=86400, immutable",
  });
  res.send(image.data);
});
export default router;
