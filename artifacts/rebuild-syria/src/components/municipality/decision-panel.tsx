import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDecideReport } from '@workspace/api-client-react';
import type { Report, ReportDecisionInputAssignedTo, ReportDecisionInputStatus } from '@workspace/api-client-react';
import { AlertTriangle, Gavel } from 'lucide-react';
import { useI18n, type TKey } from '@/i18n';
import { HumanLabel } from '@/components/ai-label';
import { isoToLocalInput, localInputToIso } from '@/lib/datetime';
import { invalidateMunicipalityData } from '@/lib/invalidate';
import { DECISION_STATUSES, HANDLERS, defaultHandler, needsReview, validateDecision } from '@/lib/report-decision';

export function DecisionPanel({ report, pin, onDone }: { report: Report; pin: string; onDone: () => void }) {
  const { t, label, errorMessage } = useI18n();
  const qc = useQueryClient();
  const review = needsReview(report);
  const initialStatus = (DECISION_STATUSES as string[]).includes(report.status) ? (report.status as ReportDecisionInputStatus) : 'under_review';
  const [status, setStatus] = useState<ReportDecisionInputStatus>(initialStatus);
  const [assignedTo, setAssignedTo] = useState<ReportDecisionInputAssignedTo>(report.assignedTo ?? 'municipality');
  const [when, setWhen] = useState(isoToLocalInput(report.scheduledAt));
  const [note, setNote] = useState(report.municipalityNote ?? '');
  const [error, setError] = useState<unknown>(null);
  const decide = useDecideReport({ request: { headers: { 'X-Admin-Pin': pin } } });
  const problem = validateDecision({ status, assignedTo, when, note, review });
  const statusOf = (e: unknown) => (e as { status?: number })?.status;

  function pickStatus(next: ReportDecisionInputStatus) {
    setStatus(next);
    setAssignedTo(h => defaultHandler(next, h));
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (problem) return;
    setError(null);
    const needsWhen = status === 'accepted_for_volunteers' || status === 'scheduled' || !!when;
    decide.mutate({ id: report.id, data: { status, assignedTo, note: note.trim(), scheduledAt: needsWhen ? localInputToIso(when) : null } }, {
      onSuccess: () => { void invalidateMunicipalityData(qc); onDone(); },
      onError: setError,
    });
  }
  const id = report.id;
  return <form onSubmit={submit} className="decision-box" data-testid={`panel-decision-${id}`}>
    <div className="flex flex-wrap items-center gap-2 mb-3"><h4 className="m-0 font-extrabold text-[#244a30] flex items-center gap-2"><Gavel size={16}/>{t('dash.panel.title')}</h4><HumanLabel/></div>
    <div className="field"><label htmlFor={`d-status-${id}`}>{t('dash.panel.outcome')}</label>
      <select id={`d-status-${id}`} data-testid={`select-outcome-${id}`} value={status} onChange={e => pickStatus(e.target.value as ReportDecisionInputStatus)}>
        {DECISION_STATUSES.map(s => <option key={s} value={s} disabled={review && s === 'accepted_for_volunteers'}>{label(s)}{review && s === 'accepted_for_volunteers' ? ` (${t('dash.v.unsafeOption')})` : ''}</option>)}
      </select></div>
    <div className="field"><label htmlFor={`d-handler-${id}`}>{t('dash.panel.handler')}</label>
      <select id={`d-handler-${id}`} data-testid={`select-handler-${id}`} value={assignedTo} onChange={e => setAssignedTo(e.target.value as ReportDecisionInputAssignedTo)}>
        {HANDLERS.map(h => <option key={h} value={h} disabled={review && h === 'volunteers'}>{t(`assign.${h}` as TKey)}{review && h === 'volunteers' ? ` (${t('dash.v.unsafeOption')})` : ''}</option>)}
      </select></div>
    <div className="field"><label htmlFor={`d-when-${id}`}>{t('dash.panel.when')}</label><input id={`d-when-${id}`} data-testid={`input-when-${id}`} type="datetime-local" dir="ltr" value={when} onChange={e => setWhen(e.target.value)}/></div>
    <div className="field"><label htmlFor={`d-note-${id}`}>{t('dash.panel.note')}</label><textarea id={`d-note-${id}`} data-testid={`input-note-${id}`} dir="auto" maxLength={2000} value={note} onChange={e => setNote(e.target.value)} placeholder={t('dash.panel.notePh')} style={{ minHeight: 84 }}/>{status === 'rejected' && <span className="field-hint">{t('dash.panel.noteRequiredHint')}</span>}</div>
    {status === 'accepted_for_volunteers' && !review && <p className="field-hint mb-3">{t('dash.panel.autoProject')}</p>}
    {review && <div className="notice notice-error mb-3 flex gap-2 items-start" role="note" data-testid={`text-review-block-${id}`}><AlertTriangle size={16} className="mt-1 shrink-0"/><span>{t('dash.v.unsafe')}</span></div>}
    {problem && !(review && problem === 'dash.v.unsafe') && <p className="field-hint mb-3" role="status" data-testid={`text-validation-${id}`}>{t(problem)}</p>}
    {!!error && <div role="alert" className="notice notice-error mb-3">{statusOf(error) === 401 ? t('admin.pinInvalid') : `${t('dash.panel.failed')}: ${errorMessage(error, 'dash.panel.failed')}`}</div>}
    <button className="action-primary" type="submit" disabled={!!problem || decide.isPending} data-testid={`button-save-decision-${id}`}>{decide.isPending ? t('dash.panel.submitting') : t('dash.panel.submit')}</button>
  </form>;
}
