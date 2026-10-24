import {
  Activity,
  ArrowLeft,
  ArrowUpLeft,
  BookOpen,
  CheckCircle2,
  CircleUserRound,
  Droplets,
  HardHat,
  HeartHandshake,
  MapPin,
  MessageSquareWarning,
  Trees,
  UsersRound,
  Wrench,
} from 'lucide-react';
import { getUser, useCreateUser, useGetApiHealth, useHealthCheck } from '@workspace/api-client-react';
import { Link, useLocation } from 'wouter';
import { useState } from 'react';
import { readDemoProfile, saveDemoProfile } from '@/lib/demo-profile';

const issues = [
  {
    title: 'إنارة شارع بحاجة إلى صيانة',
    description: 'عمودا إنارة لا يعملان قرب المدرسة، ما يجعل الطريق معتماً مساءً.',
    location: 'حمص · حي الإنشاءات',
    category: 'إنارة',
    icon: Activity,
    status: 'قيد المتابعة',
  },
  {
    title: 'تسرّب مياه في طريق الحديقة',
    description: 'مياه تتجمع قرب الرصيف وتحتاج إلى كشف ومعالجة.',
    location: 'دمشق · المزة',
    category: 'مياه',
    icon: Droplets,
    status: 'وصلت للجهة المعنية',
  },
  {
    title: 'رصيف يحتاج إلى إصلاح',
    description: 'بلاط مكسور يعيق مرور كبار السن والعائلات في الشارع الرئيسي.',
    location: 'حلب · الجميلية',
    category: 'طرق',
    icon: Wrench,
    status: 'بلاغ جديد',
  },
];

const projects = [
  {
    title: 'مساحة خضراء لكل حي',
    description: 'نعيد الحياة إلى الساحة الصغيرة بزراعة محلية وعناية جماعية.',
    city: 'اللاذقية · مشروع مجتمعي',
    category: 'تشجير',
    volunteers: '١٨ متطوعاً',
    progress: 62,
    color: 'green',
  },
  {
    title: 'مدرستنا أجمل',
    description: 'يوم تطوعي لترميم المقاعد وتهيئة باحة المدرسة للطلاب.',
    city: 'ريف دمشق · مشروع مجتمعي',
    category: 'ترميم',
    volunteers: '١٢ متطوعاً',
    progress: 38,
    color: 'gold',
  },
];

function CityIllustration() {
  return (
    <div className="hero-art" aria-hidden="true">
      <svg viewBox="0 0 650 470" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M11 421H648" stroke="#CDE4CB" strokeOpacity=".32" strokeWidth="2" />
        <path d="M40 421V284H117V421M127 421V244H215V421M225 421V303H290V421M300 421V211H382V421M393 421V275H459V421M471 421V239H544V421M554 421V313H626V421" fill="#0C4828" fillOpacity=".68" stroke="#CDE4CB" strokeOpacity=".56" strokeWidth="2" />
        <path d="M128 244L170 210L215 244M301 211L341 175L382 211M472 239L508 211L544 239" stroke="#D8ECD3" strokeOpacity=".8" strokeWidth="2" />
        <path d="M50 306H108M50 330H108M50 354H108M139 267H204M139 292H204M139 317H204M312 236H371M312 261H371M312 286H371M483 266H532M483 291H532M483 316H532" stroke="#C6E4C4" strokeOpacity=".4" strokeWidth="3" />
        <path d="M164 421V359C164 348 173 339 184 339C195 339 204 348 204 359V421M333 421V337C333 324 343 314 356 314C369 314 379 324 379 337V421M497 421V359C497 347 507 337 519 337C531 337 541 347 541 359V421" fill="#F4B942" fillOpacity=".68" />
        <path d="M27 421C61 396 84 393 112 421M425 421C448 395 468 391 491 421M569 421C593 397 616 397 644 421" stroke="#A7D7B5" strokeWidth="3" strokeLinecap="round" />
        <path d="M60 217C65 206 78 200 91 203C95 190 110 183 123 189C133 194 139 205 136 217H60Z" fill="#DCEFD9" fillOpacity=".72" />
        <path d="M422 135C426 123 439 117 451 120C455 107 470 100 483 106C493 110 498 121 496 135H422Z" fill="#DCEFD9" fillOpacity=".68" />
        <circle cx="450" cy="73" r="30" fill="#F4B942" fillOpacity=".94" />
        <circle cx="450" cy="73" r="44" stroke="#F4B942" strokeOpacity=".22" strokeWidth="2" />
        <path d="M91 421V403M81 403H101M80 385V403M70 385H90M558 421V393M547 393H569M549 373V393M538 373H560" stroke="#B6D9B7" strokeWidth="3" strokeLinecap="round" />
        <path d="M245 131C258 112 280 106 300 116C311 92 337 81 361 91C381 100 389 120 384 139H245V131Z" fill="#DCEFD9" fillOpacity=".6" />
        <path d="M0 423C94 414 185 428 279 419C392 408 510 420 650 411" stroke="#F4B942" strokeOpacity=".72" strokeWidth="3" />
      </svg>
    </div>
  );
}

function Landscape({ color }: { color: string }) {
  return (
    <svg className="project-landscape" viewBox="0 0 600 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <path d="M0 160C120 105 216 141 300 116C399 85 466 98 600 60V220H0V160Z" fill={color === 'gold' ? '#B6CE9B' : '#83B996'} />
      <path d="M0 181C120 145 203 170 313 141C427 112 512 138 600 108V220H0V181Z" fill="#6FAD83" />
      <path d="M63 158V84M48 99L63 71L78 99M49 118L63 91L77 118M442 133V61M427 80L442 48L457 80M427 101L442 71L457 101" stroke="#296A3B" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M95 220C166 178 240 187 301 220M355 220C414 183 484 180 554 220" stroke="#F4B942" strokeOpacity=".75" strokeWidth="5" />
      <circle cx="520" cy="47" r="21" fill="#F4B942" fillOpacity=".8" />
      <path d="M0 0H600V220H0Z" fill="url(#mist)" />
      <defs>
        <linearGradient id="mist" x1="300" y1="0" x2="300" y2="220" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity=".18" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function Home() {
  const [, navigate] = useLocation();
  const createGuest = useCreateUser();
  const [guestPending, setGuestPending] = useState(false);
  const [guestError, setGuestError] = useState('');
  const health = useGetApiHealth();
  const healthCheck = useHealthCheck();
  const apiStatus = health.data?.status;
  const apiIsHealthy = apiStatus?.toLowerCase() === 'ok' || apiStatus?.toLowerCase() === 'healthy';

  async function tryAsGuest() {
    if (guestPending) return;
    setGuestPending(true);
    setGuestError('');
    try {
      const existing = readDemoProfile();
      if (existing) {
        try {
          const current = await getUser(existing.id);
          saveDemoProfile(current);
          navigate('/projects');
          return;
        } catch (error) {
          if ((error as { status?: number }).status !== 404) throw error;
        }
      }
      const user = await createGuest.mutateAsync({
        data: { name: 'زائر تجريبي', role: 'volunteer', city: 'دمشق', skills: ['Cleaning', 'Organization'] },
      });
      saveDemoProfile(user);
      navigate('/projects');
    } catch {
      setGuestError('تعذر بدء التجربة. تحقق من الاتصال وحاول مجدداً.');
    } finally {
      setGuestPending(false);
    }
  }

  return (
    <div className="app-shell" dir="rtl">
      <header className="container-wide topbar">
        <a href="#home" className="flex items-center gap-3 no-underline text-inherit" aria-label="إعادة بناء سوريا - الرئيسية" data-testid="link-brand-home">
          <span className="brand-mark"><Trees size={23} strokeWidth={2.3} /></span>
          <span className="leading-tight">
            <span className="block font-extrabold text-[1.05rem] text-[#183b25]">إعادة بناء سوريا</span>
            <span className="block text-[.68rem] text-[#718074]">بإيدينا، حارة حارة</span>
          </span>
        </a>
        <nav className="desktop-nav flex items-center gap-8" aria-label="التنقل الرئيسي">
          <a className="nav-link active no-underline" href="#home" data-testid="link-nav-home">الرئيسية</a>
          <a className="nav-link no-underline" href="#issues" data-testid="link-nav-issues">البلاغات</a>
          <a className="nav-link no-underline" href="#projects" data-testid="link-nav-projects">المشاريع</a>
          <a className="nav-link no-underline" href="#next-phase" data-testid="link-nav-about">عن المنصة</a>
        </nav>
          <Link href="/profile" className="desktop-join button-primary !min-h-[42px] !px-4 !text-sm no-underline" data-testid="link-nav-account">
          انضم للمجتمع <ArrowLeft size={16} />
          </Link>
      </header>

      <main className="container-wide page-enter">
        <section className="hero" id="home" aria-labelledby="hero-title">
          <CityIllustration />
          <div className="hero-copy">
            <span className="pill pill-demo"><span className="w-1.5 h-1.5 rounded-full bg-[#f4b942]" /> معاً، نبدأ من حارتنا</span>
            <h1 id="hero-title" className="hero-title">سوريا<br />بتتعمر فينا</h1>
            <p className="hero-subtitle">بلّغ عن مشكلة، شارك بالحل، وخلّي أثرك واضح</p>
            <div className="hero-actions mt-7 flex flex-wrap gap-3">
              <Link href="/report" className="button-primary no-underline" data-testid="link-report-issue">بلّغ عن مشكلة <ArrowLeft size={17} /></Link>
              <Link href="/projects" className="button-secondary no-underline" data-testid="link-discover-projects">اكتشف المشاريع <ArrowUpLeft size={17} /></Link>
            </div>
            <div className="mt-4">
              <button type="button" onClick={()=>void tryAsGuest()} disabled={guestPending}
                className="button-secondary disabled:opacity-60" data-testid="button-demo-guest">
                {guestPending?'جارٍ بدء التجربة…':'جرّب كزائر تجريبي'} <CircleUserRound size={17}/>
              </button>
              <p className="mt-2 text-xs text-white/80">ملف تجريبي على هذا الجهاز، دون نموذج أو تسجيل دخول. يُستخدم ملفك الحالي إن وُجد.</p>
              {guestError&&<p className="mt-2 text-sm text-[#ffe49a]" role="alert">{guestError}</p>}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <div className="health-pill" role="status" data-testid="status-api-health" aria-live="polite">
                <span className={`status-dot ${apiIsHealthy ? 'ok' : ''}`} />
                <span>حالة الخدمة:</span>
                {health.isLoading ? <span className="inline-block h-3 w-16 animate-pulse rounded bg-white/25" aria-label="جارٍ التحقق" /> :
                  health.isError ? <span className="text-[#ffe49a]">تعذّر الاتصال</span> :
                    <span>{apiStatus ?? 'حالة غير محددة'}</span>}
              </div>
              <span className="gemma-badge !bg-white/10 !border-white/20 !text-white/90">
                <span className="gemma-mark"><BookOpen size={13} /></span> مدعوم بـ Gemma 4
              </span>
            </div>
            {health.isError && (
              <button type="button" onClick={() => void health.refetch()} className="mt-2 text-xs font-bold text-white underline underline-offset-4" data-testid="button-retry-health">
                أعد التحقق من حالة الخدمة
              </button>
            )}
          </div>
        </section>

        <section className="section" aria-labelledby="impact-title">
          <div className="section-heading">
            <div>
              <div className="section-kicker">خطوات صغيرة، فرق ملموس</div>
              <h2 className="section-title" id="impact-title">أثر يبدأ من الجيران</h2>
            </div>
            <span className="demo-label">بيانات تجريبية</span>
          </div>
          <div className="impact-panel" data-testid="panel-impact">
            {[
              ['١٬٢٤٨', 'بلاغاً وصل من الأحياء'],
              ['٣٦', 'مشروعاً مجتمعياً'],
              ['٨٧٢', 'مشاركاً ومتطوعاً'],
              ['١٩', 'مدينة وبلدة'],
            ].map(([value, label], index) => (
              <div className="impact-item" key={label} data-testid={`stat-impact-${index}`}>
                <div className="mb-2"><span className="demo-label">بيانات تجريبية</span></div>
                <div className="impact-value" dir="rtl">{value}</div>
                <div className="impact-caption">{label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="section" id="issues" aria-labelledby="issues-title">
          <div className="section-heading">
            <div>
              <div className="section-kicker">من يوميات أحيائنا</div>
              <h2 className="section-title" id="issues-title">بلاغات وصلت من الجيران</h2>
            </div>
            <Link href="/reports" className="text-action no-underline" data-testid="link-all-issues">كل البلاغات <ArrowLeft size={16} /></Link>
          </div>
          <div className="issue-grid">
            {issues.map((issue, index) => {
              const Icon = issue.icon;
              return (
                <article className="issue-card" key={issue.title} data-testid={`card-issue-${index}`}>
                  <div className="issue-top">
                    <span className="issue-icon"><Icon size={20} /></span>
                    <span className="demo-label">بيانات تجريبية</span>
                  </div>
                  <h3>{issue.title}</h3>
                  <p>{issue.description}</p>
                  <div className="issue-meta">
                    <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {issue.location}</span>
                    <span>{issue.status}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="section" id="projects" aria-labelledby="projects-title">
          <div className="section-heading">
            <div>
              <div className="section-kicker">وقت نعملها سوا</div>
              <h2 className="section-title" id="projects-title">مشاريع قريبة منّا</h2>
            </div>
            <Link href="/projects" className="text-action no-underline" data-testid="link-all-projects">اكتشف المشاريع <ArrowLeft size={16} /></Link>
          </div>
          <div className="project-grid">
            {projects.map((project, index) => (
              <article className="project-card" key={project.title} data-testid={`card-project-${index}`}>
                <div className={`project-visual ${project.color === 'gold' ? 'gold' : 'blue'}`}>
                  <Landscape color={project.color} />
                  <span className="project-nameplate">{project.category} · {project.city.split(' · ')[0]}</span>
                </div>
                <div className="project-body">
                  <div className="flex items-start justify-between gap-3">
                    <h3>{project.title}</h3><span className="demo-label">بيانات تجريبية</span>
                  </div>
                  <p>{project.description}</p>
                  <div className="project-progress"><span>التقدم التجريبي</span><span>{project.progress}٪</span></div>
                  <div className="progress-track" aria-label={`التقدم ${project.progress} بالمئة`}><div className="progress-fill" style={{ width: `${project.progress}%` }} /></div>
                  <div className="project-foot">
                    <span className="volunteer-count"><UsersRound size={15} /> {project.volunteers} <span className="demo-label">بيانات تجريبية</span></span>
                    <Link className="text-action no-underline" href="/projects" data-testid={`link-project-details-${index}`}>التفاصيل <ArrowLeft size={15} /></Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="next-phase" id="next-phase" aria-labelledby="phase-title">
          <div>
            <h2 id="phase-title">خطوتنا التالية: مساحة أوسع للمشاركة</h2>
            <p>أنشئ ملفاً تجريبياً، أرسل بلاغاً جديداً، أو تصفح المشاريع الآمنة التي أعادتها الخدمة.</p>
          </div>
          <Link href="/profile" className="phase-note no-underline"><HeartHandshake size={17} /> ابدأ بملفك الشخصي <ArrowLeft size={15}/></Link>
        </section>

        <footer className="footer">
          <span className="flex items-center gap-2"><span className="brand-mark !w-8 !h-8 !rounded-[11px]"><Trees size={17} /></span> إعادة بناء سوريا · نبدأ من بعضنا</span>
          <span className="flex flex-wrap items-center gap-3">
            <span className="gemma-badge"><span className="gemma-mark"><BookOpen size={13} /></span> مدعوم بـ Gemma 4</span>
            <span className="flex items-center gap-1.5" data-testid="status-health-check">
              {healthCheck.isLoading ? <span>جارٍ فحص حالة الخادم…</span> : healthCheck.isError ? <span>فحص الخادم غير متاح</span> : <><CheckCircle2 size={14} /> حالة الخادم: {healthCheck.data?.status ?? 'غير محددة'}</>}
            </span>
          </span>
        </footer>
      </main>

      <nav className="mobile-nav" aria-label="التنقل على الهاتف">
        <Link href="/" className="active" data-testid="mobile-nav-home"><Trees size={19} /><span>الرئيسية</span></Link>
        <Link href="/report" className="report-nav" data-testid="mobile-nav-report"><MessageSquareWarning size={19} /><span>بلّغ</span></Link>
        <Link href="/projects" data-testid="mobile-nav-projects"><HardHat size={19} /><span>المشاريع</span></Link>
        <Link href="/account" data-testid="mobile-nav-account"><CircleUserRound size={19} /><span>حسابي</span></Link>
      </nav>
    </div>
  );
}

export default Home;
