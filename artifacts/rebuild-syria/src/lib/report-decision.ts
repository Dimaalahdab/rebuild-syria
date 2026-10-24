import type { Report, ReportDecisionInputAssignedTo, ReportDecisionInputStatus } from '@workspace/api-client-react';
import type { TKey } from '@/i18n';

export const DECISION_STATUSES: ReportDecisionInputStatus[] = [
  'under_review', 'accepted_for_volunteers', 'assigned_to_municipality', 'referred', 'scheduled', 'completed', 'rejected',
];
export const HANDLERS: ReportDecisionInputAssignedTo[] = ['volunteers', 'municipality', 'other_authority'];

export const defaultHandler = (status: ReportDecisionInputStatus, current: ReportDecisionInputAssignedTo): ReportDecisionInputAssignedTo =>
  status === 'accepted_for_volunteers' ? 'volunteers'
  : status === 'assigned_to_municipality' ? 'municipality'
  : status === 'referred' ? 'other_authority' : current;

export const needsReview = (r: Report) => !!(r.requiresProfessionalReview || r.analysis?.requiresProfessionalReview);

export function validateDecision(v: { status: ReportDecisionInputStatus; assignedTo: ReportDecisionInputAssignedTo; when: string; note: string; review: boolean }): TKey | null {
  if (v.review && (v.status === 'accepted_for_volunteers' || v.assignedTo === 'volunteers')) return 'dash.v.unsafe';
  if (v.status === 'rejected' && !v.note.trim()) return 'dash.v.note';
  if ((v.status === 'accepted_for_volunteers' || v.status === 'scheduled') && !v.when) return 'dash.v.when';
  if (v.status === 'accepted_for_volunteers' && v.assignedTo !== 'volunteers') return 'dash.v.volunteerHandler';
  if (v.status === 'assigned_to_municipality' && v.assignedTo !== 'municipality') return 'dash.v.municipalityHandler';
  if (v.status === 'referred' && v.assignedTo !== 'other_authority') return 'dash.v.otherHandler';
  return null;
}

const rank = { high: 0, medium: 1, low: 2 } as const;
export const priorityRank = (r: Report) => (r.analysis ? rank[r.analysis.suggestedPriority] : 3);
