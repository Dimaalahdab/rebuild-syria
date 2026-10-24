import { useParams, Link } from 'wouter';
import { useGetReport } from '@workspace/api-client-react';
import { ArrowRight, MapPin } from 'lucide-react';
import { LoadState, PageFrame, PlatformShell } from '@/components/platform-shell';
import { arabicLabel } from '@/lib/labels';
export default function ReportDetailPage() {
  const params=useParams<{id:string}>(); const id=params.id||'';
  const query=useGetReport(id);
  const raw=query.data;
  const r=raw?{...raw,status:arabicLabel(raw.status),category:arabicLabel(raw.category||'بلاغ مجتمعي')}:undefined;
  return <PlatformShell><PageFrame eyebrow="تفاصيل البلاغ" title={r?.title||'بلاغ من الحي'} intro="معلومات البلاغ كما وصلت من الخدمة."><LoadState loading={query.isLoading} error={query.isError} retry={()=>void query.refetch()}>{r&&<article className="surface form-surface"><Link href="/reports" className="text-action no-underline"><ArrowRight size={16}/> كل البلاغات</Link>{r.photoUrl&&<img src={r.photoUrl} alt="" className="photo-preview mt-5"/>}<div className="flex gap-2 mt-5"><span className="tag">{r.category||'بلاغ مجتمعي'}</span><span className="tag tag-gold">{r.status}</span></div><h2 className="text-2xl font-extrabold text-[#203b28] mt-4">{r.title||'بلاغ مجتمعي'}</h2><p className="leading-8 text-[#58685b]">{r.description}</p><p className="text-[#718074]"><MapPin size={16} className="inline ml-1"/>{r.city} · {r.neighborhood}</p><p className="status-text">أُرسل في {new Date(r.createdAt).toLocaleString('ar-SY')}</p></article>}</LoadState></PageFrame></PlatformShell>;
}
