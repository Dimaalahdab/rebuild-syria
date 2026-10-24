import { CalendarClock, MessageSquareText, UserRoundCheck } from 'lucide-react';
import type { Report } from '@workspace/api-client-react';
import { useI18n, type TKey } from '@/i18n';
import { HumanLabel } from '@/components/ai-label';

/** Human decision details for a report: handler, date/time, note. Free text is dir=auto. */
export function ReportOutcome({ report, showEmpty = false }: { report: Pick<Report, 'assignedTo' | 'municipalityNote' | 'scheduledAt' | 'decidedAt'>; showEmpty?: boolean }) {
  const { t, fmtDateTime } = useI18n();
  const has = report.assignedTo || report.municipalityNote || report.scheduledAt || report.decidedAt;
  if (!has) return showEmpty ? <p className="status-text mt-3">{t('outcome.none')}</p> : null;
  return <div className="notice notice-green mt-4 space-y-1" data-testid="report-outcome">
    <HumanLabel />
    {report.assignedTo && <p className="m-0 flex gap-2 items-center"><UserRoundCheck size={15}/>{t('outcome.handler', { who: t(`assign.${report.assignedTo}` as TKey) })}</p>}
    {report.scheduledAt && <p className="m-0 flex gap-2 items-center"><CalendarClock size={15}/>{t('outcome.when', { date: fmtDateTime(report.scheduledAt) })}</p>}
    {report.municipalityNote && <p className="m-0 flex gap-2 items-start"><MessageSquareText size={15} className="mt-1 shrink-0"/><span dir="auto" className="text-start">{t('outcome.note', { note: report.municipalityNote })}</span></p>}
    {report.decidedAt && <p className="status-text m-0">{t('outcome.decidedAt', { date: fmtDateTime(report.decidedAt) })}</p>}
  </div>;
}
