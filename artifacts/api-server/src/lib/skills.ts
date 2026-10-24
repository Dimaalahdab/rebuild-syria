/** Wire/storage values are language-independent. Translate only at presentation. */
export const CANONICAL_SKILLS = [
  "Cleaning", "Painting", "Gardening", "Organization", "Transportation",
  "Engineering", "Electrical", "Construction", "Photography", "Design", "Other",
] as const;

const allowedSkills = new Set<string>(CANONICAL_SKILLS);
export function validSkills(skills: string[]): boolean {
  return skills.length <= CANONICAL_SKILLS.length &&
    skills.every((skill) => allowedSkills.has(skill));
}
