import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useAnalyzeIssue, useCreateReport, getGetReportsQueryKey } from '@workspace/api-client-react';
import { AlertTriangle, CheckCircle2, ImagePlus, Sparkles } from 'lucide-react';
import { PageFrame, PlatformShell } from '@/components/platform-shell';
import { readDemoProfile } from '@/lib/demo-profile';

const maxBytes = 5 * 1024 * 1024;
const isAllowed = (file: File) => ['image/jpeg','image/png','image/webp'].includes(file.type);
export default function ReportPage() {
  const [,setLocation] = useLocation();
  const qc = useQueryClient();
  const profile = readDemoProfile();
  const [city,setCity] = useState(profile?.city ?? '');
  const [neighborhood,setNeighborhood] = useState('');
  const [description,setDescription] = useState('');
  const [photo,setPhoto] = useState<File|null>(null);
  const [photoError,setPhotoError] = useState('');
  const [message,setMessage] = useState('');
  const [analysisTitle,setAnalysisTitle] = useState('');
  const [analysisDescription,setAnalysisDescription] = useState('');
  const analysis = useAnalyzeIssue();
  const create = useCreateReport();
  const analyzed = analysis.data?.analysis;
  const resetAnalysis = analysis.reset;
  const previewUrl = useMemo(() => photo ? URL.createObjectURL(photo) : undefined, [photo]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => { resetAnalysis(); }, [photo, city, neighborhood, description, resetAnalysis]);
  useEffect(() => {
    setAnalysisTitle(analysis.data?.analysis.title ?? '');
    setAnalysisDescription(analysis.data?.analysis.description ?? '');
  }, [analysis.data]);
  function setFile(file?: File) {
    setPhotoError('');
    if (!file) { setPhoto(null); return; }
    if (!isAllowed(file)) { setPhoto(null); setPhotoError('صيغة الصورة غير مدعومة. ارفع JPEG أو PNG أو WebP.'); return; }
    if (file.size > maxBytes) { setPhoto(null); setPhotoError('حجم الصورة أكبر من ٥ ميغابايت.'); return; }
    setPhoto(file);
  }
  function analyze() {
    setMessage('');
    if (!photo || !city.trim() || !neighborhood.trim() || !description.trim()) { setMessage('أكمل المدينة والحي والوصف واختر صورة قبل التحليل.'); return; }
    analysis.mutate({data:{image:photo,city,neighborhood,description}}, {onError:e=>setMessage(e instanceof Error?e.message:'تعذر تحليل البلاغ. يمكنك حفظه دون تحليل.')});
  }
  function save() {
    setMessage('');
    const editedAnalysis = analyzed ? {
      ...analysis.data,
      analysis: {...analyzed, title: analysisTitle.trim(), description: analysisDescription.trim()},
    } : undefined;
    if (analyzed && (!analysisTitle.trim() || !analysisDescription.trim())) {
      setMessage('أكمل عنوان التحليل والوصف قبل الحفظ.'); return;
    }
    create.mutate({data:{authorId:profile?.id,city:city.trim(),neighborhood:neighborhood.trim(),description:analyzed?analysisDescription.trim():description.trim(),image:photo??undefined,analysisJson:editedAnalysis?JSON.stringify(editedAnalysis):undefined}}, {
      onSuccess:report=>{void qc.invalidateQueries({queryKey:getGetReportsQueryKey()});setLocation(`/reports/${report.id}`);},
      onError:e=>setMessage(e instanceof Error?e.message:'تعذر حفظ البلاغ. حاول مجدداً.')
    });
  }
  return <PlatformShell><PageFrame eyebrow="بلاغ من الحي" title="خلّينا نعرف شو عم يصير" intro="شارك التفاصيل ليسهل على الجيران والجهات المعنية فهم المشكلة ومتابعتها.">
    <div className="surface form-surface">
      <div className="notice mb-5">يرجى عدم الاقتراب من المواقع الخطرة أو تنفيذ أعمال صيانة بنفسك. البلاغات لا تُعدّ طلباً للطوارئ.</div>
      <div className="field"><label htmlFor="report-city">المدينة</label><input id="report-city" value={city} onChange={e=>setCity(e.target.value)} required maxLength={100} placeholder="مثال: حلب"/></div>
      <div className="field"><label htmlFor="report-neighborhood">الحي</label><input id="report-neighborhood" value={neighborhood} onChange={e=>setNeighborhood(e.target.value)} required placeholder="اسم الحي أو المنطقة"/></div>
      <div className="field"><label htmlFor="report-description">وصف المشكلة</label><textarea id="report-description" value={description} onChange={e=>setDescription(e.target.value)} required maxLength={2000} placeholder="ما الذي لاحظته؟ اذكر موقعاً تقريبياً وتفاصيل تساعد على الفهم."/><span className="field-hint">{description.length} / ٢٠٠٠ حرف</span></div>
      <div className="field"><label htmlFor="report-photo">صورة للمساعدة في فهم البلاغ</label><input id="report-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0])}/><span className="field-hint">JPEG أو PNG أو WebP، بحد أقصى ٥ ميغابايت.</span>{previewUrl&&<img className="photo-preview" alt="معاينة الصورة المرفقة" src={previewUrl}/ >}{photoError&&<span className="text-sm text-red-700" role="alert">{photoError}</span>}</div>
      {message&&<div className="notice notice-error mb-4" role="alert">{message}</div>}
      <div className="action-row mb-5"><button type="button" className="action-secondary" onClick={analyze} disabled={analysis.isPending||create.isPending||!photo}><Sparkles size={17}/>{analysis.isPending?'جارٍ التحليل…':'حلّل الصورة والوصف بـ Gemma'}</button><button type="button" className="action-primary" onClick={save} disabled={create.isPending||analysis.isPending||!city.trim()||!neighborhood.trim()||!description.trim()}>{create.isPending?'جارٍ الحفظ…':'حفظ البلاغ'}</button></div>
      {analysis.isError&&<div className="notice notice-error mb-4">لم ينجح تحليل Gemma. يمكنك حفظ البلاغ كما هو دون تحليل.</div>}
      {analyzed&&<section className="mt-4 mb-5">
        <div className="field"><label htmlFor="analysis-title">عنوان البلاغ المقترح — قابل للتعديل</label><input id="analysis-title" value={analysisTitle} onChange={e=>setAnalysisTitle(e.target.value)} maxLength={120}/></div>
        <div className="field"><label htmlFor="analysis-description">وصف التحليل — قابل للتعديل</label><textarea id="analysis-description" value={analysisDescription} onChange={e=>setAnalysisDescription(e.target.value)}/></div>
        <p><b>المهارات المقترحة:</b> {analyzed.requiredSkills.join('، ') || 'لا توجد'}</p>
        <p><b>المواد المقترحة:</b> {analyzed.suggestedMaterials.join('، ') || 'لا توجد'}</p>
        <p><b>مراجعة مهنية:</b> {analyzed.requiresProfessionalReview ? 'مطلوبة — لا تبدأ أي عمل ميداني' : 'لم يحدد النموذج حاجة واضحة؛ موافقة الإدارة مطلوبة دائماً'}</p>
      </section>}
      {analyzed&&<section className="notice notice-green" aria-live="polite"><h2 className="m-0 mb-2 font-extrabold flex gap-2 items-center"><CheckCircle2 size={18}/> قراءة مبدئية من Gemma</h2><p><b>{analyzed.title}</b> · {analyzed.category} · أولوية مقترحة: {analyzed.suggestedPriority}</p><p>{analyzed.description}</p>{analyzed.safetyFlags.length>0&&<p className="flex gap-2 items-start"><AlertTriangle size={17} className="shrink-0"/><span>تنبيهات السلامة: {analyzed.safetyFlags.join('، ')}</span></p>}<p><b>خطوات مقترحة:</b> {analyzed.suggestedActions.join('، ')||'لا توجد'}</p><div className="notice mt-3">تنبيه: هذا تحليل آلي أولي وقد يكون غير دقيق. لا يُعد تقييماً مهنياً أو إرشاداً للسلامة. لا تقترب من الأخطار ولا تنفّذ أعمالاً خطرة؛ اعتمد على الجهات المختصة.</div></section>}
    </div>
  </PageFrame></PlatformShell>;
}
