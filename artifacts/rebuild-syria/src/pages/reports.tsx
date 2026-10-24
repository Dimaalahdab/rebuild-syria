import { Link } from 'wouter';
import { useGetReports } from '@workspace/api-client-react';
import { MapPin, Plus } from 'lucide-react';
import { DemoLabel, LoadState, PageFrame, PlatformShell } from '@/components/platform-shell';
import { useI18n } from '@/i18n';
import { isDemoRecord } from '@/lib/demo';

export default function ReportsPage() {
  const { t, label, fmtDate } = useI18n();
  const query = useGetReports();
  const reports = query.data ?? [];
  return <PlatformShell><PageFrame eyebrow={t('reports.eyebrow')} title={t('reports.title')} intro={t('reports.intro')}><div className="action-row mb-5"><Link href="/report" className="action-primary"><Plus size={17}/> {t('nav.addReport')}</Link></div>
    <LoadState loading={query.isLoading} error={query.isError} retry={()=>void query.refetch()}>
      {!reports.length?<div className="surface empty-state"><strong>{t('reports.empty')}</strong><Link href="/report" className="action-primary mt-3">{t('reports.emptyCta')}</Link></div>:<div className="list-grid">{reports.map(report=><Link href={`/reports/${report.id}`} key={report.id} className="surface data-card">
        {report.photoUrl&&<img src={report.photoUrl} alt={t('ui.photoAlt')} className="photo-preview mb-4"/>}
        <div className="flex justify-between items-center gap-3"><span className="tag">{label(report.category||'')||t('ui.communityReport')}</span><span className="status-text">{label(report.status)}</span></div>
        {isDemoRecord(report)&&<span className="tag tag-gold mt-3">{t('ui.demoData')}</span>}
        <h2 dir="auto" className="text-start">{report.title||report.description.slice(0,75)}</h2><p dir="auto" className="text-start">{report.description}</p>
        <div className="data-meta"><span><MapPin size={14} className="inline me-1"/>{label(report.city)} · <span dir="auto">{report.neighborhood}</span></span><span>{fmtDate(report.createdAt)}</span></div>
      </Link>)}</div>}
    </LoadState>
  </PageFrame></PlatformShell>;
}
