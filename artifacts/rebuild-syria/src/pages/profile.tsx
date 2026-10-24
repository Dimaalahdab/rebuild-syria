import { useState } from 'react';
import { useLocation } from 'wouter';
import { useCreateUser, useUpdateUser } from '@workspace/api-client-react';
import { ArrowRight, Check, UserRound } from 'lucide-react';
import { PageFrame, PlatformShell } from '@/components/platform-shell';
import { readDemoProfile, saveDemoProfile } from '@/lib/demo-profile';

const skillOptions = [
  ['Cleaning','التنظيف'], ['Painting','الدهان'], ['Gardening','الزراعة'],
  ['Organization','التنظيم'], ['Transportation','النقل'], ['Engineering','الهندسة'],
  ['Electrical','الكهرباء'], ['Construction','البناء'], ['Photography','التصوير'],
  ['Design','التصميم'], ['Other','أخرى'],
] as const;
const roleLabels: Record<string,string> = { citizen:'مواطن/ة', volunteer:'متطوع/ة', organizer:'منظّم/ة' };
export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const initial = readDemoProfile();
  const [name,setName] = useState(initial?.name ?? '');
  const [city,setCity] = useState(initial?.city ?? '');
  const [role,setRole] = useState<'citizen'|'volunteer'|'organizer'>(initial?.role ?? 'citizen');
  const [skills,setSkills] = useState<string[]>(initial?.skills ?? []);
  const [error,setError] = useState('');
  const create = useCreateUser();
  const update = useUpdateUser();
  const busy = create.isPending || update.isPending;
  function submit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    if (!name.trim() || !city.trim()) { setError('أدخل الاسم والمدينة للمتابعة.'); return; }
    const onDone = (user: typeof initial extends infer _ ? import('@workspace/api-client-react').User : never) => { saveDemoProfile(user); setLocation('/account'); };
    const onFail = (err: unknown) => setError(err instanceof Error ? err.message : 'تعذر حفظ الملف الشخصي. حاول مجدداً.');
    if (initial?.id) update.mutate({id:initial.id,data:{name:name.trim(),city:city.trim(),role,skills}}, {onSuccess:onDone,onError:onFail});
    else create.mutate({data:{name:name.trim(),city:city.trim(),role:role as 'citizen'|'volunteer'|'organizer',skills}}, {onSuccess:onDone,onError:onFail});
  }
  return <PlatformShell><PageFrame eyebrow="مساحتك المجتمعية" title={initial ? 'تعديل ملفك الشخصي' : 'ابدأ بملفك الشخصي'} intro="عرّف جيرانك بك وبالمهارات التي تحب مشاركتها."><form onSubmit={submit} className="surface form-surface">
    <div className="flex items-center gap-3 mb-6"><span className="brand-mark"><UserRound/></span><div><b className="text-[#244a30]">{initial ? 'ملف محفوظ على هذا الجهاز' : 'إنشاء هوية تجريبية'}</b><div className="status-text">لا يتطلب التسجيل بريداً أو كلمة مرور.</div></div></div>
    <div className="field"><label htmlFor="profile-name">الاسم</label><input id="profile-name" value={name} maxLength={80} onChange={e=>setName(e.target.value)} required placeholder="كيف يناديك الجيران؟"/></div>
    <div className="field"><label htmlFor="profile-city">المدينة أو البلدة</label><input id="profile-city" value={city} maxLength={100} onChange={e=>setCity(e.target.value)} required placeholder="مثال: حمص"/></div>
    <div className="field"><label htmlFor="profile-role">دورك في المجتمع</label><select id="profile-role" value={role} onChange={e=>setRole(e.target.value as 'citizen'|'volunteer'|'organizer')}><option value="citizen">مواطن/ة</option><option value="volunteer">متطوع/ة</option><option value="organizer">منظّم/ة</option></select></div>
    <div className="field"><label>مهاراتك <span className="field-hint">— اختر كل ما يناسبك</span></label><div className="profile-skills">{skillOptions.map(([skill,label])=><button type="button" key={skill} aria-pressed={skills.includes(skill)} onClick={()=>setSkills(s=>s.includes(skill)?s.filter(x=>x!==skill):[...s,skill])} className={`skill-chip ${skills.includes(skill)?'selected':''}`}>{skills.includes(skill)&&<Check size={13} className="inline ml-1"/>}{label}</button>)}</div></div>
    {error&&<div role="alert" className="notice notice-error mb-4">{error}</div>}
    <div className="action-row"><button className="action-primary" disabled={busy} type="submit">{busy?'جارٍ الحفظ…':'حفظ الملف الشخصي'} <ArrowRight size={16}/></button></div>
  </form></PageFrame></PlatformShell>;
}
