import type { Report } from '@workspace/api-client-react';
import { useI18n } from '@/i18n';
import { AiLabel } from '@/components/ai-label';

/** Everything Gemma produced for a report, always labelled as an AI suggestion. */
export function ReportAnalysisView({ report }: { report: Report }) {
  const { t, label } = useI18n();
  const a = report.analysis;
  const sep = t('ui.listSeparator');
  if (!a) return <div className="analysis-box" data-testid="analysis-none"><AiLabel /> <span className="ms-2">{t('dash.report.noAnalysis')}</span></div>;
  return <div className="analysis-box" data-testid="analysis-box">
    <div className="flex flex-wrap items-center gap-2"><AiLabel /><b dir="auto">{a.title}</b>{report.analysisModel && <span className="status-text" dir="ltr">{t('dash.report.model', { model: report.analysisModel })}</span>}</div>
    <p dir="auto" className="m-0 mt-2 text-start">{a.description}</p>
    <dl>
      <dt>{t('dash.report.category')}</dt><dd>{label(a.category)}</dd>
      <dt>{t('dash.report.priority')}</dt><dd><span className={`st-badge ${a.suggestedPriority === 'high' ? 'st-declined' : a.suggestedPriority === 'medium' ? 'st-pending' : ''}`}>{label(a.suggestedPriority)}</span></dd>
      <dt>{t('dash.report.flags')}</dt><dd dir="auto">{a.safetyFlags.length ? a.safetyFlags.join(sep) : t('dash.report.noFlags')}</dd>
      <dt>{t('dash.report.review')}</dt><dd>{a.requiresProfessionalReview || report.requiresProfessionalReview ? <b className="text-[#a2462b]">{t('dash.report.reviewYes')}</b> : t('dash.report.reviewNo')}</dd>
      <dt>{t('dash.report.actions')}</dt><dd dir="auto">{a.suggestedActions.join(sep) || t('ui.none')}</dd>
      <dt>{t('dash.report.skills')}</dt><dd>{a.requiredSkills.map(label).join(sep) || t('ui.none')}</dd>
      <dt>{t('dash.report.materials')}</dt><dd dir="auto">{a.suggestedMaterials.join(sep) || t('ui.none')}</dd>
    </dl>
  </div>;
}
