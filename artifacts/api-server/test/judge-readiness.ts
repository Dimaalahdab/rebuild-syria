import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import Database from "better-sqlite3";

const originalCwd = process.cwd();
const directory = mkdtempSync(resolve(tmpdir(), "rebuild-judge-check-"));
process.chdir(directory);
const passed: string[] = [];
try {
  const { sqlite, seedDemoData } = await import("../src/lib/sqlite");
  const count = (table: string) => (sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;
  assert.deepEqual([count("users"), count("reports"), count("projects")], [4, 3, 2]);
  seedDemoData();
  assert.deepEqual([count("users"), count("reports"), count("projects")], [4, 3, 2]);
  sqlite.prepare("DELETE FROM reports WHERE id = 'report-demo-road'").run();
  seedDemoData();
  assert.equal(sqlite.prepare("SELECT 1 FROM reports WHERE id = 'report-demo-road'").get(), undefined);
  passed.push("Empty database seeded; repeat startup does not duplicate or restore deleted fixtures");

  sqlite.exec("DELETE FROM projects; DELETE FROM reports; DELETE FROM users;");
  sqlite.prepare("INSERT INTO users (id, name, role, city) VALUES ('custom', 'Test', 'citizen', 'Test')").run();
  seedDemoData();
  assert.deepEqual([count("users"), count("reports"), count("projects")], [1, 0, 0]);
  passed.push("Nonempty custom database is not seeded");

  const { saveImage, migrateLegacyImages } = await import("../src/lib/images");
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3dUAAAAASUVORK5CYII=", "base64");
  const imageId = saveImage(png, "image/png");
  assert.throws(() => saveImage(Buffer.alloc(5 * 1024 * 1024 + 1), "image/png"));
  assert.throws(() => sqlite.prepare("INSERT INTO images (id, mime_type, data) VALUES ('oversize', 'image/png', ?)").run(Buffer.alloc(5 * 1024 * 1024 + 1)));
  assert.throws(() => saveImage(Buffer.from("fake"), "image/png"));
  passed.push("Image signature and 5 MB limit enforced in service and SQLite");

  mkdirSync("uploads");
  writeFileSync("uploads/legacy.png", png);
  sqlite.prepare("INSERT INTO reports (id, city, neighborhood, description, photo_path) VALUES ('legacy', 'Test', 'Test', 'Test', 'legacy.png')").run();
  assert.deepEqual(migrateLegacyImages(), { migrated: 1, unavailable: 0 });
  assert.deepEqual(migrateLegacyImages(), { migrated: 0, unavailable: 0 });
  const legacy = sqlite.prepare("SELECT image_id, photo_path FROM reports WHERE id = 'legacy'").get() as { image_id: string; photo_path: null };
  assert.ok(legacy.image_id);
  assert.equal(legacy.photo_path, null);
  passed.push("Legacy folder images migrate into BLOBs once without losing reports");

  const { consumeGemmaRequest } = await import("../src/lib/gemma-rate-limit");
  const now = 1_000_000;
  for (let index = 0; index < 20; index++) {
    assert.equal(consumeGemmaRequest("::ffff:192.0.2.20", now).allowed, true);
  }
  assert.equal(consumeGemmaRequest("192.0.2.20", now).allowed, false);
  assert.equal(consumeGemmaRequest("192.0.2.21", now).allowed, true);
  assert.equal(consumeGemmaRequest("192.0.2.20", now + 60_000).allowed, true);
  passed.push("20 requests allowed; 21st blocked; IPs isolated; allowance resets after 60 seconds");

  const file = sqlite.name;
  sqlite.close();
  const reopened = new Database(file);
  assert.deepEqual((reopened.prepare("SELECT data FROM images WHERE id = ?").get(imageId) as { data: Buffer }).data, png);
  assert.equal((reopened.prepare("SELECT COUNT(*) AS n FROM images").get() as { n: number }).n, 2);
  reopened.close();
  passed.push("BLOB bytes persist after closing and reopening the same SQLite file");
  process.stdout.write(JSON.stringify({ passed }, null, 2) + "\n");
} finally {
  process.chdir(originalCwd);
  rmSync(directory, { recursive: true, force: true });
}
