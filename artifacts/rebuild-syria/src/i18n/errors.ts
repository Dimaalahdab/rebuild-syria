import type { Dict } from './ar';

type Key = keyof Dict;

// Known server error strings -> translation keys. Anything not listed falls back to
// status mapping / a translated generic message; raw text is never shown as the message.
const SERVER_ERRORS: Record<string, Key> = {
  'A photo is required when saving an AI analysis.': 'err.srv.photoRequiredForAnalysis',
  'Choose a photo before asking Gemma to analyze the report.': 'err.srv.choosePhoto',
  'Choose at least one profile detail to update.': 'err.srv.chooseProfileDetail',
  'Choose the volunteer role in your demo profile to join projects.': 'err.srv.needVolunteerRole',
  'Create a demo profile before joining a project.': 'err.srv.needProfile',
  'Image must be 5 MB or smaller.': 'err.srv.imageTooLarge',
  'Image not found.': 'err.srv.imageNotFound',
  'One or more selected skills are not supported.': 'err.srv.badSkills',
  'Open safe project not found.': 'err.srv.openProjectNotFound',
  'Participation record not found.': 'err.srv.participationNotFound',
  'Profile not found.': 'err.srv.profileNotFound',
  'Project not found.': 'err.srv.projectNotFound',
  'Report not found.': 'err.srv.reportNotFound',
  'Safe project not found.': 'err.srv.safeProjectNotFound',
  'The demo admin PIN is incorrect.': 'err.srv.pinWrong',
  'The demo admin PIN is required.': 'err.srv.pinRequired',
  'The Gemma connection test can be run once per minute.': 'err.srv.gemmaTestLimit',
  'The image contents do not match a JPEG, PNG, or WebP file.': 'err.srv.imageMismatch',
  'The report could not be saved. Please try again.': 'err.srv.reportSaveFailed',
  'The saved AI analysis is missing required fields.': 'err.srv.analysisMissingFields',
  'The saved analysis is not valid JSON.': 'err.srv.analysisBadJson',
  'The selected demo profile does not exist.': 'err.srv.profileMissing',
  'This project has reached its volunteer limit.': 'err.srv.projectFull',
  'This project is not open for volunteers.': 'err.srv.projectNotOpen',
  'This project needs professional review and cannot open to volunteers.': 'err.srv.needsProfessionalReview',
  'This report involves a hazard and cannot become a volunteer project.': 'err.srv.reportHazard',
  'Unsafe work cannot be opened to volunteers.': 'err.srv.unsafeWork',
  'You have already joined this project.': 'err.srv.alreadyJoined',
  'تم بلوغ حد ٢٠ طلب تحليل في الدقيقة. انتظر قليلاً ثم حاول مجدداً.': 'err.srv.aiRateLimit',
};

const STATUS_KEYS: Record<number, Key> = {
  400: 'err.status.400', 401: 'err.status.401', 403: 'err.status.403', 404: 'err.status.404',
  409: 'err.status.409', 413: 'err.status.413', 415: 'err.status.415', 422: 'err.status.422',
  429: 'err.status.429', 500: 'err.status.500', 502: 'err.status.502', 503: 'err.status.503',
};

type ErrLike = { message?: unknown; status?: unknown; data?: unknown };

/** The server's own `{error}` text if present, else the Error message. */
export function rawServerText(error: unknown): string {
  const e = error as ErrLike | null;
  const data = e?.data as { error?: unknown } | null | undefined;
  if (data && typeof data.error === 'string') return data.error.trim();
  return typeof e?.message === 'string' ? e.message.trim() : '';
}

/** Resolve an unknown thrown value to a translation key. */
export function errorKey(error: unknown, fallback?: Key): Key {
  const e = error as ErrLike | null;
  const text = rawServerText(error);
  if (SERVER_ERRORS[text]) return SERVER_ERRORS[text];
  const hit = Object.keys(SERVER_ERRORS).find(known => text.includes(known));
  if (hit) return SERVER_ERRORS[hit];
  if (fallback) return fallback;
  const status = typeof e?.status === 'number' ? e.status : undefined;
  if (status && STATUS_KEYS[status]) return STATUS_KEYS[status];
  if (error instanceof TypeError) return 'err.network';
  return 'err.generic';
}

/** Raw untranslated technical text, only when it is NOT a known/mapped message. */
export function errorDetails(error: unknown): string {
  const text = rawServerText(error);
  if (!text || SERVER_ERRORS[text]) return '';
  return text;
}
