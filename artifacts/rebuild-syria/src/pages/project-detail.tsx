import { useState } from 'react';
import { useParams, Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { getGetProjectQueryKey, getGetProjectsQueryKey, getGetUserProjectsQueryKey, useGetProject, useJoinProject, useMatchVolunteers } from '@workspace/api-client-react';
import { ArrowRight, MapPin, SearchCheck, ShieldCheck, UsersRound } from 'lucide-react';
import { LoadState, PageFrame, PlatformShell } from '@/components/platform-shell';
import { readDemoProfile } from '@/lib/demo-profile';
import { canJoinProject } from '@/lib/safety';

type Recommendation = { userId:string; city:string; skills:string[]; reason:string };
export default function ProjectDetailPage() {
  const {id=''}=useParams<{id:string}>();
  const qc=useQueryClient();
  const profile=readDemoProfile();
  const demoUserId=profile?.id??'';
  const projectKey=[...getGetProjectQueryKey(id),demoUserId];
  const query=useGetProject(id,{
    request:{headers:{'X-Demo-User-Id':demoUserId}},
    query:{queryKey:projectKey},
  });
  const join=useJoinProject();
  const match=useMatchVolunteers();
  const [notice,setNotice]=useState('');
  const [matchError,setMatchError]=useState('');
  const [recommendations,setRecommendations]=useState<Recommendation[]|null>(null);
  const [matchingSource,setMatchingSource]=useState<'gemma'|'fallback'>();
  const project=query.data;
  const allowed=!!project&&canJoinProject(project);
  function joinProject() {
    setNotice('');
    if (!profile) {setNotice('أنشئ ملفك الشخصي أولاً. ستُستخدم هويتك التجريبية المحفوظة على هذا الجهاز.');return;}
    if (!project||!allowed||project.joinedByUser||project.joinedCount>=project.volunteerLimit) return;
    join.mutate({id,data:{userId:profile.id}},{onSuccess:()=>{setNotice('تم تسجيل انضمامك لهذا المشروع.');void qc.invalidateQueries({queryKey:projectKey});void qc.invalidateQueries({queryKey:[...getGetProjectsQueryKey(),demoUserId]});void qc.invalidateQueries({queryKey:getGetUserProjectsQueryKey(profile.id)});},onError:e=>{const text=e instanceof Error?e.message:'';setNotice(/duplicate|already|مسبق|منضم/i.test(text)?'أنت مسجل مسبقاً في هذا المشروع.':/full|limit|مكتمل|ممتلئ/i.test(text)?'اكتمل عدد المشاركين المتاح.':text||'تعذر الانضمام. حاول مجدداً.') }});
  }
  function requestRecommendations() {
    if (!project||!allowed) return;
    setMatchError('');
    match.mutate({data:{projectId:project.id}},{onSuccess:result=>{setRecommendations(result.recommendations);setMatchingSource(result.source);},onError:e=>setMatchError(e instanceof Error?e.message:'تعذر تحميل اقتراحات المتطوعين')});
  }
  return <PlatformShell><PageFrame eyebrow="مشروع مجتمعي" title={project?.title||'تفاصيل المشروع'} intro="راجع تفاصيل المهمة ومتطلبات السلامة قبل الانضمام."><LoadState loading={query.isLoading} error={query.isError} retry={()=>void query.refetch()}>{project&&<article className="surface form-surface"><Link href="/projects" className="text-action no-underline"><ArrowRight size={16}/> كل المشاريع</Link><div className="flex gap-2 mt-5">{allowed?<span className="tag">مفتوح وآمن</span>:<span className="tag tag-gold">{project.status}</span>}<span className="tag"><ShieldCheck size={14} className="ml-1"/>مراجعة السلامة</span></div><h2 className="text-2xl font-extrabold text-[#203b28] mt-4">{project.title}</h2><p className="leading-8 text-[#58685b]">{project.description}</p><p className="text-[#718074]"><MapPin size={16} className="inline ml-1"/>{project.city} · {project.neighborhood}</p><div className="data-meta"><span><UsersRound size={14} className="inline ml-1"/>{project.joinedCount} من {project.volunteerLimit} مشارك</span></div><div className="bar-track mt-3"><div className="bar-fill" style={{width:`${Math.min(100,project.joinedCount/project.volunteerLimit*100)}%`}}/></div><div className="profile-skills mt-5">{project.requiredSkills.map(s=><span key={s} className="tag">{s}</span>)}</div>
    {project.id.startsWith('project-demo-')&&<span className="tag tag-gold mt-4">بيانات تجريبية</span>}
    {matchingSource&&<div className="notice mt-4">{matchingSource==='fallback'?'ترتيب بديل بدون ذكاء اصطناعي':'ترشيحات Gemma — للمراجعة فقط'}</div>}
    {!allowed&&<div className="notice mt-5">هذا المشروع غير متاح للانضمام. المشاريع التي تتضمن أعمال طرق أو مبانٍ أو كهرباء أو مخاطر لا تُعرض كفرص تطوعية.</div>}
    {allowed&&<><div className="mt-6"><button className="action-primary" disabled={join.isPending||project.joinedByUser||project.joinedCount>=project.volunteerLimit} onClick={joinProject}>{join.isPending?'جارٍ التسجيل…':project.joinedByUser?'أنت منضم بالفعل':project.joinedCount>=project.volunteerLimit?'اكتمل العدد':'انضم للمشروع'}</button><p className="field-hint mt-2">الانضمام يستخدم ملفك التجريبي المحفوظ محلياً؛ لا توجد حسابات دخول فعلية في هذه النسخة.</p></div>
      <section className="mt-6 border-t border-[#e9eee5] pt-5"><h3 className="font-extrabold text-[#244a30]">ترشيحات للمراجعة</h3><p className="field-hint">الاقتراحات تساعد على التواصل فقط؛ لا تسجّل أو تضم أي متطوع تلقائياً.</p><button className="action-secondary mt-2" disabled={match.isPending} onClick={requestRecommendations}><SearchCheck size={16}/>{match.isPending?'جارٍ إعداد الترشيحات…':'اقتراح متطوعين مناسبين'}</button>{matchError&&<div role="alert" className="notice notice-error mt-3">{matchError}</div>}{recommendations&&<div className="mt-4 space-y-3">{recommendations.length?recommendations.map(person=><div key={person.userId} className="notice notice-green"><b>{person.userId}</b><span className="status-text"> · {person.city}</span><p className="m-0 mt-1">{person.reason}</p><div className="profile-skills mt-2">{person.skills.map(skill=><span className="tag" key={skill}>{skill}</span>)}</div></div>):<p className="status-text">لا توجد ترشيحات لهذا المشروع.</p>}</div>}</section></>}
    {notice&&<div role="status" className={`notice mt-4 ${notice.includes('تعذر')?'notice-error':'notice-green'}`}>{notice}{notice.includes('أنشئ')&&<Link href="/profile" className="mr-2 underline font-bold">إنشاء ملف</Link>}</div>}
  </article>}</LoadState></PageFrame></PlatformShell>;
}
