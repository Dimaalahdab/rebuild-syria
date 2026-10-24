import type { User } from '@workspace/api-client-react';

const KEY = 'rebuild-syria-demo-user';
export function readDemoProfile(): User | null {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) as User : null; } catch { return null; }
}
export function saveDemoProfile(user: User) {
  localStorage.setItem(KEY, JSON.stringify(user));
}
