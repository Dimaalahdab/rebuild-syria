import { Link } from 'wouter';
import { AlertCircle } from 'lucide-react';
import { PlatformShell } from '@/components/platform-shell';
import { useI18n } from '@/i18n';

export default function NotFound() {
  const { t } = useI18n();
  return <PlatformShell><main className="page-wrap"><div className="surface empty-state"><AlertCircle size={30} className="mx-auto text-[#a2462b]"/><strong>{t('notfound.title')}</strong><p>{t('notfound.body')}</p><Link href="/" className="action-primary mt-3">{t('notfound.home')}</Link></div></main></PlatformShell>;
}
