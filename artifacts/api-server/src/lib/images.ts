import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { sqlite } from "./sqlite";
import { hasValidImageSignature, MAX_IMAGE_BYTES } from "./uploads";

export function saveImage(buffer: Buffer, mimeType: string): string {
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES ||
      !hasValidImageSignature({ buffer, mimetype: mimeType } as Express.Multer.File)) {
    throw new Error("Invalid image contents or size.");
  }
  const id = randomUUID();
  sqlite.prepare("INSERT INTO images (id, mime_type, data) VALUES (?, ?, ?)").run(id, mimeType, buffer);
  return id;
}

export function migrateLegacyImages(): { migrated: number; unavailable: number } {
  let migrated = 0;
  let unavailable = 0;
  const rows = sqlite.prepare(`
    SELECT id, photo_path FROM reports
    WHERE photo_path IS NOT NULL AND image_id IS NULL
  `).all() as Array<{ id: string; photo_path: string }>;
  for (const row of rows) {
    if (basename(row.photo_path) !== row.photo_path) { unavailable++; continue; }
    const extension = row.photo_path.split(".").pop()?.toLowerCase();
    const mimeType = extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg";
    try {
      const data = readFileSync(resolve(process.cwd(), "uploads", row.photo_path));
      sqlite.transaction(() => {
        const imageId = saveImage(data, mimeType);
        sqlite.prepare("UPDATE reports SET image_id = ?, photo_path = NULL WHERE id = ?").run(imageId, row.id);
      })();
      migrated++;
    } catch {
      // Do not delete or silently discard a report if its old file is missing.
      unavailable++;
    }
  }
  return { migrated, unavailable };
}
