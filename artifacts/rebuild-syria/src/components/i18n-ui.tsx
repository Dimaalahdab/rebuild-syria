import { ArrowLeft, ArrowRight, ArrowUpLeft, ArrowUpRight } from 'lucide-react';
import { useI18n } from '@/i18n';

type IconProps = { size?: number; className?: string };

/** Points toward the reading direction's end (left in RTL, right in LTR). */
export function ArrowForward(props: IconProps) {
  const { isRtl } = useI18n();
  return isRtl ? <ArrowLeft aria-hidden="true" {...props} /> : <ArrowRight aria-hidden="true" {...props} />;
}
/** Points toward the reading direction's start (right in RTL, left in LTR). */
export function ArrowBack(props: IconProps) {
  const { isRtl } = useI18n();
  return isRtl ? <ArrowRight aria-hidden="true" {...props} /> : <ArrowLeft aria-hidden="true" {...props} />;
}
export function ArrowOutward(props: IconProps) {
  const { isRtl } = useI18n();
  return isRtl ? <ArrowUpLeft aria-hidden="true" {...props} /> : <ArrowUpRight aria-hidden="true" {...props} />;
}

/** Two-button language switch: عربي / English. */
export function LanguageToggle({ className = '' }: { className?: string }) {
  const { language, setLanguage, t } = useI18n();
  const item = (code: 'ar' | 'en', text: string, aria: string) => (
    <button type="button" lang={code} aria-pressed={language === code} aria-label={aria} onClick={() => setLanguage(code)}
      data-testid={`button-lang-${code}`} className={`lang-btn ${language === code ? 'on' : ''}`}>{text}</button>
  );
  return <div role="group" aria-label={t('lang.groupAria')} className={`lang-toggle ${className}`}>
    {item('ar', t('lang.ar'), t('lang.switchToAr'))}
    {item('en', t('lang.en'), t('lang.switchToEn'))}
  </div>;
}
