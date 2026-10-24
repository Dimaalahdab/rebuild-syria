import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useConfirmParticipation, useDecideVolunteerApplication } from '@workspace/api-client-react';
import type { Membership } from '@workspace/api-client-react';
import { Check, X } from 'lucide-react';
import { useI18n } from '@/i18n';
import { HumanLabel } from '@/components/ai-label';
import { MembershipBadge } from '@/components/status-badge';
import { isDemoRecord } from '@/lib/demo';
import { invalidateMunicipalityData } from '@/lib/invalidate';

function ApplicationCard({ m, pin }: { m: Membership; pin: string }) {
  const { t, label, fmtDateTime, errorMessage } = useI18n();
  const qc = useQueryClient();
  const req = { request: { headers: { 'X-Admin-Pin': pin } } };
  const decide = useDecideVolunteerApplication(req);
  const confirm = useConfirmParticipation(req);
  const [note, setNote] = useState('');
  const [error, setError] = useState<{ e: unknown; key: 'dash.apps.failed' | 'admin.confirmFailed' } | null>(null);
  const done = { onSuccess: () => { setNote(''); void invalidateMunicipalityData(qc); } };
  const busy = decide.isPending || confirm.isPending;
  const id = m.id;
  const send = (status: 'accepted' | 'declined') => {
    setError(null);
    decide.mutate({ id, data: { status, ...(note.trim() ? { note: note.trim() } : {}) } }, { ...done, onError: e => setError({ e, key: 'dash.apps.failed' }) });
  };
  return <article className="surface data-card mb-3" data-testid={`card-application-${id}`}>
    <div className="flex flex-wrap items-center gap-2"><MembershipBadge membership={m}/>{isDemoRecord(m) && <span className="tag tag-gold">{t('ui.demoData')}</span>}{m.municipalityNote && <HumanLabel/>}</div>
    <h3 dir="auto" className="text-start">{m.projectTitle}</h3>
    <p><span dir="auto">{m.userName}</span> · {label(m.city)}{m.scheduledAt ? ` · ${fmtDateTime(m.scheduledAt)}` : ''}</p>
    {m.municipalityNote && <p className="status-text mt-2" dir="auto">{t('outcome.note', { note: m.municipalityNote })}</p>}
    {m.status === 'pending' ? <div className="mt-4">
      <div className="field !mb-3"><label htmlFor={`app-note-${id}`}>{t('dash.apps.note')}</label><input id={`app-note-${id}`} data-testid={`input-app-note-${id}`} dir="auto" maxLength={2000} value={note} onChange={e => setNote(e.target.value)}/></div>
      <div className="action-row"><button className="action-primary" disabled={busy} onClick={() => send('accepted')} data-testid={`button-accept-${id}`}><Check size={16}/>{t('dash.apps.accept')}</button><button className="action-danger" disabled={busy} onClick={() => send('declined')} data-testid={`button-decline-${id}`}><X size={16}/>{t('dash.apps.decline')}</button></div>
    </div> : m.status === 'accepted' ? <button className="action-primary mt-3" disabled={busy} data-testid={`button-confirm-${id}`} onClick={() => { setError(null); confirm.mutate({ id }, { ...done, onError: e => setError({ e, key: 'admin.confirmFailed' }) }); }}><Check size={16}/>{t('admin.confirm')}</button> : null}
    {error && <div role="alert" className="notice notice-error mt-3">{t(error.key)}: {(error.e as { status?: number })?.status === 401 ? t('admin.pinInvalid') : errorMessage(error.e, error.key)}</div>}
  </article>;
}

export function ApplicationsPanel({ applications, pin }: { applications: Membership[]; pin: string }) {
  const { t, fmtNumber } = useI18n();
  const order = { pending: 0, accepted: 1, confirmed: 2, declined: 3 } as const;
  const sorted = [...applications].sort((a, b) => order[a.status] - order[b.status]);
  return <section aria-labelledby="apps-title">
    <h2 id="apps-title" className="text-xl font-extrabold">{t('dash.apps.title')} <span className="tag">{fmtNumber(applications.length)}</span></h2>
    <p className="status-text mb-4">{t('dash.apps.pendingOnly')} {t('dash.att.hint')}</p>
    {!sorted.length ? <div className="surface empty-state">{t('dash.apps.empty')}</div> : sorted.map(m => <ApplicationCard key={m.id} m={m} pin={pin}/>)}
  </section>;
}
