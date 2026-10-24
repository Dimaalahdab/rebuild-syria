import { Sparkles, UserCheck } from 'lucide-react';
import { useI18n } from '@/i18n';

export function AiLabel({ className = '' }: { className?: string }) {
  const { t } = useI18n();
  return <span className={`ai-label ${className}`} data-testid="label-ai-suggestion"><Sparkles size={11} aria-hidden="true" />{t('ai.label')}</span>;
}
export function HumanLabel({ className = '' }: { className?: string }) {
  const { t } = useI18n();
  return <span className={`human-label ${className}`} data-testid="label-human-decision"><UserCheck size={11} aria-hidden="true" />{t('ai.human')}</span>;
}
