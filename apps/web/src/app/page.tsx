'use client';

import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function LandingPage() {
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
            <Link href="/#features" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              امکانات
            </Link>
            <Link href="/pricing" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              قیمت‌گذاری
            </Link>
            <Link href="/about" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              درباره
            </Link>
            <Link href="/contact" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              تماس
            </Link>
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
      <section className="relative pt-32 pb-16 md:pb-24 px-4 md:px-6 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-1/4 w-64 md:w-96 h-64 md:h-96 rounded-full bg-[#6a8dff]/20 blur-3xl" />
          <div className="absolute bottom-20 right-1/4 w-64 md:w-96 h-64 md:h-96 rounded-full bg-[#b46eff]/20 blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-full bg-[#6a8dff]/10 border border-[#6a8dff]/30 text-xs md:text-sm text-[#6a8dff] mb-6">
            <span>✨</span>
            <span>پلتفرم ربات‌های هوشمند فارسی</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight text-[var(--text-primary)]">
            <span className="bg-gradient-to-r from-[#6a8dff] via-[#b46eff] to-[#ec4899] bg-clip-text text-transparent">
              کسب‌وکارت رو
            </span>
            <br />
            هوشمند کن
          </h1>

          <p className="text-[var(--text-secondary)] text-sm md:text-lg max-w-3xl mx-auto mb-8 md:mb-10 leading-relaxed">
            <span className="text-[var(--text-primary)] font-bold">۱۹۰ ربات هوش مصنوعی</span> در{' '}
            <span className="text-[var(--text-primary)] font-bold">۲۷ خوشه تخصصی</span> — آماده برای{' '}
            <span className="text-[var(--text-primary)] font-bold">۱۵ کانال ارتباطی</span>
            <br className="hidden md:block" />
            از تلگرام و ایتا تا ایمیل و پیامک. همه در یک پلتفرم.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10 md:mb-12">
            <Link
              href="/register"
              className="px-6 md:px-8 py-3 md:py-4 rounded-2xl bg-gradient-to-r from-[#6a8dff] to-[#b46eff] font-bold text-sm md:text-lg hover:opacity-90 transition-opacity shadow-lg shadow-[#6a8dff]/30 text-white"
            >
              🚀 شروع رایگان — بدون کارت اعتباری
            </Link>
            <Link
              href="/pricing"
              className="px-6 md:px-8 py-3 md:py-4 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border)] font-bold text-sm md:text-lg hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-primary)]"
            >
              💎 مشاهده پلن‌ها
            </Link>
          </div>

          <div className="flex flex-wrap gap-4 md:gap-8 justify-center text-xs md:text-sm text-[var(--text-tertiary)]">
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>۳۰ روز تست رایگان</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>بدون نیاز به کارت</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>لغو در هر زمان</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============ Stats ============ */}
      <section className="py-10 md:py-12 px-4 md:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
          {[
            { num: '۱۹۰', label: 'ربات هوشمند', icon: '🤖', color: '#6a8dff' },
            { num: '۲۷', label: 'خوشه تخصصی', icon: '🏢', color: '#b46eff' },
            { num: '۱۵', label: 'کانال ارتباطی', icon: '📱', color: '#39d7e7' },
            { num: '۱۳', label: 'ربات پرمیوم', icon: '⭐', color: '#f59e0b' },
          ].map((s, i) => (
            <div
              key={i}
              className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-4 md:p-6 text-center hover:border-[var(--border-hover)] transition-colors"
            >
              <div className="text-2xl md:text-4xl mb-2 md:mb-3">{s.icon}</div>
              <div className="text-2xl md:text-4xl font-black mb-1" style={{ color: s.color }}>
                {s.num}
              </div>
              <div className="text-xs md:text-sm text-[var(--text-tertiary)]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ Features ============ */}
      <section id="features" className="py-16 md:py-20 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 md:mb-16">
            <h2 className="text-3xl md:text-5xl font-black mb-3 md:mb-4 text-[var(--text-primary)]">
              چرا{' '}
              <span className="bg-gradient-to-r from-[#6a8dff] to-[#b46eff] bg-clip-text text-transparent">
                آشا
              </span>
              ؟
            </h2>
            <p className="text-[var(--text-secondary)] text-sm md:text-lg max-w-2xl mx-auto">
              پلتفرمی که کسب‌وکار شما را از ابتدا تا انتها هوشمند می‌کند
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[
              { icon: '🤖', title: '۱۹۰ ربات آماده', desc: 'از فروش و پشتیبانی تا تحلیل و منابع انسانی — همه چیز آماده است', color: '#6a8dff' },
              { icon: '🧠', title: '۲۷ مغز تخصصی', desc: 'هر ربات به مغز مرکزی و مغز تخصصی متصل است — هوش توزیع‌شده', color: '#39d7e7' },
              { icon: '📱', title: '۱۵ کانال ارتباطی', desc: 'تلگرام، ایتا، بله، روبیکا، واتساپ، اینستاگرام، ایمیل و پیامک', color: '#b46eff' },
              { icon: '⭐', title: '۱۳ ربات پرمیوم', desc: 'قابلیت‌های خاصی که در هیچ محصول دیگری پیدا نمی‌کنید', color: '#f59e0b' },
              { icon: '🎛️', title: 'مرکز فرمان خوشه', desc: 'به کل خوشه دستور بده — پاسخ با هوش مصنوعی بر اساس داده‌های واقعی', color: '#4ade80' },
              { icon: '🌐', title: 'چندزبانه + RTL', desc: 'پشتیبانی کامل از فارسی، عربی و انگلیسی با رابط کاربری حرفه‌ای', color: '#ec4899' },
            ].map((f, i) => (
              <div
                key={i}
                className="group bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-6 hover:border-[var(--border-hover)] transition-all hover:scale-[1.02]"
              >
                <div
                  className="w-12 md:w-14 h-12 md:h-14 rounded-2xl flex items-center justify-center text-2xl md:text-3xl mb-3 md:mb-4"
                  style={{ background: `${f.color}22` }}
                >
                  {f.icon}
                </div>
                <h3 className="text-base md:text-xl font-bold mb-2 text-[var(--text-primary)]">
                  {f.title}
                </h3>
                <p className="text-[var(--text-tertiary)] text-xs md:text-sm leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ How it works ============ */}
      <section className="py-16 md:py-20 px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 md:mb-16">
            <h2 className="text-3xl md:text-5xl font-black mb-3 md:mb-4 text-[var(--text-primary)]">
              چطور کار می‌کند؟
            </h2>
            <p className="text-[var(--text-secondary)] text-sm md:text-lg">
              فقط 3 قدم تا هوشمندسازی کسب‌وکار
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              { step: '۱', title: 'ثبت‌نام رایگان', desc: 'در کمتر از 1 دقیقه حساب بسازید — بدون نیاز به کارت اعتباری', color: '#6a8dff' },
              { step: '۲', title: 'انتخاب ربات و کانال', desc: 'از میان 190 ربات و 15 کانال، انتخاب کنید و فعال کنید', color: '#b46eff' },
              { step: '۳', title: 'شروع هوشمندسازی', desc: 'ربات‌ها به صورت ۲۴/۷ کار می‌کنند و شما فقط نظاره‌گر رشد باشید', color: '#4ade80' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div
                  className="w-16 md:w-20 h-16 md:h-20 rounded-3xl flex items-center justify-center text-3xl md:text-4xl font-black mx-auto mb-4 md:mb-5 shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${s.color}33, ${s.color}11)`,
                    color: s.color,
                    border: `2px solid ${s.color}44`,
                  }}
                >
                  {s.step}
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-2 text-[var(--text-primary)]">
                  {s.title}
                </h3>
                <p className="text-[var(--text-tertiary)] text-xs md:text-sm leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="py-16 md:py-20 px-4 md:px-6">
        <div className="max-w-4xl mx-auto relative overflow-hidden rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[#6a8dff]/10 via-[#b46eff]/10 to-transparent p-8 md:p-16 text-center">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#6a8dff] to-[#b46eff]" />

          <h2 className="text-3xl md:text-5xl font-black mb-3 md:mb-4 text-[var(--text-primary)]">
            امروز شروع کن
          </h2>
          <p className="text-[var(--text-secondary)] text-sm md:text-lg mb-6 md:mb-8 max-w-2xl mx-auto">
            به هزاران کسب‌وکار که با آشا هوشمند شده‌اند بپیوندید
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="px-6 md:px-8 py-3 md:py-4 rounded-2xl bg-gradient-to-r from-[#6a8dff] to-[#b46eff] font-bold text-sm md:text-lg hover:opacity-90 transition-opacity text-white"
            >
              🚀 شروع رایگان
            </Link>
            <Link
              href="/contact"
              className="px-6 md:px-8 py-3 md:py-4 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border)] font-bold text-sm md:text-lg hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-primary)]"
            >
              💬 تماس با فروش
            </Link>
          </div>
        </div>
      </section>

      {/* ============ Footer ============ */}
      <footer className="border-t py-12 px-4 md:px-6" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6a8dff] to-[#b46eff] grid place-items-center font-black text-white text-sm">
                  A
                </span>
                <span className="font-bold text-[var(--text-primary)]">آشا</span>
              </div>
              <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
                پلتفرم ربات‌های هوشمند برای کسب‌وکارهای فارسی
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-3 text-sm text-[var(--text-primary)]">محصول</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="/pricing" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                    قیمت‌گذاری
                  </Link>
                </li>
                <li>
                  <Link href="/#features" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                    امکانات
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                    شروع رایگان
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-3 text-sm text-[var(--text-primary)]">شرکت</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="/about" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                    درباره ما
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                    تماس
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-3 text-sm text-[var(--text-primary)]">قانونی</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="/terms" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                    قوانین
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                    حریم خصوصی
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div
            className="pt-8 border-t text-center text-xs text-[var(--text-tertiary)]"
            style={{ borderColor: 'var(--border)' }}
          >
            © 1404 آشا — همه حقوق محفوظ است.
          </div>
        </div>
      </footer>
    </div>
  );
}