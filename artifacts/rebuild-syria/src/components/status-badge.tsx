import type { Membership } from '@workspace/api-client-react';
import { useI18n, type TKey } from '@/i18n';

export function ReportStatusBadge({ status }: { status: string }) {
  const { label } = useI18n();
  return <span className={`st-badge st-${status}`} data-testid={`badge-report-${status}`}>{label(status)}</span>;
}

/** Project state takes precedence over the application state (declined stays declined). */
export function membershipState(m: Pick<Membership, 'status' | 'projectStatus' | 'scheduledAt'>): 'pending' | 'accepted' | 'declined' | 'confirmed' | 'scheduled' | 'completed' {
  if (m.status === 'declined' || m.status === 'pending') return m.status;
  if (m.projectStatus === 'completed') return 'completed';
  if (m.scheduledAt) return 'scheduled';
  return m.status;
}
export function MembershipBadge({ membership }: { membership: Membership }) {
  const { t } = useI18n();
  const state = membershipState(membership);
  return <>
    <span className={`st-badge st-${membership.status}`} data-testid={`badge-membership-${membership.status}`}>{t(`mem.${membership.status}` as TKey)}</span>
    {state !== membership.status && <span className={`st-badge st-${state}`} data-testid={`badge-membership-${state}`}>{t(`mem.${state}` as TKey)}</span>}
  </>;
}
