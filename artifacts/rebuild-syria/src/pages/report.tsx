import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useAnalyzeIssue, useCreateReport, getGetReportsQueryKey } from '@workspace/api-client-react';
import { AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import { PageFrame, PlatformShell } from '@/components/platform-shell';
import { readDemoProfile } from '@/lib/demo-profile';
import { useCity } from '@/hooks/use-app-config';
import { AiLabel } from '@/components/ai-label';
import { useI18n, type TKey } from '@/i18n';

const maxBytes = 5 * 1024 * 1024;
const maxChars = 2000;
const isAllowed = (file: File) => ['image/jpeg','image/png','image/webp'].includes(file.type);
type Msg = { key: TKey } | { error: unknown; fallback: TKey } | null;
export default function ReportPage() {
  const { t, label, language, errorMessage, errorDetails, fmtNumber } = useI18n();
  const [,setLocation] = useLocation();
  const qc = useQueryClient();
  const profile = readDemoProfile();
  const { canonical: city, display: cityDisplay } = useCity();
  const [neighborhood,setNeighborhood] = useState('');
  const [description,setDescription] = useState('');
  const [photo,setPhoto] = useState<File|null>(null);
  const [photoError,setPhotoError] = useState<TKey|null>(null);
  const [message,setMessage] = useState<Msg>(null);
  const [analysisTitle,setAnalysisTitle] = useState('');
  const [analysisDescription,setAnalysisDescription] = useState('');
  const analysis = useAnalyzeIssue();
  const create = useCreateReport();
  const [analysisResult, setAnalysisResult] = useState<typeof analysis.data>();
  const analyzed = analysisResult?.analysis;
  const currentInput = useRef('');
  currentInput.current = JSON.stringify([language, city, neighborhood, description, photo?.name, photo?.size, photo?.lastModified]);
  const resetAnalysis = analysis.reset;
  const previewUrl = useMemo(() => photo ? URL.createObjectURL(photo) : undefined, [photo]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  // Inputs or UI language changed: any unsaved AI output is stale (it was generated in the previous language).
  useEffect(() => { resetAnalysis(); setAnalysisResult(undefined); setMessage(null); }, [photo, city, neighborhood, description, language, resetAnalysis]);
  useEffect(() => {
    setAnalysisTitle(analysisResult?.analysis.title ?? '');
    setAnalysisDescription(analysisResult?.analysis.description ?? '');
  }, [analysisResult]);
  function setFile(file?: File) {
    setPhotoError(null);
    if (!file) { setPhoto(null); return; }
    if (!isAllowed(file)) { setPhoto(null); setPhotoError('report.photoUnsupported'); return; }
    if (file.size > maxBytes) { setPhoto(null); setPhotoError('report.photoTooLarge'); return; }
    setPhoto(file);
  }
  function analyze() {
    setMessage(null);
    if (!photo || !city.trim() || !neighborhood.trim() || !description.trim()) { setMessage({key:'report.analyzeMissing'}); return; }
    const data = {image:photo,city,neighborhood,description,language};
    const requestedInput = currentInput.current;
    analysis.mutate({data}, {
      onSuccess:result=>{if(currentInput.current===requestedInput)setAnalysisResult(result);},
      onError:e=>{if(currentInput.current===requestedInput)setMessage({error:e,fallback:'report.analyzeFailedFallback'});}
    });
  }
  function save() {
    setMessage(null);
    const editedAnalysis = analyzed ? {
      ...analysisResult,
      analysis: {...analyzed, title: analysisTitle.trim(), description: analysisDescription.trim()},
    } : undefined;
    if (analyzed && (!analysisTitle.trim() || !analysisDescription.trim())) {
      setMessage({key:'report.analysisFieldsMissing'}); return;
    }
    const data = {authorId:profile?.id,city:city.trim(),neighborhood:neighborhood.trim(),description:analyzed?analysisDescription.trim():description.trim(),image:photo??undefined,analysisJson:editedAnalysis?JSON.stringify(editedAnalysis):undefined,language};
    create.mutate({data}, {
      onSuccess:report=>{void qc.invalidateQueries({queryKey:getGetReportsQueryKey()});setLocation(`/reports/${report.id}`);},
      onError:e=>setMessage({error:e,fallback:'report.saveFailed'})
    });
  }
  const msgText = message ? ('key' in message ? t(message.key) : errorMessage(message.error, message.fallback)) : '';
  const msgDetails = message && 'error' in message ? errorDetails(message.error) : '';
  const sep = t('ui.listSeparator');
  const analyzeFailDetails = analysis.isError ? errorDetails(analysis.error) : '';
  return <PlatformShell><PageFrame eyebrow={t('report.eyebrow')} title={t('report.title')} intro={t('report.intro')}>
    <div className="surface form-surface">
      <div className="notice mb-5">{t('report.safety')}</div>
      <div className="field"><label htmlFor="report-city">{t('report.city')}</label><input id="report-city" data-testid="input-report-city" value={cityDisplay} readOnly aria-readonly="true" className="!bg-[#f0f4ec]"/><span className="field-hint">{t('report.cityFixed')}</span></div>
      <div className="field"><label htmlFor="report-neighborhood">{t('report.neighborhood')}</label><input id="report-neighborhood" dir="auto" value={neighborhood} onChange={e=>setNeighborhood(e.target.value)} required placeholder={t('report.neighborhoodPlaceholder')}/></div>
      <div className="field"><label htmlFor="report-description">{t('report.description')}</label><textarea id="report-description" dir="auto" value={description} onChange={e=>setDescription(e.target.value)} required maxLength={maxChars} placeholder={t('report.descriptionPlaceholder')}/><span className="field-hint">{t('report.charCount',{n:fmtNumber(description.length),max:fmtNumber(maxChars)})}</span></div>
      <div className="field"><label htmlFor="report-photo">{t('report.photo')}</label><input id="report-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0])}/><span className="field-hint">{t('report.photoHint')}</span>{previewUrl&&<img className="photo-preview" alt={t('report.photoPreviewAlt')} src={previewUrl}/>}{photoError&&<span className="text-sm text-red-700" role="alert">{t(photoError)}</span>}</div>
      {message&&<div className="notice notice-error mb-4" role="alert">{msgText}{msgDetails&&<details className="mt-2"><summary>{t('ui.technicalDetails')}</summary><code dir="ltr" className="block text-start">{msgDetails}</code></details>}</div>}
      <div className="action-row mb-5"><button type="button" className="action-secondary" onClick={analyze} disabled={analysis.isPending||create.isPending||!photo}><Sparkles size={17}/>{analysis.isPending?t('report.analyzing'):t('report.analyze')}</button><button type="button" className="action-primary" onClick={save} disabled={create.isPending||analysis.isPending||!city.trim()||!neighborhood.trim()||!description.trim()}>{create.isPending?t('report.saving'):t('report.save')}</button></div>
      {analysis.isError&&<div className="notice notice-error mb-4">{t('report.analysisFailedNote')}{analyzeFailDetails&&<details className="mt-2"><summary>{t('ui.technicalDetails')}</summary><code dir="ltr" className="block text-start">{analyzeFailDetails}</code></details>}</div>}
      {analyzed&&<section className="mt-4 mb-5">
        <div className="field"><label htmlFor="analysis-title">{t('report.analysisTitleLabel')} <AiLabel/></label><input id="analysis-title" dir="auto" value={analysisTitle} onChange={e=>setAnalysisTitle(e.target.value)} maxLength={120}/></div>
        <div className="field"><label htmlFor="analysis-description">{t('report.analysisDescLabel')} <AiLabel/></label><textarea id="analysis-description" dir="auto" value={analysisDescription} onChange={e=>setAnalysisDescription(e.target.value)}/></div>
        <p><AiLabel/> <b>{t('report.skills')}</b> {analyzed.requiredSkills.map(label).join(sep) || t('ui.none')}</p>
        <p><b>{t('report.materials')}</b> <span dir="auto">{analyzed.suggestedMaterials.join(sep) || t('ui.none')}</span></p>
        <p><b>{t('report.review')}</b> {analyzed.requiresProfessionalReview ? t('report.reviewRequired') : t('report.reviewNotSpecified')}</p>
      </section>}
      {analyzed&&<section className="notice notice-green" aria-live="polite"><h2 className="m-0 mb-2 font-extrabold flex gap-2 items-center"><CheckCircle2 size={18}/> {t('report.prelim')} <AiLabel/></h2><p><b dir="auto">{analyzed.title}</b> · {label(analyzed.category)} · {t('report.priority',{priority:label(analyzed.suggestedPriority)})}</p><p dir="auto" className="text-start">{analyzed.description}</p>{analyzed.safetyFlags.length>0&&<p className="flex gap-2 items-start"><AlertTriangle size={17} className="shrink-0"/><span>{t('report.safetyFlags',{flags:analyzed.safetyFlags.join(sep)})}</span></p>}<p><b>{t('report.actions')}</b> <span dir="auto">{analyzed.suggestedActions.join(sep)||t('ui.none')}</span></p><div className="notice mt-3">{t('report.aiDisclaimer')}</div></section>}
    </div>
  </PageFrame></PlatformShell>;
}
