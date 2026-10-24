import { useI18n } from '@/i18n';
import { useUnreadCount } from '@/hooks/use-account-activity';
import { readDemoProfile } from '@/lib/demo-profile';

/** Small counter on the account menu when statuses changed since the user last looked. */
export function AccountBadge() {
  const { t, fmtNumber } = useI18n();
  const n = useUnreadCount(readDemoProfile()?.id ?? '');
  if (n <= 0) return null;
  return <span className="nav-dot" role="status" aria-label={t('nav.accountUpdates', { n: fmtNumber(n) })} data-testid="badge-account-unread">{n > 9 ? `${fmtNumber(9)}+` : fmtNumber(n)}</span>;
}
