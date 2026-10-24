import { useMemo, useState } from 'react';
import type { Report } from '@workspace/api-client-react';
import { MapPin } from 'lucide-react';
import { useI18n } from '@/i18n';
import { AiLabel } from '@/components/ai-label';
import { ReportStatusBadge } from '@/components/status-badge';
import { ReportOutcome } from '@/components/outcome-info';
import { isDemoRecord } from '@/lib/demo';
import { DECISION_STATUSES, priorityRank } from '@/lib/report-decision';
import { ReportAnalysisView } from './report-analysis';
import { DecisionPanel } from './decision-panel';

function InboxCard({ report, pin }: { report: Report; pin: string }) {
  const { t, label, fmtDateTime } = useI18n();
  const [open, setOpen] = useState(false);
  const a = report.analysis;
  return <article className="surface data-card mb-3" data-testid={`card-inbox-report-${report.id}`}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="flex flex-wrap items-center gap-2"><ReportStatusBadge status={report.status}/>{a && <span className={`st-badge ${a.suggestedPriority === 'high' ? 'st-declined' : a.suggestedPriority === 'medium' ? 'st-pending' : ''}`}>{t('dash.report.priority')}: {label(a.suggestedPriority)}</span>}{a && <AiLabel/>}{isDemoRecord(report) && <span className="tag tag-gold">{t('ui.demoData')}</span>}</span>
      <span className="status-text">{fmtDateTime(report.createdAt)}</span>
    </div>
    <h3 dir="auto" className="text-start">{report.title || t('ui.communityReport')}{report.title && a && <> <AiLabel className="align-middle"/></>}</h3>
    <p className="data-meta !mt-0 mb-3"><span><MapPin size={14} className="inline me-1"/>{label(report.city)} · <span dir="auto">{report.neighborhood}</span></span></p>
    {report.photoUrl && <img src={report.photoUrl} alt={t('ui.photoAlt')} className="photo-preview mb-3"/>}
    <div className="status-text mb-1">{t('dash.report.userText')}</div>
    <p dir="auto" className="text-start">{report.description}</p>
    <ReportAnalysisView report={report}/>
    <ReportOutcome report={report}/>
    <div className="action-row mt-4"><button type="button" className="action-secondary" aria-expanded={open} onClick={() => setOpen(o => !o)} data-testid={`button-toggle-decision-${report.id}`}>{open ? t('dash.panel.close') : t('dash.panel.open')}</button></div>
    {open && <DecisionPanel report={report} pin={pin} onDone={() => setOpen(false)}/>}
  </article>;
}

export function ReportInbox({ reports, pin }: { reports: Report[]; pin: string }) {
  const { t, label } = useI18n();
  const [status, setStatus] = useState('');
  const [hood, setHood] = useState('');
  const sorted = useMemo(() => [...reports].sort((x, y) => priorityRank(x) - priorityRank(y)), [reports]);
  const shown = useMemo(() => {
    const q = hood.trim().toLowerCase();
    return sorted.filter(r => (!status || r.status === status) && (!q || r.neighborhood.toLowerCase().includes(q)));
  }, [sorted, status, hood]);
  const statuses = ['new', ...DECISION_STATUSES];
  return <section aria-labelledby="inbox-title">
    <h2 id="inbox-title" className="text-xl font-extrabold">{t('dash.inbox.title')} <span className="tag">{shown.length}</span></h2>
    <p className="status-text mb-4">{t('dash.inbox.hint')}</p>
    <div className="surface p-4 mb-4 dash-filters">
      <div className="field !m-0"><label htmlFor="f-status">{t('dash.filter.status')}</label><select id="f-status" data-testid="select-filter-status" value={status} onChange={e => setStatus(e.target.value)}><option value="">{t('dash.filter.all')}</option>{statuses.map(s => <option key={s} value={s}>{label(s)}</option>)}</select></div>
      <div className="field !m-0"><label htmlFor="f-hood">{t('dash.filter.neighborhood')}</label><input id="f-hood" data-testid="input-filter-neighborhood" dir="auto" value={hood} onChange={e => setHood(e.target.value)} placeholder={t('dash.filter.neighborhoodPh')}/></div>
      <button type="button" className="action-secondary" disabled={!status && !hood} onClick={() => { setStatus(''); setHood(''); }} data-testid="button-clear-filters">{t('dash.filter.clear')}</button>
    </div>
    {!shown.length ? <div className="surface empty-state" data-testid="inbox-empty">{reports.length ? t('dash.inbox.emptyFiltered') : t('dash.inbox.empty')}</div> : shown.map(r => <InboxCard key={r.id} report={r} pin={pin}/>)}
  </section>;
}
