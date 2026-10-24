import { useLayoutEffect } from 'react';
import { useLocation } from 'wouter';
import { useI18n, type TKey } from '@/i18n';

export function PageMetadata() {
  const [path] = useLocation();
  const { t, language } = useI18n();
  useLayoutEffect(() => {
    const pages: Record<string, TKey> = {
      '/': 'nav.home', '/report': 'nav.report', '/reports': 'nav.issues',
      '/projects': 'nav.projects', '/profile': 'nav.profile',
      '/account': 'nav.account', '/admin': 'nav.admin',
    };
    const key = pages[path] ?? (path.startsWith('/reports/') ? 'meta.reportDetail'
      : path.startsWith('/projects/') ? 'meta.projectDetail' : 'notfound.title');
    const title = path === '/' ? t('brand.name') : `${t(key)} | ${t('brand.name')}`;
    const description = t('meta.description');
    document.title = title;
    for (const [attribute, name, content] of [
      ['name', 'description', description],
      ['property', 'og:title', title],
      ['property', 'og:description', description],
      ['property', 'og:locale', language === 'ar' ? 'ar_SY' : 'en_US'],
      ['name', 'twitter:title', title],
      ['name', 'twitter:description', description],
    ]) {
      let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.append(element);
      }
      element.content = content;
    }
  }, [path, t, language]);
  return null;
}
