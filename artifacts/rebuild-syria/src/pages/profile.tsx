import { useState } from 'react';
import { useLocation } from 'wouter';
import { useCreateUser, useUpdateUser } from '@workspace/api-client-react';
import type { User } from '@workspace/api-client-react';
import { Check, UserRound } from 'lucide-react';
import { PageFrame, PlatformShell } from '@/components/platform-shell';
import { ArrowForward } from '@/components/i18n-ui';
import { readDemoProfile, saveDemoProfile } from '@/lib/demo-profile';
import { SKILL_VALUES } from '@/lib/skills';
import { cityOptions } from '@/i18n/cities';
import { useI18n, type TKey } from '@/i18n';

type Role = 'citizen'|'volunteer'|'organizer';
type Msg = { key: TKey } | { error: unknown } | null;
export default function ProfilePage() {
  const { t, label, errorMessage } = useI18n();
  const [, setLocation] = useLocation();
  const initial = readDemoProfile();
  const [name,setName] = useState(initial?.name ?? '');
  const [city,setCity] = useState(initial?.city ?? '');
  const [role,setRole] = useState<Role>(initial?.role ?? 'citizen');
  const [skills,setSkills] = useState<string[]>(initial?.skills ?? []);
  const [error,setError] = useState<Msg>(null);
  const create = useCreateUser();
  const update = useUpdateUser();
  const busy = create.isPending || update.isPending;
  function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (!name.trim() || !city.trim()) { setError({key:'profile.required'}); return; }
    const onDone = (user: User) => { saveDemoProfile(user); setLocation('/account'); };
    const onFail = (err: unknown) => setError({error:err});
    if (initial?.id) update.mutate({id:initial.id,data:{name:name.trim(),city:city.trim(),role,skills}}, {onSuccess:onDone,onError:onFail});
    else create.mutate({data:{name:name.trim(),city:city.trim(),role,skills}}, {onSuccess:onDone,onError:onFail});
  }
  const errText = error ? ('key' in error ? t(error.key) : errorMessage(error.error,'profile.saveFailed')) : '';
  return <PlatformShell><PageFrame eyebrow={t('profile.eyebrow')} title={initial ? t('profile.titleEdit') : t('profile.titleNew')} intro={t('profile.intro')}><form onSubmit={submit} className="surface form-surface">
    <div className="flex items-center gap-3 mb-6"><span className="brand-mark"><UserRound/></span><div><b className="text-[#244a30]">{initial ? t('profile.savedLocal') : t('profile.newDemo')}</b><div className="status-text">{t('profile.noEmail')}</div></div></div>
    <div className="field"><label htmlFor="profile-name">{t('profile.name')}</label><input id="profile-name" dir="auto" value={name} maxLength={80} onChange={e=>setName(e.target.value)} required placeholder={t('profile.namePlaceholder')}/></div>
    <div className="field"><label htmlFor="profile-city">{t('profile.city')}</label><select id="profile-city" value={city} onChange={e=>setCity(e.target.value)} required><option value="">{t('ui.cityPlaceholder')}</option>{cityOptions(initial?.city).map(c=><option key={c} value={c}>{label(c)}</option>)}</select></div>
    <div className="field"><label htmlFor="profile-role">{t('profile.role')}</label><select id="profile-role" value={role} onChange={e=>setRole(e.target.value as Role)}>{(['citizen','volunteer','organizer'] as const).map(r=><option key={r} value={r}>{label(r)}</option>)}</select></div>
    <div className="field"><label>{t('profile.skills')} <span className="field-hint">{t('profile.skillsHint')}</span></label><div className="profile-skills">{SKILL_VALUES.map(skill=><button type="button" key={skill} aria-pressed={skills.includes(skill)} onClick={()=>setSkills(s=>s.includes(skill)?s.filter(x=>x!==skill):[...s,skill])} className={`skill-chip ${skills.includes(skill)?'selected':''}`}>{skills.includes(skill)&&<Check size={13} className="inline me-1"/>}{label(skill)}</button>)}</div></div>
    {errText&&<div role="alert" className="notice notice-error mb-4">{errText}</div>}
    <div className="action-row"><button className="action-primary" disabled={busy} type="submit">{busy?t('profile.saving'):t('profile.save')} <ArrowForward size={16}/></button></div>
  </form></PageFrame></PlatformShell>;
}
