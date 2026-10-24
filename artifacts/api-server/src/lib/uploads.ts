import multer, { MulterError } from "multer";
import type { NextFunction, Request, Response } from "express";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const acceptedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!acceptedMimeTypes.has(file.mimetype)) {
      callback(new Error("Choose a JPEG, PNG, or WebP image."));
      return;
    }
    callback(null, true);
  },
});

export function handleImageUpload(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  imageUpload.single("image")(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof MulterError && error.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({ error: "Image must be 5 MB or smaller." });
      return;
    }
    res.status(400).json({
      error: error instanceof Error ? error.message : "Invalid image upload.",
    });
  });
}

export function hasValidImageSignature(file: Express.Multer.File): boolean {
  const buffer = file.buffer;
  if (file.mimetype === "image/png") {
    return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (file.mimetype === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  return (
    file.mimetype === "image/webp" &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  );
}

export function fileAsBlob(file: Express.Multer.File): Blob {
  const copy = new Uint8Array(file.buffer.byteLength);
  copy.set(file.buffer);
  return new Blob([copy.buffer], { type: file.mimetype });
}

