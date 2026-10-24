import { Link } from 'wouter';
import { useGetReports } from '@workspace/api-client-react';
import { MapPin, Plus } from 'lucide-react';
import { LoadState, PageFrame, PlatformShell } from '@/components/platform-shell';
import { arabicLabel } from '@/lib/labels';

export default function ReportsPage() {
  const query = useGetReports();
  const reports = query.data ?? [];
  return <PlatformShell><PageFrame eyebrow="صوت الحي" title="بلاغات الجيران" intro="تابع البلاغات التي وصلت من الأحياء."><div className="action-row mb-5"><Link href="/report" className="action-primary"><Plus size={17}/> أضف بلاغاً</Link></div>
    <LoadState loading={query.isLoading} error={query.isError} retry={()=>void query.refetch()}>
      {!reports.length?<div className="surface empty-state"><strong>لا توجد بلاغات محفوظة بعد</strong><Link href="/report" className="action-primary mt-3">إنشاء بلاغ</Link></div>:<div className="list-grid">{reports.map(report=><Link href={`/reports/${report.id}`} key={report.id} className="surface data-card">
        {report.photoUrl&&<img src={report.photoUrl} alt="صورة البلاغ" className="photo-preview mb-4"/>}
        <div className="flex justify-between items-center gap-3"><span className="tag">{arabicLabel(report.category||'بلاغ مجتمعي')}</span><span className="status-text">{arabicLabel(report.status)}</span></div>
        {report.id.startsWith('report-demo-')&&<span className="tag tag-gold mt-3">بيانات تجريبية</span>}
        <h2>{report.title||report.description.slice(0,75)}</h2><p>{report.description}</p>
        <div className="data-meta"><span><MapPin size={14} className="inline ml-1"/>{report.city} · {report.neighborhood}</span><span>{new Date(report.createdAt).toLocaleDateString('ar-SY')}</span></div>
      </Link>)}</div>}
    </LoadState>
  </PageFrame></PlatformShell>;
}
