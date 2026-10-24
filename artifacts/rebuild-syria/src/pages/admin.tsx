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

export default function AdminPage() {
  const [pin, setPin] = useState('');
  const [requested, setRequested] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState('');
  const [draftReport, setDraftReport] = useState<{ id: string; title: string; city: string; neighborhood: string; description: string; requiredSkills: string; volunteerLimit: string } | null>(null);
  const qc = useQueryClient();
  const query = useGetAdminSummary({
    request: { headers: { 'X-Admin-Pin': pin } },
    query: { enabled: requested, queryKey: [...getGetAdminSummaryQueryKey(), attempt] },
  });
  const adminRequest = { headers: { 'X-Admin-Pin': pin } };
  const verify = useVerifyReport({ request: adminRequest });
  const createProject = useCreateProjectFromReport({ request: adminRequest });
  const status = useUpdateProjectStatus({ request: adminRequest });
  const confirm = useConfirmParticipation({ request: adminRequest });
  function submitPin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setRequested(true);
    setAttempt(value => value + 1);
  }
  function refresh() { void qc.invalidateQueries({ queryKey: getGetAdminSummaryQueryKey() }); }
  function explainError(value: unknown, fallback: string) {
    const e = value as { message?: string; status?: number };
    setError(e?.status === 401 ? 'رمز PIN غير صحيح أو لم يعد صالحاً. أدخله مجدداً.' : e?.message || fallback);
  }
  function proposeProject(e: React.FormEvent) {
    e.preventDefault();
    if (!draftReport) return;
    setError('');
    const data: ProjectInput = {
      title: draftReport.title.trim(),
      city: draftReport.city.trim(),
      neighborhood: draftReport.neighborhood.trim(),
      description: draftReport.description.trim(),
      requiredSkills: draftReport.requiredSkills.split(/[،,]/).map(skill => skill.trim()).filter(Boolean),
      volunteerLimit: Number(draftReport.volunteerLimit),
    };
    createProject.mutate({ id: draftReport.id, data }, {
      onSuccess: () => { setDraftReport(null); refresh(); },
      onError: e => explainError(e, 'تعذر اقتراح المشروع. قد يكون البلاغ غير آمن لإنشاء مشروع تطوعي.'),
    });
  }
  return <PlatformShell><PageFrame eyebrow="مساحة فريق الإدارة" title="طابور التحقق" intro="أدوات الإدارة ترسل PIN إلى الخادم في كل طلب محمي.">
    <form onSubmit={submitPin} className="surface form-surface mb-5">
      <div className="brand-mark mb-4"><KeyRound/></div>
      <h2 className="text-xl font-extrabold text-[#244a30]">دخول الإدارة</h2>
      <p className="status-text mb-5">أدخل PIN الإدارة. يتحقق الخادم من صلاحيته؛ لا يُحفظ الرمز خارج ذاكرة هذه الصفحة.</p>
      <div className="field"><label htmlFor="admin-pin">PIN الإدارة</label><input id="admin-pin" value={pin} onChange={e=>setPin(e.target.value)} inputMode="numeric" type="password" autoComplete="off" required/></div>
      <div className="action-row"><button className="action-primary" type="submit">تحميل طابور الإدارة</button>{requested&&<button className="action-secondary" type="button" onClick={()=>{setPin('');setRequested(false);setError('');}}>مسح PIN</button>}</div>
    </form>
    {error&&<div role="alert" className="notice notice-error mb-5">{error}<button className="mr-2 underline font-bold" onClick={()=>setError('')}>إغلاق</button></div>}
    {requested&&<>{query.isLoading?<div className="space-y-3"><div className="skeleton"/><div className="skeleton"/></div>:query.isError?<div className="notice notice-error mb-5">{(query.error as {status?:number})?.status===401?'رمز PIN غير صحيح أو لم يعد صالحاً. عدّل الرمز ثم أعد تحميل الطابور.':'تعذر تحميل طابور الإدارة.'}<button className="mr-2 font-bold underline" onClick={()=>{setAttempt(value=>value+1);void query.refetch();}}>إعادة المحاولة</button></div>:<div className="space-y-7">
      <section><h2 className="text-xl font-extrabold">بلاغات بانتظار التحقق <span className="tag">{query.data?.unverifiedReports.length??0}</span></h2>{!query.data?.unverifiedReports.length?<div className="surface empty-state">لا توجد بلاغات معلقة.</div>:query.data.unverifiedReports.map(r=><article className="surface data-card mb-3" key={r.id}><span className="tag">{r.city} · {r.neighborhood}</span><h3>{r.title||'بلاغ مجتمعي'}</h3><p>{r.description}</p><div className="action-row mt-4"><button className="action-primary" disabled={verify.isPending} onClick={()=>verify.mutate({id:r.id},{onSuccess:refresh,onError:e=>explainError(e,'تعذر توثيق البلاغ')})}><Check size={16}/>توثيق البلاغ</button><button className="action-secondary" onClick={()=>{setError('');setDraftReport({id:r.id,title:r.title||'',city:r.city,neighborhood:r.neighborhood,description:r.description,requiredSkills:'',volunteerLimit:'8'});}}>اقتراح مشروع من البلاغ</button></div>
        {draftReport?.id===r.id&&<form onSubmit={proposeProject} className="border-t border-[#e9eee5] mt-5 pt-5"><h4 className="font-extrabold text-[#244a30]">مسودة مشروع للمراجعة</h4><p className="field-hint">يقرر الخادم ما إذا كان البلاغ آمناً لإنشاء مشروع تطوعي. الطلب لا يفتح المشروع تلقائياً.</p><div className="field"><label htmlFor={`project-title-${r.id}`}>عنوان المشروع</label><input id={`project-title-${r.id}`} required maxLength={120} value={draftReport.title} onChange={e=>setDraftReport({...draftReport,title:e.target.value})}/></div><div className="field"><label htmlFor={`project-description-${r.id}`}>وصف المشروع</label><textarea id={`project-description-${r.id}`} required value={draftReport.description} onChange={e=>setDraftReport({...draftReport,description:e.target.value})}/></div><div className="field"><label htmlFor={`project-skills-${r.id}`}>المهارات المطلوبة</label><input id={`project-skills-${r.id}`} value={draftReport.requiredSkills} onChange={e=>setDraftReport({...draftReport,requiredSkills:e.target.value})} placeholder="الإسعافات الأولية، التنظيم"/></div><div className="field"><label htmlFor={`project-limit-${r.id}`}>عدد المتطوعين</label><input id={`project-limit-${r.id}`} required type="number" min="1" max="100" value={draftReport.volunteerLimit} onChange={e=>setDraftReport({...draftReport,volunteerLimit:e.target.value})}/></div><div className="action-row"><button className="action-primary" type="submit" disabled={createProject.isPending}>{createProject.isPending?'جارٍ إرسال المقترح…':'إرسال المشروع للمراجعة'}</button><button className="action-secondary" type="button" onClick={()=>setDraftReport(null)}>إلغاء</button></div></form>}</article>)}</section>
      <section><h2 className="text-xl font-extrabold">مشاريع بانتظار الاعتماد <span className="tag">{query.data?.pendingProjects.length??0}</span></h2>{!query.data?.pendingProjects.length?<div className="surface empty-state">لا توجد مشاريع معلقة.</div>:query.data.pendingProjects.map(p=><article className="surface data-card mb-3" key={p.id}><div className="flex justify-between"><span className="tag">{p.city} · {p.neighborhood}</span><span className="tag tag-gold">{p.isSafe?'مصنّف آمناً':'يتطلب مراجعة سلامة'}</span></div><h3>{p.title}</h3><p>{p.description}</p><div className="action-row mt-4"><button className="action-primary" disabled={status.isPending||!p.isSafe} onClick={()=>status.mutate({id:p.id,data:{status:'open'}},{onSuccess:refresh,onError:e=>explainError(e,'تعذر اعتماد المشروع')})}><ShieldCheck size={16}/>اعتماد وفتح</button><button className="action-danger" disabled={status.isPending} onClick={()=>status.mutate({id:p.id,data:{status:'rejected'}},{onSuccess:refresh,onError:e=>explainError(e,'تعذر رفض المشروع')})}><X size={16}/>رفض</button></div></article>)}</section>
      <section><h2 className="text-xl font-extrabold">تأكيد الحضور <span className="tag">{query.data?.joinedMemberships.length??0}</span></h2>{!query.data?.joinedMemberships.length?<div className="surface empty-state">لا توجد مشاركات بانتظار التأكيد.</div>:query.data.joinedMemberships.map(m=><article className="surface data-card mb-3" key={m.id}><h3>{m.projectTitle}</h3><p>{m.userName} · {m.city} · {m.status}</p>{m.status!=='confirmed'&&<button className="action-primary mt-3" disabled={confirm.isPending} onClick={()=>confirm.mutate({id:m.id},{onSuccess:refresh,onError:e=>explainError(e,'تعذر تأكيد المشاركة')})}><Check size={16}/>تأكيد الحضور</button>}</article>)}</section>
    </div>}</>}
  </PageFrame></PlatformShell>;
}
