/** Seeded records: prefer API-provided isDemo, else known demo id convention. */
export function isDemoRecord(record: { id: string; isDemo?: boolean | null }): boolean {
  return record.isDemo ?? /(^|-)demo-/.test(record.id);
}
