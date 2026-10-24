import { Link } from 'wouter';
import { getGetProjectsQueryKey, useGetProjects, useGetReports } from '@workspace/api-client-react';
import { MapPin, Sprout, UsersRound } from 'lucide-react';
import { LoadState, PageFrame, PlatformShell } from '@/components/platform-shell';
import { canJoinProject, isSafeProject } from '@/lib/safety';
import { readDemoProfile } from '@/lib/demo-profile';
import { arabicLabel } from '@/lib/labels';
export default function ProjectsPage() {
  const profile=readDemoProfile();
  const demoUserId=profile?.id??'';
  const query=useGetProjects({
    request:{headers:{'X-Demo-User-Id':demoUserId}},
    query:{queryKey:[...getGetProjectsQueryKey(),demoUserId]},
  });
  const projects=query.data??[];
  const reports=useGetReports();
  const safe=projects.filter(isSafeProject);
  return <PlatformShell><PageFrame eyebrow="عمل جماعي وآمن" title="مشاريع قريبة منّا" intro="مشاريع معتمدة للمشاركة المجتمعية. موافقة الإدارة لا تغني عن تقييم السلامة في الموقع.">
    <LoadState loading={query.isLoading} error={query.isError} retry={()=>void query.refetch()}>
      {!safe.length?<div className="surface empty-state"><strong>لا توجد مشاريع معتمدة الآن</strong><p>ستظهر المشاريع هنا بعد مراجعتها.</p></div>:<div className="list-grid">{safe.map(p=>{
        const photo=reports.data?.find(r=>r.id===p.reportId)?.photoUrl;
        return <article key={p.id} className="surface data-card">
          {photo?<img src={photo} alt={`صورة البلاغ المرتبط بـ ${p.title}`} className="photo-preview mb-4"/>:<div className="notice mb-4 flex items-center gap-2"><Sprout size={30}/><span>لم تُرفق صورة لهذا المشروع</span></div>}
          <div className="flex justify-between gap-3"><span className="tag">{arabicLabel(p.status)}</span>{p.id.startsWith('project-demo-')&&<span className="tag tag-gold">بيانات تجريبية</span>}</div>
          <h2>{p.title}</h2><p>{p.description}</p>
          <div className="data-meta"><span><MapPin size={14} className="inline ml-1"/>{p.city} · {p.neighborhood}</span><span><UsersRound size={14} className="inline ml-1"/>{p.joinedCount} / {p.volunteerLimit} مشارك</span></div>
          <div className="profile-skills mt-4">{p.requiredSkills.map(s=><span className="tag" key={s}>{arabicLabel(s)}</span>)}</div>
          <Link href={`/projects/${p.id}`} className="action-primary mt-4">{p.joinedByUser?'أنت منضم — التفاصيل':canJoinProject(p)?'انضم للمشروع':'عرض التفاصيل'}</Link>
        </article>;
      })}</div>}
    </LoadState>
  </PageFrame></PlatformShell>;
}
