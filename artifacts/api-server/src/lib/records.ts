type SqliteRow = Record<string, unknown>;

const text = (row: SqliteRow, key: string): string => String(row[key] ?? "");
const count = (row: SqliteRow, key: string): number => Number(row[key] ?? 0);
const skills = (row: SqliteRow, key: string): string[] => {
  try {
    const value: unknown = JSON.parse(text(row, key));
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
};
const dateTime = (row: SqliteRow): string => {
  const value = text(row, "created_at");
  return value.includes("T") ? new Date(value).toISOString() : `${value.replace(" ", "T")}Z`;
};

export function userRecord(row: SqliteRow) {
  return {
    id: text(row, "id"),
    name: text(row, "name"),
    role: text(row, "role"),
    city: text(row, "city"),
    skills: skills(row, "skills_json"),
    points: count(row, "points"),
    createdAt: dateTime(row),
  };
}

export function reportRecord(row: SqliteRow) {
  const imageId = row.image_id ? text(row, "image_id") : null;
  return {
    id: text(row, "id"),
    authorId: row.author_id ? text(row, "author_id") : null,
    city: text(row, "city"),
    neighborhood: text(row, "neighborhood"),
    description: text(row, "description"),
    photoUrl: imageId ? `/api/images/${encodeURIComponent(imageId)}` : null,
    category: row.category ? text(row, "category") : null,
    title: row.title ? text(row, "title") : null,
    status: text(row, "status"),
    createdAt: dateTime(row),
  };
}

export function projectRecord(row: SqliteRow, joinedByUser = false) {
  return {
    id: text(row, "id"),
    reportId: row.report_id ? text(row, "report_id") : null,
    title: text(row, "title"),
    city: text(row, "city"),
    neighborhood: text(row, "neighborhood"),
    description: text(row, "description"),
    requiredSkills: skills(row, "required_skills_json"),
    volunteerLimit: count(row, "volunteer_limit"),
    status: text(row, "status"),
    isSafe: count(row, "is_safe") === 1,
    joinedCount: count(row, "joined_count"),
    joinedByUser,
  };
}

export function membershipRecord(row: SqliteRow) {
  return {
    id: text(row, "id"),
    projectId: text(row, "project_id"),
    projectTitle: text(row, "project_title"),
    userId: text(row, "user_id"),
    userName: text(row, "user_name"),
    city: text(row, "city"),
    status: text(row, "status"),
  };
}

export function parseSkills(value: unknown): string[] {
  if (typeof value !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}
