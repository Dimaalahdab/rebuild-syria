import type { Project } from '@workspace/api-client-react';

const unsafe = /hazard|road|building|electri|كهرب|طريق|طرقات|مبنى|إنشاء|هدم|سقالة|غاز|حريق|انهيار|حفريات|أعمال صيانة/i;
export function isSafeProject(project: Project) {
  const text = [project.title,project.description,...project.requiredSkills].join(' ');
  return project.isSafe && !unsafe.test(text);
}
export function canJoinProject(project: Project) {
  return isSafeProject(project) && project.status === 'open';
}
