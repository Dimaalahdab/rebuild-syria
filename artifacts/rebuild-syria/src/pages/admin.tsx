import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetAdminSummaryQueryKey,
  useConfirmParticipation,
  useCreateProjectFromReport,
  useGetAdminSummary,
  useUpdateProjectStatus,
  useVerifyReport,
} from '@workspace/api-client-react';
import type { ProjectInput } from '@workspace/api-client-react';
import { Check, KeyRound, ShieldCheck, X } from 'lucide-react';
import { PageFrame, PlatformShell } from '@/components/platform-shell';
import { SKILL_VALUES } from '@/lib/skills';
import { isDemoRecord } from '@/lib/demo';
import { useI18n, type TKey } from '@/i18n';

type Draft = { id: string; title: string; city: string; neighborhood: string; description: string; requiredSkills: string[]; volunteerLimit: string };
type Err = { error: unknown; fallback: TKey } | null;
export default function AdminPage() {
  const { t, label, errorMessage } = useI18n();
  const [pin, setPin] = useState('');
  const [requested, setRequested] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<Err>(null);
  const [draftReport, setDraftReport] = useState<Draft | null>(null);
  const qc = useQueryClient();
  const query = useGetAdminSummary({
    request: { headers: { 'X-Admin-Pin': pin } },
    query: { enabled: requested, queryKey: [...getGetAdminSummaryQueryKey(), attempt], retry: false },
  });
  const adminRequest = { headers: { 'X-Admin-Pin': pin } };
  const verify = useVerifyReport({ request: adminRequest });
  const createProject = useCreateProjectFromReport({ request: adminRequest });
  const status = useUpdateProjectStatus({ request: adminRequest });
  const confirm = useConfirmParticipation({ request: adminRequest });
  function submitPin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setRequested(true);
    setAttempt(value => value + 1);
  }
  function refresh() { void qc.invalidateQueries({ queryKey: getGetAdminSummaryQueryKey() }); }
  const fail = (fallback: TKey) => (e: unknown) => setError({ error: e, fallback });
  const statusOf = (v: unknown) => (v as { status?: number })?.status;
  const errText = error ? (statusOf(error.error) === 401 ? t('admin.pinInvalid') : errorMessage(error.error, error.fallback)) : '';
  function proposeProject(e: React.FormEvent) {
    e.preventDefault();
    if (!draftReport) return;
    setError(null);
    const data: ProjectInput = {
      title: draftReport.title.trim(),
      city: draftReport.city.trim(),
      neighborhood: draftReport.neighborhood.trim(),
      description: draftReport.description.trim(),
      requiredSkills: draftReport.requiredSkills,
      volunteerLimit: Number(draftReport.volunteerLimit),
    };
    createProject.mutate({ id: draftReport.id, data }, {
      onSuccess: () => { setDraftReport(null); refresh(); },
      onError: fail('admin.draft.failed'),
    });
  }
  return <PlatformShell><PageFrame eyebrow={t('admin.eyebrow')} title={t('admin.title')} intro={t('admin.intro')}>
    <form onSubmit={submitPin} className="surface form-surface mb-5">
      <div className="brand-mark mb-4"><KeyRound/></div>
      <h2 className="text-xl font-extrabold text-[#244a30]">{t('admin.login')}</h2>
      <p className="status-text mb-5">{t('admin.loginHint')}</p>
      <div className="field"><label htmlFor="admin-pin">{t('admin.pin')}</label><input id="admin-pin" dir="ltr" value={pin} onChange={e=>setPin(e.target.value)} inputMode="numeric" type="password" autoComplete="off" required/></div>
      <div className="action-row"><button className="action-primary" type="submit">{t('admin.load')}</button>{requested&&<button className="action-secondary" type="button" onClick={()=>{setPin('');setRequested(false);setError(null);}}>{t('admin.clearPin')}</button>}</div>
    </form>
    {error&&<div role="alert" className="notice notice-error mb-5">{errText}<button className="ms-2 underline font-bold" onClick={()=>setError(null)}>{t('ui.close')}</button></div>}
    {requested&&<>{query.isLoading?<div className="space-y-3" role="status" aria-label={t('ui.loading')}><div className="skeleton"/><div className="skeleton"/></div>:query.isError?<div role="alert" className="notice notice-error mb-5">{statusOf(query.error)===401?t('admin.pinInvalidQueue'):t('admin.loadFailed')}<button className="ms-2 font-bold underline" onClick={()=>setAttempt(value=>value+1)}>{t('ui.retry')}</button></div>:<div className="space-y-7">
      <section><h2 className="text-xl font-extrabold">{t('admin.reports')} <span className="tag">{query.data?.unverifiedReports.length??0}</span></h2>{!query.data?.unverifiedReports.length?<div className="surface empty-state">{t('admin.reportsEmpty')}</div>:query.data.unverifiedReports.map(r=><article className="surface data-card mb-3" key={r.id}><div className="flex flex-wrap gap-2"><span className="tag">{label(r.city)} · <span dir="auto">{r.neighborhood}</span></span>{isDemoRecord(r)&&<span className="tag tag-gold">{t('ui.demoData')}</span>}</div><h3 dir="auto" className="text-start">{r.title||t('ui.communityReport')}</h3><p dir="auto" className="text-start">{r.description}</p><div className="action-row mt-4"><button className="action-primary" disabled={verify.isPending} onClick={()=>verify.mutate({id:r.id},{onSuccess:refresh,onError:fail('admin.verifyFailed')})}><Check size={16}/>{t('admin.verify')}</button><button className="action-secondary" onClick={()=>{setError(null);setDraftReport({id:r.id,title:r.title||'',city:r.city,neighborhood:r.neighborhood,description:r.description,requiredSkills:[],volunteerLimit:'8'});}}>{t('admin.propose')}</button></div>
        {draftReport?.id===r.id&&<form onSubmit={proposeProject} className="border-t border-[#e9eee5] mt-5 pt-5"><h4 className="font-extrabold text-[#244a30]">{t('admin.draft.title')}</h4><p className="field-hint">{t('admin.draft.hint')}</p><div className="field"><label htmlFor={`project-title-${r.id}`}>{t('admin.draft.projectTitle')}</label><input id={`project-title-${r.id}`} dir="auto" required maxLength={120} value={draftReport.title} onChange={e=>setDraftReport({...draftReport,title:e.target.value})}/></div><div className="field"><label htmlFor={`project-description-${r.id}`}>{t('admin.draft.projectDesc')}</label><textarea id={`project-description-${r.id}`} dir="auto" required value={draftReport.description} onChange={e=>setDraftReport({...draftReport,description:e.target.value})}/></div><div className="field"><label>{t('admin.draft.skills')}</label><div className="profile-skills">{SKILL_VALUES.map(skill=>{const on=draftReport.requiredSkills.includes(skill);return <button type="button" key={skill} aria-pressed={on} className={`skill-chip ${on?'selected':''}`} onClick={()=>setDraftReport({...draftReport,requiredSkills:on?draftReport.requiredSkills.filter(x=>x!==skill):[...draftReport.requiredSkills,skill]})}>{on&&<Check size={13} className="inline me-1"/>}{label(skill)}</button>;})}</div></div><div className="field"><label htmlFor={`project-limit-${r.id}`}>{t('admin.draft.limit')}</label><input id={`project-limit-${r.id}`} dir="ltr" required type="number" min="1" max="100" value={draftReport.volunteerLimit} onChange={e=>setDraftReport({...draftReport,volunteerLimit:e.target.value})}/></div><div className="action-row"><button className="action-primary" type="submit" disabled={createProject.isPending}>{createProject.isPending?t('admin.draft.submitting'):t('admin.draft.submit')}</button><button className="action-secondary" type="button" onClick={()=>setDraftReport(null)}>{t('ui.cancel')}</button></div></form>}</article>)}</section>
      <section><h2 className="text-xl font-extrabold">{t('admin.projects')} <span className="tag">{query.data?.pendingProjects.length??0}</span></h2>{!query.data?.pendingProjects.length?<div className="surface empty-state">{t('admin.projectsEmpty')}</div>:query.data.pendingProjects.map(p=><article className="surface data-card mb-3" key={p.id}><div className="flex flex-wrap justify-between gap-2"><span className="tag">{label(p.city)} · <span dir="auto">{p.neighborhood}</span></span><span className="flex gap-2">{isDemoRecord(p)&&<span className="tag tag-gold">{t('ui.demoData')}</span>}<span className="tag tag-gold">{p.isSafe?t('admin.safe'):t('admin.needsSafety')}</span></span></div><h3 dir="auto" className="text-start">{p.title}</h3><p dir="auto" className="text-start">{p.description}</p><div className="action-row mt-4"><button className="action-primary" disabled={status.isPending||!p.isSafe} onClick={()=>status.mutate({id:p.id,data:{status:'open'}},{onSuccess:refresh,onError:fail('admin.approveFailed')})}><ShieldCheck size={16}/>{t('admin.approve')}</button><button className="action-danger" disabled={status.isPending} onClick={()=>status.mutate({id:p.id,data:{status:'rejected'}},{onSuccess:refresh,onError:fail('admin.rejectFailed')})}><X size={16}/>{t('admin.reject')}</button></div></article>)}</section>
      <section><h2 className="text-xl font-extrabold">{t('admin.attendance')} <span className="tag">{query.data?.joinedMemberships.length??0}</span></h2>{!query.data?.joinedMemberships.length?<div className="surface empty-state">{t('admin.attendanceEmpty')}</div>:query.data.joinedMemberships.map(m=><article className="surface data-card mb-3" key={m.id}><h3 dir="auto" className="text-start">{m.projectTitle}</h3><p><span dir="auto">{m.userName}</span> · {label(m.city)} · {label(m.status)}{isDemoRecord(m)&&<> · <span className="tag tag-gold">{t('ui.demoData')}</span></>}</p>{m.status!=='confirmed'&&<button className="action-primary mt-3" disabled={confirm.isPending} onClick={()=>confirm.mutate({id:m.id},{onSuccess:refresh,onError:fail('admin.confirmFailed')})}><Check size={16}/>{t('admin.confirm')}</button>}</article>)}</section>
    </div>}</>}
  </PageFrame></PlatformShell>;
}
