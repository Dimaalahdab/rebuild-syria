import { Link, useLocation } from 'wouter';
import { CircleUserRound, FilePlus2, FolderHeart, Home, ListChecks, Sprout, Trees } from 'lucide-react';

const nav = [
  { href: '/', label: 'الرئيسية', icon: Home },
  { href: '/reports', label: 'البلاغات', icon: ListChecks },
  { href: '/projects', label: 'المشاريع', icon: Sprout },
  { href: '/report', label: 'بلّغ عن مشكلة', icon: FilePlus2 },
  { href: '/account', label: 'حسابي', icon: CircleUserRound },
];

export function PlatformShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  return <div className="app-shell" dir="rtl">
    <header className="site-header">
      <div className="container-wide topbar">
        <Link href="/" className="flex items-center gap-3 no-underline text-inherit">
          <span className="brand-mark"><Trees size={23}/></span>
          <span className="leading-tight"><b className="block text-[#183b25]">إعادة بناء سوريا</b><small className="text-[#718074]">بإيدينا، حارة حارة</small></span>
        </Link>
        <nav className="site-nav" aria-label="التنقل الرئيسي">{nav.map(({href,label}) => <Link key={href} href={href} className={location === href ? 'active' : ''}>{label}</Link>)}<Link href="/profile">الملف الشخصي</Link><Link href="/admin">الإدارة</Link></nav>
        <Link href="/report" className="desktop-join button-primary !min-h-[42px] !px-4 !text-sm no-underline">أضف بلاغاً <FilePlus2 size={16}/></Link>
      </div>
    </header>
    {children}
    <nav className="mobile-bottom" aria-label="التنقل على الهاتف">{nav.map(({href,label,icon:Icon}) => <Link key={href} href={href} className={location === href ? 'active' : ''}><Icon size={18}/><span>{label}</span></Link>)}</nav>
  </div>;
}

export function PageFrame({ eyebrow, title, intro, children }: { eyebrow?: string; title: string; intro?: string; children: React.ReactNode }) {
  return <main className="page-wrap page-enter"><div className="page-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1 className="page-title">{title}</h1>{intro && <p className="page-intro">{intro}</p>}</div></div>{children}</main>;
}

export function LoadState({ loading, error, retry, children }: { loading: boolean; error?: boolean; retry?: () => void; children: React.ReactNode }) {
  if (loading) return <div className="space-y-3" aria-label="جارٍ التحميل"><div className="skeleton"/><div className="skeleton"/><div className="skeleton"/></div>;
  if (error) return <div className="surface empty-state"><strong>لم نتمكن من تحميل البيانات</strong><p>تحقق من الاتصال ثم حاول مجدداً.</p>{retry && <button className="action-secondary mt-3" onClick={retry}>إعادة المحاولة</button>}</div>;
  return <>{children}</>;
}

export function DemoProfileNotice() {
  return <div className="notice notice-green mb-5">هذا ملف تجريبي محفوظ على هذا الجهاز. تُستخدم هويتك التجريبية عند الانضمام للمشاريع.</div>;
}
