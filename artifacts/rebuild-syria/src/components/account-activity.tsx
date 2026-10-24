import { Link } from 'wouter';
import { CalendarClock, ClipboardList, HandHeart, MessageSquareText } from 'lucide-react';
import type { Membership, Report } from '@workspace/api-client-react';
import { LoadState } from '@/components/platform-shell';
import { HumanLabel, AiLabel } from '@/components/ai-label';
import { MembershipBadge, ReportStatusBadge } from '@/components/status-badge';
import { ReportOutcome } from '@/components/outcome-info';
import { useAccountActivity } from '@/hooks/use-account-activity';
import { useI18n } from '@/i18n';

function ReportItem({ r }: { r: Report }) {
  const { label, fmtDateTime } = useI18n();
  return <Link href={`/reports/${r.id}`} className="surface data-card mb-3" data-testid={`card-my-report-${r.id}`}>
    <div className="flex flex-wrap items-center gap-2"><ReportStatusBadge status={r.status}/>{r.analysis && r.category && <AiLabel/>}</div>
    <h3 dir="auto" className="text-start">{r.title || r.description.slice(0, 70)}</h3>
    <p className="status-text">{label(r.city)} · <span dir="auto">{r.neighborhood}</span> · {fmtDateTime(r.createdAt)}</p>
    <ReportOutcome report={r}/>
  </Link>;
}
function VolunteerItem({ m }: { m: Membership }) {
  const { t, fmtDateTime } = useI18n();
  return <Link href={`/projects/${m.projectId}`} className="surface data-card mb-3" data-testid={`card-my-volunteering-${m.id}`}>
    <div className="flex flex-wrap items-center gap-2"><MembershipBadge membership={m}/>{(m.municipalityNote || m.projectNote) && <HumanLabel/>}</div>
    <h3 dir="auto" className="text-start">{m.projectTitle}</h3>
    {m.scheduledAt && <p className="status-text flex gap-2 items-center m-0"><CalendarClock size={14}/>{t('outcome.when', { date: fmtDateTime(m.scheduledAt) })}</p>}
    {m.municipalityNote && <p dir="auto" className="status-text flex gap-2 items-start mt-2 mb-0 text-start"><MessageSquareText size={14} className="mt-1 shrink-0"/>{t('outcome.note', { note: m.municipalityNote })}</p>}
    {m.projectNote && <p dir="auto" className="status-text flex gap-2 items-start mt-2 mb-0 text-start"><MessageSquareText size={14} className="mt-1 shrink-0"/>{t('account.projectNote', { note: m.projectNote })}</p>}
    {m.updatedAt && <p className="status-text mt-2 mb-0">{t('account.updatedAt', { date: fmtDateTime(m.updatedAt) })}</p>}
  </Link>;
}

export function AccountActivity({ userId }: { userId: string }) {
  const { t } = useI18n();
  const q = useAccountActivity(userId);
  const reports = q.data?.reports ?? [];
  const vol = q.data?.volunteering ?? [];
  return <LoadState loading={q.isLoading} error={q.isError && !q.data} retry={() => void q.refetch()}>
    <section className="mb-6" data-testid="section-my-reports"><h2 className="text-lg font-extrabold flex items-center gap-2"><ClipboardList size={19}/>{t('account.myReports')}</h2>
      {reports.length ? reports.map(r => <ReportItem key={r.id} r={r}/>) : <div className="surface empty-state"><strong>{t('account.noReports')}</strong><Link href="/report" className="text-action no-underline">{t('account.reportCta')}</Link></div>}</section>
    <section className="mb-6" data-testid="section-my-volunteering"><h2 className="text-lg font-extrabold flex items-center gap-2"><HandHeart size={19}/>{t('account.myVolunteering')}</h2>
      {vol.length ? vol.map(m => <VolunteerItem key={m.id} m={m}/>) : <div className="surface empty-state"><strong>{t('account.noVolunteering')}</strong><Link href="/projects" className="text-action no-underline">{t('account.browse')}</Link></div>}</section>
  </LoadState>;
}
