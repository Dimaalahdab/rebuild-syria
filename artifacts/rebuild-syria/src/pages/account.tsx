import { Link } from 'wouter';
import { getGetUserImpactQueryKey, getGetUserProjectsQueryKey, useGetUserImpact, useGetUserProjects } from '@workspace/api-client-react';
import { Award, CircleUserRound, MapPin, PencilLine, Sprout } from 'lucide-react';
import { DemoLabel, LoadState, PageFrame, PlatformShell } from '@/components/platform-shell';
import { LanguageToggle } from '@/components/i18n-ui';
import { readDemoProfile } from '@/lib/demo-profile';
import { useI18n } from '@/i18n';
import { isDemoRecord } from '@/lib/demo';
export default function AccountPage() {
  const { t, label, fmtNumber } = useI18n();
  const profile=readDemoProfile();
  const id=profile?.id??'';
  const impact=useGetUserImpact(id,{query:{enabled:!!id,queryKey:getGetUserImpactQueryKey(id)}});
  const projects=useGetUserProjects(id,{query:{enabled:!!id,queryKey:getGetUserProjectsQueryKey(id)}});
  const joined=projects.data??[];
  return <PlatformShell><PageFrame eyebrow={t('account.eyebrow')} title={t('account.title')} intro={t('account.intro')}>
    <div className="lang-toggle-mobile" data-testid="account-language"><LanguageToggle/></div>
    {!profile?<div className="surface empty-state"><CircleUserRound size={27} className="mx-auto text-[#4c8c59]"/><strong>{t('account.emptyTitle')}</strong><p>{t('account.emptyBody')}</p><Link href="/profile" className="action-primary mt-3">{t('account.create')}</Link></div>:<>
      <div className="surface form-surface mb-5"><div className="flex items-start justify-between gap-4"><div className="flex gap-4 items-center"><span className="brand-mark"><CircleUserRound/></span><div><h2 dir="auto" className="m-0 text-xl font-extrabold">{profile.name}</h2><div className="status-text mt-1"><MapPin size={14} className="inline me-1"/>{label(profile.city)} · {label(profile.role)}</div></div></div><Link href="/profile" className="action-secondary"><PencilLine size={15}/> {t('account.edit')}</Link></div><div className="profile-skills mt-5">{profile.skills.length?profile.skills.map(s=><span className="tag" key={s}>{label(s)}</span>):<span className="status-text">{t('account.noSkills')}</span>}</div><div className="notice mt-5">{t('account.localNotice')}</div></div>
      <LoadState loading={impact.isLoading} error={impact.isError} retry={()=>void impact.refetch()}><div className="impact-panel mb-5"><div className="impact-item"><div className="impact-value">{fmtNumber(impact.data?.points??0)}</div><div className="impact-caption">{t('account.points')}</div></div><div className="impact-item"><div className="impact-value">{fmtNumber(impact.data?.verifiedReports??0)}</div><div className="impact-caption">{t('account.verified')}</div></div><div className="impact-item"><div className="impact-value">{fmtNumber(impact.data?.joinedProjects??0)}</div><div className="impact-caption">{t('account.projects')}</div></div></div><div className="surface p-5 mb-5"><h2 className="flex items-center gap-2 text-lg font-extrabold m-0"><Award size={19} className="text-[#bd9335]"/> {t('account.badges')}</h2><div className="profile-skills mt-4">{(impact.data?.badges??[]).length?impact.data?.badges.map(b=><span key={b} className="tag tag-gold">{label(b)}</span>):<p className="status-text">{t('account.noBadges')}</p>}</div></div></LoadState>
      <section><h2 className="text-lg font-extrabold flex items-center gap-2"><Sprout size={19}/>{t('account.myProjects')}</h2><LoadState loading={projects.isLoading} error={projects.isError} retry={()=>void projects.refetch()}>{joined.length?joined.map(p=><Link key={p.id} href={`/projects/${p.id}`} className="surface data-card mb-3"><div className="flex gap-2 flex-wrap"><span className="tag">{label(p.status)}</span>{isDemoRecord(p)&&<DemoLabel/>}</div><h3 dir="auto" className="text-start">{p.title}</h3><p>{label(p.city)} · <span dir="auto">{p.neighborhood}</span></p></Link>):<div className="surface empty-state"><strong>{t('account.noProjects')}</strong><Link href="/projects" className="text-action no-underline">{t('account.browse')}</Link></div>}</LoadState></section>
    </>}</PageFrame></PlatformShell>;
}
