import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const databasePath = resolve(process.cwd(), "data", "app.db");
mkdirSync(dirname(databasePath), { recursive: true });

export const sqlite = new Database(databasePath);
sqlite.pragma("foreign_keys = ON");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
    data BLOB NOT NULL CHECK (length(data) BETWEEN 1 AND 5242880),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS gemma_rate_limits (
    ip_hash TEXT PRIMARY KEY,
    request_count INTEGER NOT NULL,
    reset_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('citizen', 'volunteer', 'organizer')),
    city TEXT NOT NULL,
    skills_json TEXT NOT NULL DEFAULT '[]',
    points INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    city TEXT NOT NULL,
    neighborhood TEXT NOT NULL,
    description TEXT NOT NULL,
    photo_path TEXT,
    category TEXT,
    title TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ai_analyses (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    model_name TEXT NOT NULL,
    result_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    report_id TEXT REFERENCES reports(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    city TEXT NOT NULL,
    neighborhood TEXT NOT NULL,
    description TEXT NOT NULL,
    required_skills_json TEXT NOT NULL DEFAULT '[]',
    volunteer_limit INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'open', 'in_progress', 'completed', 'rejected')),
    is_safe INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS project_memberships (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'joined',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (project_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS impact_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    source_id TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, event_type, source_id)
  );
`);

const reportColumns = sqlite.pragma("table_info(reports)") as Array<{ name: string }>;
if (!reportColumns.some((column) => column.name === "image_id")) {
  sqlite.exec("ALTER TABLE reports ADD COLUMN image_id TEXT REFERENCES images(id)");
}

export const seedDemoData = sqlite.transaction(() => {
  // Only an empty product database gets fixtures. Never restore individual
  // demo records that somebody has deliberately changed or removed.
  const existingData = sqlite.prepare(`
    SELECT 1 FROM users UNION ALL SELECT 1 FROM reports
    UNION ALL SELECT 1 FROM projects UNION ALL SELECT 1 FROM images LIMIT 1
  `).get();
  if (existingData) return;

  const users = [
    ["volunteer-demo-1", "متطوع تجريبي ١", "volunteer", "دمشق", ["Cleaning", "Organization"]],
    ["volunteer-demo-2", "متطوعة تجريبية ٢", "volunteer", "حلب", ["Gardening", "Painting"]],
    ["volunteer-demo-3", "متطوع تجريبي ٣", "volunteer", "حمص", ["Transportation", "Photography"]],
    ["volunteer-demo-4", "متطوعة تجريبية ٤", "volunteer", "اللاذقية", ["Design", "Engineering"]],
  ] as const;

  const insertUser = sqlite.prepare(`
    INSERT OR IGNORE INTO users (id, name, role, city, skills_json)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const [id, name, role, city, skills] of users) {
    insertUser.run(id, name, role, city, JSON.stringify(skills));
  }

  const insertReport = sqlite.prepare(`
    INSERT OR IGNORE INTO reports
      (id, author_id, city, neighborhood, description, category, title, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertReport.run(
    "report-demo-waste",
    "volunteer-demo-1",
    "دمشق",
    "المزة",
    "تراكم النفايات قرب الحديقة ويحتاج إلى تنظيم حملة تنظيف.",
    "Waste",
    "تراكم نفايات قرب الحديقة",
    "new",
  );
  insertReport.run(
    "report-demo-park",
    "volunteer-demo-2",
    "حلب",
    "الجميلية",
    "المساحة الخضراء مهملة وتحتاج إلى عناية وزراعة بسيطة.",
    "Public spaces",
    "حديقة الحي بحاجة إلى عناية",
    "new",
  );
  insertReport.run(
    "report-demo-road",
    "volunteer-demo-3",
    "حمص",
    "حي الإنشاءات",
    "حفرة في الطريق تحتاج إلى معاينة وإحالة إلى الجهات المختصة.",
    "Roads",
    "حفرة في الطريق",
    "referred",
  );

  const insertProject = sqlite.prepare(`
    INSERT OR IGNORE INTO projects
      (id, report_id, title, city, neighborhood, description, required_skills_json, volunteer_limit, status, is_safe)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', 1)
  `);
  insertProject.run(
    "project-demo-cleanup",
    "report-demo-waste",
    "حملة تنظيف الحي",
    "دمشق",
    "المزة",
    "تنظيف المساحة العامة وفرز المخلفات غير الخطرة بالتنسيق مع الحي.",
    JSON.stringify(["Cleaning", "Organization"]),
    12,
  );
  insertProject.run(
    "project-demo-park",
    "report-demo-park",
    "مساحة خضراء لكل حي",
    "حلب",
    "الجميلية",
    "زراعة نباتات محلية وترتيب الحديقة ضمن أنشطة آمنة ومجتمعية.",
    JSON.stringify(["Gardening", "Painting"]),
    10,
  );

  const insertMembership = sqlite.prepare(`
    INSERT OR IGNORE INTO project_memberships (id, project_id, user_id)
    VALUES (?, ?, ?)
  `);
  insertMembership.run("membership-demo-1", "project-demo-cleanup", "volunteer-demo-1");
  insertMembership.run("membership-demo-2", "project-demo-park", "volunteer-demo-2");
});

seedDemoData();

export function checkDatabase(): boolean {
  sqlite.prepare("SELECT 1").get();
  return true;
}
