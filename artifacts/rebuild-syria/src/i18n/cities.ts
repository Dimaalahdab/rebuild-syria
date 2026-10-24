// Canonical city values (what the API stores) — display names come from `label()` (val.<city>).
export const CITY_VALUES = [
  'دمشق', 'ريف دمشق', 'حلب', 'حمص', 'حماة', 'اللاذقية', 'طرطوس', 'إدلب',
  'دير الزور', 'الرقة', 'درعا', 'السويداء', 'الحسكة', 'القامشلي',
] as const;

/** Canonical list plus the current value if it is a legacy/custom city, so saved data is never lost. */
export function cityOptions(current?: string): string[] {
  const list: string[] = [...CITY_VALUES];
  if (current && !list.includes(current)) list.unshift(current);
  return list;
}
