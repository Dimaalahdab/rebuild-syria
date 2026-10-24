import { Link, useLocation } from 'wouter';
import { CircleUserRound, FilePlus2, Home, ListChecks, Sprout, Trees } from 'lucide-react';
import { useI18n, type TKey } from '@/i18n';
import { LanguageToggle } from '@/components/i18n-ui';

const nav: { href: string; key: TKey; icon: typeof Home }[] = [
  { href: '/', key: 'nav.home', icon: Home },
  { href: '/reports', key: 'nav.issues', icon: ListChecks },
  { href: '/projects', key: 'nav.projects', icon: Sprout },
  { href: '/report', key: 'nav.report', icon: FilePlus2 },
  { href: '/account', key: 'nav.account', icon: CircleUserRound },
];

export function PlatformShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { t } = useI18n();
  return <div className="app-shell">
    <header className="site-header">
      <div className="container-wide topbar">
        <Link href="/" className="flex items-center gap-3 no-underline text-inherit">
          <span className="brand-mark"><Trees size={23}/></span>
          <span className="leading-tight brand-text"><b className="block text-[#183b25]">{t('brand.name')}</b><small className="text-[#718074]">{t('brand.tagline')}</small></span>
        </Link>
        <nav className="site-nav" aria-label={t('nav.main')}>{nav.map(({href,key}) => <Link key={href} href={href} className={location === href ? 'active' : ''}>{t(key)}</Link>)}<Link href="/profile" className={location === '/profile' ? 'active' : ''}>{t('nav.profile')}</Link><Link href="/admin" className={location === '/admin' ? 'active' : ''}>{t('nav.admin')}</Link></nav>
        <div className="topbar-actions"><LanguageToggle className="desktop-lang"/><Link href="/report" className="desktop-join button-primary !min-h-[42px] !px-4 !text-sm no-underline">{t('nav.addReport')} <FilePlus2 size={16}/></Link></div>
      </div>
    </header>
    {children}
    <nav className="mobile-bottom" aria-label={t('nav.mobile')}>{nav.map(({href,key,icon:Icon}) => <Link key={href} href={href} className={location === href ? 'active' : ''}><Icon size={18}/><span>{t(key)}</span></Link>)}</nav>
  </div>;
}

export function PageFrame({ eyebrow, title, intro, children }: { eyebrow?: string; title: string; intro?: string; children: React.ReactNode }) {
  return <main className="page-wrap page-enter"><div className="page-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1 className="page-title">{title}</h1>{intro && <p className="page-intro">{intro}</p>}</div></div>{children}</main>;
}

export function LoadState({ loading, error, retry, children }: { loading: boolean; error?: boolean; retry?: () => void; children: React.ReactNode }) {
  const { t } = useI18n();
  if (loading) return <div className="space-y-3" role="status" aria-label={t('ui.loading')}><div className="skeleton"/><div className="skeleton"/><div className="skeleton"/></div>;
  if (error) return <div className="surface empty-state"><strong>{t('ui.loadError.title')}</strong><p>{t('ui.loadError.body')}</p>{retry && <button className="action-secondary mt-3" onClick={retry}>{t('ui.retry')}</button>}</div>;
  return <>{children}</>;
}

export function DemoLabel() {
  const { t } = useI18n();
  return <span className="tag tag-gold">{t('ui.demoData')}</span>;
}

export function DemoProfileNotice() {
  const { t } = useI18n();
  return <div className="notice notice-green mb-5">{t('ui.demoProfileNotice')}</div>;
}
