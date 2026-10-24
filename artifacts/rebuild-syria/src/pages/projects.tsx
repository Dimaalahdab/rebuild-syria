import { Link } from 'wouter';
import { getGetProjectsQueryKey, useGetProjects, useGetReports } from '@workspace/api-client-react';
import { MapPin, Sprout, UsersRound } from 'lucide-react';
import { LoadState, PageFrame, PlatformShell } from '@/components/platform-shell';
import { canJoinProject, isSafeProject } from '@/lib/safety';
import { readDemoProfile } from '@/lib/demo-profile';
import { isDemoRecord } from '@/lib/demo';
import { useI18n, type TKey } from '@/i18n';
export default function ProjectsPage() {
  const { t, label, fmtDateTime } = useI18n();
  const profile=readDemoProfile();
  const demoUserId=profile?.id??'';
  const query=useGetProjects({
    request:{headers:{'X-Demo-User-Id':demoUserId}},
    query:{queryKey:[...getGetProjectsQueryKey(),demoUserId]},
  });
  const projects=query.data??[];
  const reports=useGetReports();
  const safe=projects.filter(isSafeProject);
  return <PlatformShell><PageFrame eyebrow={t('projects.eyebrow')} title={t('projects.title')} intro={t('projects.intro')}>
    <LoadState loading={query.isLoading} error={query.isError} retry={()=>void query.refetch()}>
      {!safe.length?<div className="surface empty-state"><strong>{t('projects.empty')}</strong><p>{t('projects.emptyBody')}</p></div>:<div className="list-grid">{safe.map(p=>{
        const photo=reports.data?.find(r=>r.id===p.reportId)?.photoUrl;
        return <article key={p.id} className="surface data-card">
          {photo?<img src={photo} alt={t('projects.photoAlt',{title:p.title})} className="photo-preview mb-4"/>:<div className="notice mb-4 flex items-center gap-2"><Sprout size={30}/><span>{t('projects.noPhoto')}</span></div>}
          <div className="flex justify-between gap-3"><span className="tag">{label(p.status)}</span>{isDemoRecord(p)&&<span className="tag tag-gold">{t('ui.demoData')}</span>}</div>
          <h2 dir="auto" className="text-start">{p.title}</h2><p dir="auto" className="text-start">{p.description}</p>
          <div className="data-meta"><span><MapPin size={14} className="inline me-1"/>{label(p.city)} · <span dir="auto">{p.neighborhood}</span></span><span><UsersRound size={14} className="inline me-1"/>{t('projects.participants',{joined:p.joinedCount,limit:p.volunteerLimit})}</span></div>
          {p.scheduledAt&&<p className="status-text mt-3" data-testid={`text-project-scheduled-${p.id}`}>{t('project.scheduled',{date:fmtDateTime(p.scheduledAt)})}</p>}{p.municipalityNote&&<p dir="auto" className="status-text mt-1 text-start">{t('project.note',{note:p.municipalityNote})}</p>}{p.applicationStatus&&<p className="mt-2"><span className={`st-badge st-${p.applicationStatus}`}>{t(('project.app.'+p.applicationStatus) as TKey)}</span></p>}<div className="profile-skills mt-4">{p.requiredSkills.map(s=><span className="tag" key={s}>{label(s)}</span>)}</div>
          <Link href={`/projects/${p.id}`} className="action-primary mt-4">{p.joinedByUser?t('projects.cta.joined'):canJoinProject(p)?t('projects.cta.join'):t('projects.cta.view')}</Link>
        </article>;
      })}</div>}
    </LoadState>
  </PageFrame></PlatformShell>;
}
