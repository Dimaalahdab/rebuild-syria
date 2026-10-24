import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateMunicipalityData } from '@/lib/invalidate';
import { getGetProjectQueryKey, getGetProjectsQueryKey, getGetUserProjectsQueryKey, useGetProject, useJoinProject, useMatchVolunteers } from '@workspace/api-client-react';
import type { VolunteerRecommendation } from '@workspace/api-client-react';
import { MapPin, SearchCheck, ShieldCheck, UsersRound } from 'lucide-react';
import { LoadState, PageFrame, PlatformShell } from '@/components/platform-shell';
import { ArrowBack } from '@/components/i18n-ui';
import { AiLabel } from '@/components/ai-label';
import { readDemoProfile } from '@/lib/demo-profile';
import { canJoinProject } from '@/lib/safety';
import { isDemoRecord } from '@/lib/demo';
import { useI18n, type TKey } from '@/i18n';

type Notice = { key: TKey; tone: 'ok'|'err'|'warn' } | { error: unknown; tone: 'err' } | null;
export default function ProjectDetailPage() {
  const { t, label, language, errorMessage, errorDetails, fmtDateTime } = useI18n();
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
  const [notice,setNotice]=useState<Notice>(null);
  const [matchError,setMatchError]=useState<unknown>(null);
  const [recommendations,setRecommendations]=useState<VolunteerRecommendation[]|null>(null);
  const [matchingSource,setMatchingSource]=useState<'gemma'|'fallback'>();
  const resetMatch=match.reset;
  const currentRequest=useRef('');
  currentRequest.current=JSON.stringify([language,id]);
  // AI reasons are generated in one language: drop them when the UI language changes.
  useEffect(()=>{setRecommendations(null);setMatchingSource(undefined);setMatchError(null);resetMatch();},[language,id,resetMatch]);
  const project=query.data;
  const allowed=!!project&&canJoinProject(project);
  function joinProject() {
    setNotice(null);
    if (!profile) {setNotice({key:'project.needProfile',tone:'warn'});return;}
    if (!project||!allowed||project.joinedByUser||project.joinedCount>=project.volunteerLimit) return;
    join.mutate({id,data:{userId:profile.id}},{onSuccess:()=>{setNotice({key:'project.joinSuccess',tone:'ok'});void qc.invalidateQueries({queryKey:projectKey});void qc.invalidateQueries({queryKey:[...getGetProjectsQueryKey(),demoUserId]});void qc.invalidateQueries({queryKey:getGetUserProjectsQueryKey(profile.id)});void invalidateMunicipalityData(qc);},onError:e=>setNotice({error:e,tone:'err'})});
  }
  function requestRecommendations() {
    if (!project||!allowed) return;
    setMatchError(null);
    const data={projectId:project.id,language};
    const requestKey=currentRequest.current;
    match.mutate({data},{onSuccess:result=>{if(currentRequest.current!==requestKey)return;setRecommendations(result.recommendations);setMatchingSource(result.source);},onError:e=>{if(currentRequest.current===requestKey)setMatchError(e);}});
  }
  const noticeText=notice?('key' in notice?t(notice.key):errorMessage(notice.error,'project.joinFailed')):'';
  const details=matchError?errorDetails(matchError):'';
  return <PlatformShell><PageFrame eyebrow={t('project.eyebrow')} title={project?.title||t('project.titleFallback')} intro={t('project.intro')}><LoadState loading={query.isLoading} error={query.isError} retry={()=>void query.refetch()}>{project&&<article className="surface form-surface"><Link href="/projects" className="text-action no-underline"><ArrowBack size={16}/> {t('project.back')}</Link><div className="flex flex-wrap gap-2 mt-5">{allowed?<span className="tag">{t('project.openSafe')}</span>:<span className="tag tag-gold">{label(project.status)}</span>}<span className="tag"><ShieldCheck size={14} className="me-1"/>{t('project.safetyReview')}</span></div><h2 dir="auto" className="text-2xl font-extrabold text-[#203b28] mt-4 text-start">{project.title}</h2><p dir="auto" className="leading-8 text-[#58685b] text-start">{project.description}</p><p className="text-[#718074]"><MapPin size={16} className="inline me-1"/>{label(project.city)} · <span dir="auto">{project.neighborhood}</span></p>{project.scheduledAt&&<p className="font-bold text-[#23623a]" data-testid="text-project-scheduled">{t('project.scheduled',{date:fmtDateTime(project.scheduledAt)})}</p>}{project.municipalityNote&&<p dir="auto" className="text-start text-[#58685b]" data-testid="text-project-note">{t('project.note',{note:project.municipalityNote})}</p>}{project.applicationStatus&&<p><span className={`st-badge st-${project.applicationStatus}`} data-testid="badge-application-status">{t(('project.app.'+project.applicationStatus) as TKey)}</span></p>}<div className="data-meta"><span><UsersRound size={14} className="inline me-1"/>{t('project.participantsOf',{joined:project.joinedCount,limit:project.volunteerLimit})}</span></div><div className="bar-track mt-3"><div className="bar-fill" style={{width:`${Math.min(100,project.joinedCount/project.volunteerLimit*100)}%`}}/></div><div className="profile-skills mt-5">{project.requiredSkills.map(s=><span key={s} className="tag">{label(s)}</span>)}</div>
    {isDemoRecord(project)&&<span className="tag tag-gold mt-4">{t('ui.demoData')}</span>}
    {matchingSource&&<div className="notice mt-4">{matchingSource==='fallback'?t('project.matchFallback'):t('project.matchGemma')}</div>}
    {!allowed&&<div className="notice mt-5">{t('project.notJoinable')}</div>}
    {allowed&&<><div className="mt-6"><button className="action-primary" disabled={join.isPending||project.joinedByUser||project.joinedCount>=project.volunteerLimit} onClick={joinProject}>{join.isPending?t('project.joining'):project.joinedByUser?t('project.joinedAlready'):project.joinedCount>=project.volunteerLimit?t('project.full'):t('project.join')}</button><p className="field-hint mt-2">{t('project.joinHint')}</p></div>
      <section className="mt-6 border-t border-[#e9eee5] pt-5"><h3 className="font-extrabold text-[#244a30]">{t('project.match.title')}</h3><p className="field-hint">{t('project.match.hint')}</p><button className="action-secondary mt-2" disabled={match.isPending} onClick={requestRecommendations}><SearchCheck size={16}/>{match.isPending?t('project.match.loading'):t('project.match.button')}</button>{!!matchError&&<div role="alert" className="notice notice-error mt-3">{errorMessage(matchError,'project.match.failed')}{details&&<details className="mt-2"><summary>{t('ui.technicalDetails')}</summary><code dir="ltr" className="block text-start">{details}</code></details>}</div>}{recommendations&&<div className="mt-4 space-y-3">{recommendations.length?recommendations.map(person=><div key={person.userId} className="notice notice-green"><b dir="ltr">{person.userId}</b><span className="status-text"> · {label(person.city)}</span>{matchingSource === 'gemma' && <AiLabel/>}<p dir="auto" className="m-0 mt-1 text-start">{person.reason}</p><div className="profile-skills mt-2">{person.skills.map(skill=><span className="tag" key={skill}>{label(skill)}</span>)}</div></div>):<p className="status-text">{t('project.match.empty')}</p>}</div>}</section></>}
    {notice&&<div role="status" className={`notice mt-4 ${notice.tone==='ok'?'notice-green':notice.tone==='err'?'notice-error':''}`}>{noticeText}{'key' in notice&&notice.key==='project.needProfile'&&<Link href="/profile" className="ms-2 underline font-bold">{t('project.createProfile')}</Link>}</div>}
  </article>}</LoadState></PageFrame></PlatformShell>;
}
