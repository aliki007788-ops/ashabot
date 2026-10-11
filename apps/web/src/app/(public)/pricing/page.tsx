'use client';

import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

const PLANS = [
  {
    name: 'Free',
    slug: 'free',
    description: 'شروع رایگان برای تست پلتفرم',
    priceMonthly: 0,
    currency: 'تومان',
    color: '#6b7280',
    icon: '🌱',
    popular: false,
    cta: 'شروع رایگان',
    ctaHref: '/register?plan=free',
    features: [
      { text: '۱ ربات فعال', included: true },
      { text: '۱,۰۰۰ پیام در ماه', included: true },
      { text: '۱ کاربر', included: true },
      { text: '۱ کانال', included: true },
      { text: '۳ مغز پایه', included: true },
      { text: 'ربات‌های پرمیوم', included: false },
      { text: 'API دسترسی', included: false },
      { text: 'پشتیبانی اولویت‌دار', included: false },
    ],
  },
  {
    name: 'Pro',
    slug: 'pro',
    description: 'برای کسب‌وکارهای در حال رشد',
    priceMonthly: 490000,
    currency: 'تومان',
    color: '#6a8dff',
    icon: '🚀',
    popular: true,
    cta: 'انتخاب پلن Pro',
    ctaHref: '/register?plan=pro',
    features: [
      { text: '۱۰ ربات فعال', included: true },
      { text: '۵۰,۰۰۰ پیام در ماه', included: true },
      { text: '۵ کاربر', included: true },
      { text: '۵ کانال', included: true },
      { text: 'تمام مغزها', included: true },
      { text: 'ربات‌های پرمیوم (۱۳)', included: true },
      { text: 'API دسترسی', included: true },
      { text: 'پشتیبانی ایمیلی', included: true },
    ],
  },
  {
    name: 'Business',
    slug: 'business',
    description: 'برای تیم‌های حرفه‌ای',
    priceMonthly: 1490000,
    currency: 'تومان',
    color: '#b46eff',
    icon: '💎',
    popular: false,
    cta: 'انتخاب Business',
    ctaHref: '/register?plan=business',
    features: [
      { text: '۵۰ ربات فعال', included: true },
      { text: '۵۰۰,۰۰۰ پیام در ماه', included: true },
      { text: '۲۰ کاربر', included: true },
      { text: '۲۰ کانال', included: true },
      { text: 'تمام مغزها + مغز اختصاصی', included: true },
      { text: 'ربات‌های پرمیوم', included: true },
      { text: 'API اختصاصی', included: true },
      { text: 'پشتیبانی ۲۴/۷', included: true },
    ],
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    description: 'راه‌حل اختصاصی برای سازمان‌های بزرگ',
    priceMonthly: null,
    currency: 'تومان',
    color: '#f59e0b',
    icon: '🏢',
    popular: false,
    cta: 'تماس با فروش',
    ctaHref: '/contact?plan=enterprise',
    features: [
      { text: 'ربات‌های نامحدود', included: true },
      { text: 'پیام‌های نامحدود', included: true },
      { text: 'کاربران نامحدود', included: true },
      { text: 'کانال‌های نامحدود', included: true },
      { text: 'On-Premise', included: true },
      { text: 'SLA اختصاصی', included: true },
      { text: 'پشتیبانی اختصاصی', included: true },
      { text: 'آموزش تیم', included: true },
    ],
  },
];

const FAQ = [
  { q: 'می‌توانم پلن خود را در هر زمان تغییر دهم؟', a: 'بله، شما می‌توانید در هر زمان پلن خود را ارتقا دهید. تفاوت قیمت به صورت محاسبه شده دریافت می‌شود.' },
  { q: 'آیا پلن رایگان محدودیت زمانی دارد؟', a: 'خیر، پلن رایگان همیشه رایگان است. با این حال برای استفاده حرفه‌ای توصیه می‌شود پلن Pro یا Business انتخاب کنید.' },
  { q: 'آیا می‌توانم قبل از خرید تست کنم؟', a: 'بله! پلن Free برای تست کامل پلتفرم طراحی شده. می‌توانید بدون پرداخت هیچ هزینه‌ای شروع کنید.' },
  { q: 'روش‌های پرداخت چیست؟', a: 'پرداخت با کلیه کارت‌های شتاب (از طریق زرین‌پال) و همچنین برای مشتریان بین‌المللی Stripe پشتیبانی می‌شود.' },
  { q: 'آیا فاکتور رسمی صادر می‌کنید؟', a: 'بله، برای مشتریان Business و Enterprise فاکتور رسمی با مهر و امضا صادر می‌شود.' },
  { q: 'امکان بازگشت وجه وجود دارد؟', a: 'بله، تا ۷ روز اول پس از خرید، در صورت عدم رضایت، کل مبلغ بازگردانده می‌شود.' },
];

const NAV_ITEMS = [
  { href: '/#features', label: 'امکانات' },
  { href: '/pricing', label: 'قیمت‌گذاری' },
  { href: '/about', label: 'درباره' },
  { href: '/contact', label: 'تماس' },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen" dir="rtl">
      {/* ============ Navbar ============ */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md"
        style={{
          borderColor: 'var(--border)',
          background: 'var(--bg-overlay)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 md:gap-3 shrink-0">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6a8dff] to-[#b46eff] grid place-items-center font-black text-white">
              A
            </span>
            <span className="font-black text-lg text-[var(--text-primary)]">آشا</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`transition-colors ${
                  item.href === '/pricing'
                    ? 'text-[var(--text-primary)] font-bold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="hidden sm:block px-4 py-2 rounded-xl text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              ورود
            </Link>
            <Link
              href="/register"
              className="px-4 md:px-5 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-[#6a8dff] to-[#b46eff] hover:opacity-90 transition-opacity text-white whitespace-nowrap"
            >
              شروع رایگان
            </Link>
          </div>
        </div>
      </nav>

      {/* ============ Hero ============ */}
      <section className="relative pt-32 pb-12 md:pb-20 px-4 md:px-6 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-1/4 w-64 md:w-96 h-64 md:h-96 rounded-full bg-[#6a8dff]/20 blur-3xl" />
          <div className="absolute bottom-20 right-1/4 w-64 md:w-96 h-64 md:h-96 rounded-full bg-[#b46eff]/20 blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-full bg-[#6a8dff]/10 border border-[#6a8dff]/30 text-xs md:text-sm text-[#6a8dff] mb-6">
            <span>✨</span>
            <span>پلن‌های آشا</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight text-[var(--text-primary)]">
            قیمت‌گذاری{' '}
            <span className="bg-gradient-to-r from-[#6a8dff] to-[#b46eff] bg-clip-text text-transparent">
              شفاف و منصفانه
            </span>
          </h1>

          <p className="text-[var(--text-secondary)] text-sm md:text-lg max-w-2xl mx-auto mb-4 leading-relaxed">
            پلنی که متناسب با کسب‌وکار شماست انتخاب کنید. تمام پلن‌ها شامل ۳۰ روز تست رایگان هستند — بدون نیاز به کارت اعتباری.
          </p>

          <p className="text-xs md:text-sm text-[var(--text-tertiary)]">
            هر زمان می‌توانید ارتقا دهید. تفاوت قیمت محاسبه می‌شود.
          </p>
        </div>
      </section>

      {/* ============ Pricing Cards ============ */}
      <section className="px-4 md:px-6 pb-16 md:pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {PLANS.map((plan) => (
              <PricingCard key={plan.slug} plan={plan} />
            ))}
          </div>
        </div>
      </section>

      {/* ============ Feature Comparison ============ */}
      <section className="px-4 md:px-6 pb-16 md:pb-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black text-center mb-8 md:mb-12 text-[var(--text-primary)]">
            مقایسه دقیق پلن‌ها
          </h2>

          <div className="overflow-x-auto rounded-3xl border bg-[var(--bg-tertiary)]" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                  <th className="text-right p-3 md:p-4 font-bold text-[var(--text-secondary)]">ویژگی</th>
                  {PLANS.map((p) => (
                    <th
                      key={p.slug}
                      className="text-center p-3 md:p-4 font-bold min-w-[100px] md:min-w-[120px]"
                      style={{ color: p.color }}
                    >
                      {p.icon} {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'ربات‌های فعال', values: ['1', '10', '50', 'نامحدود'] },
                  { label: 'پیام در ماه', values: ['1,000', '50,000', '500,000', 'نامحدود'] },
                  { label: 'کاربران', values: ['1', '5', '20', 'نامحدود'] },
                  { label: 'کانال‌ها', values: ['1', '5', '20', 'نامحدود'] },
                  { label: 'مغزهای تخصصی', values: ['3', 'همه', 'همه + اختصاصی', 'همه + اختصاصی'] },
                  { label: 'ربات‌های پرمیوم', values: ['—', '✓', '✓', '✓'] },
                  { label: 'دسترسی API', values: ['—', '✓', '✓ اختصاصی', '✓ اختصاصی'] },
                  { label: 'پشتیبانی', values: ['انجمن', 'ایمیلی', '۲۴/۷', 'اختصاصی'] },
                  { label: 'On-Premise', values: ['—', '—', '—', '✓'] },
                  { label: 'SLA', values: ['—', '—', '99%', '99.9%'] },
                ].map((row, idx) => (
                  <tr
                    key={row.label}
                    className={`border-b ${idx % 2 === 0 ? 'bg-[var(--bg-tertiary)]' : ''}`}
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <td className="p-3 md:p-4 text-[var(--text-secondary)] font-medium">{row.label}</td>
                    {row.values.map((v, i) => (
                      <td key={i} className="p-3 md:p-4 text-center text-[var(--text-primary)]">
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="px-4 md:px-6 pb-16 md:pb-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black text-center mb-8 md:mb-12 text-[var(--text-primary)]">
            سؤالات متداول
          </h2>

          <div className="space-y-3">
            {FAQ.map((item, idx) => (
              <details
                key={idx}
                className="group bg-[var(--bg-tertiary)] border rounded-2xl overflow-hidden"
                style={{ borderColor: 'var(--border)' }}
              >
                <summary className="p-4 md:p-5 cursor-pointer font-bold flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors text-sm md:text-base text-[var(--text-primary)]">
                  <span>{item.q}</span>
                  <span className="text-[#6a8dff] group-open:rotate-45 transition-transform text-2xl leading-none">
                    +
                  </span>
                </summary>
                <div className="px-4 md:px-5 pb-5 text-[var(--text-tertiary)] text-sm leading-relaxed">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="px-4 md:px-6 pb-16 md:pb-20">
        <div className="max-w-4xl mx-auto relative overflow-hidden rounded-3xl border bg-gradient-to-br from-[#6a8dff]/10 via-[#b46eff]/5 to-transparent p-8 md:p-12 text-center" style={{ borderColor: 'var(--border)' }}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#6a8dff] to-[#b46eff]" />

          <h2 className="text-2xl md:text-4xl font-black mb-4 text-[var(--text-primary)]">
            هنوز مطمئن نیستید؟
          </h2>
          <p className="text-[var(--text-secondary)] text-sm md:text-base mb-8 max-w-2xl mx-auto">
            با پلن رایگان شروع کنید. اگر راضی نبودید، هر زمان ارتقا یا لغو کنید.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="px-6 md:px-8 py-3 md:py-4 rounded-2xl bg-gradient-to-r from-[#6a8dff] to-[#b46eff] font-bold text-sm md:text-base hover:opacity-90 transition-opacity text-white"
            >
              🚀 شروع رایگان
            </Link>
            <Link
              href="/contact"
              className="px-6 md:px-8 py-3 md:py-4 rounded-2xl bg-[var(--bg-tertiary)] border font-bold text-sm md:text-base hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-primary)]"
              style={{ borderColor: 'var(--border)' }}
            >
              💬 تماس با فروش
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function PricingCard({ plan }: { plan: (typeof PLANS)[0] }) {
  return (
    <div
      className={`relative bg-[var(--bg-tertiary)] border rounded-3xl p-5 md:p-6 transition-all hover:scale-[1.02] ${
        plan.popular ? 'border-[#6a8dff]/50 shadow-lg shadow-[#6a8dff]/20' : ''
      }`}
      style={!plan.popular ? { borderColor: 'var(--border)' } : {}}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-[#6a8dff] to-[#b46eff] text-xs font-bold text-white whitespace-nowrap">
          ⭐ پیشنهاد ویژه
        </div>
      )}

      <div className="text-center mb-6 pt-2">
        <div className="text-3xl md:text-4xl mb-3">{plan.icon}</div>
        <h3 className="text-xl md:text-2xl font-black mb-2" style={{ color: plan.color }}>
          {plan.name}
        </h3>
        <p className="text-xs text-[var(--text-tertiary)] mb-4">{plan.description}</p>

        {plan.priceMonthly !== null ? (
          <div>
            <div className="text-3xl md:text-4xl font-black text-[var(--text-primary)]">
              {plan.priceMonthly === 0
                ? 'رایگان'
                : plan.priceMonthly.toLocaleString('fa-IR')}
            </div>
            {plan.priceMonthly > 0 && (
              <div className="text-xs text-[var(--text-tertiary)] mt-1">
                {plan.currency} / ماهانه
              </div>
            )}
          </div>
        ) : (
          <div className="text-xl md:text-2xl font-black text-yellow-400">
            تماس با ما
          </div>
        )}
      </div>

      <Link
        href={plan.ctaHref}
        className={`block w-full py-3 rounded-xl text-center font-bold text-sm mb-6 transition-all ${
          plan.popular
            ? 'bg-gradient-to-r from-[#6a8dff] to-[#b46eff] hover:opacity-90 text-white'
            : 'bg-[var(--bg-secondary)] border hover:bg-[var(--bg-hover)] text-[var(--text-primary)]'
        }`}
        style={!plan.popular ? { borderColor: 'var(--border)' } : {}}
      >
        {plan.cta}
      </Link>

      <ul className="space-y-3">
        {plan.features.map((f, idx) => (
          <li
            key={idx}
            className={`flex items-center gap-2 text-xs md:text-sm ${
              f.included
                ? 'text-[var(--text-secondary)]'
                : 'text-[var(--text-tertiary)] line-through'
            }`}
          >
            <span className={f.included ? 'text-green-400' : 'text-red-400'}>
              {f.included ? '✓' : '✕'}
            </span>
            <span>{f.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}