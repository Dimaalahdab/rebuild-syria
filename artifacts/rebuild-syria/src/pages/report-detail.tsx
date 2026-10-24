import { useParams, Link } from 'wouter';
import { useGetReport } from '@workspace/api-client-react';
import { MapPin } from 'lucide-react';
import { DemoLabel, LoadState, PageFrame, PlatformShell } from '@/components/platform-shell';
import { ArrowBack } from '@/components/i18n-ui';
import { useI18n } from '@/i18n';
import { isDemoRecord } from '@/lib/demo';
import { AiLabel } from '@/components/ai-label';
import { ReportStatusBadge } from '@/components/status-badge';
import { ReportOutcome } from '@/components/outcome-info';
export default function ReportDetailPage() {
  const { t, label, fmtDateTime } = useI18n();
  const params=useParams<{id:string}>(); const id=params.id||'';
  const query=useGetReport(id);
  const r=query.data;
  return <PlatformShell><PageFrame eyebrow={t('reportDetail.eyebrow')} title={r?.title||t('ui.neighborhoodReport')} intro={t('reportDetail.intro')}><LoadState loading={query.isLoading} error={query.isError} retry={()=>void query.refetch()}>{r&&<article className="surface form-surface"><Link href="/reports" className="text-action no-underline"><ArrowBack size={16}/> {t('reportDetail.back')}</Link>{r.photoUrl&&<img src={r.photoUrl} alt={t('ui.photoAlt')} className="photo-preview mt-5"/>}<div className="flex flex-wrap gap-2 mt-5"><span className="tag">{label(r.category||'')||t('ui.communityReport')}</span>{r.analysis&&r.category&&<AiLabel/>}<span className="tag tag-gold">{label(r.status)}</span>{isDemoRecord(r)&&<DemoLabel/>}</div><h2 dir="auto" className="text-2xl font-extrabold text-[#203b28] mt-4 text-start">{r.title||t('ui.communityReport')}{r.analysis&&r.title&&<> <AiLabel/></>}</h2><p dir="auto" className="leading-8 text-[#58685b] text-start">{r.description}</p><p className="text-[#718074]"><MapPin size={16} className="inline me-1"/>{label(r.city)} · <span dir="auto">{r.neighborhood}</span></p><p className="status-text">{t('reportDetail.sentAt',{date:fmtDateTime(r.createdAt)})}</p><div className="mt-3 flex items-center gap-2"><span className="status-text">{t('report.statusLine')}:</span><ReportStatusBadge status={r.status}/></div><ReportOutcome report={r} showEmpty/>{r.analysis&&<div className="analysis-box"><AiLabel/> <span dir="auto">{r.analysis.title}</span></div>}</article>}</LoadState></PageFrame></PlatformShell>;
}
