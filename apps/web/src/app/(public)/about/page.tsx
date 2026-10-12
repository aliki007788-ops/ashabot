'use client';

import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

const NAV_ITEMS = [
  { href: '/#features', label: 'امکانات' },
  { href: '/pricing', label: 'قیمت‌گذاری' },
  { href: '/about', label: 'درباره' },
  { href: '/contact', label: 'تماس' },
];

export default function AboutPage() {
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
                  item.href === '/about'
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

      {/* ============ Content ============ */}
      <section className="pt-32 pb-16 md:pb-20 px-4 md:px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-black mb-6 text-[var(--text-primary)]">
            درباره آشا
          </h1>
          <p className="text-base md:text-xl text-[var(--text-secondary)] leading-relaxed mb-8">
            آشا پلتفرم ربات‌های هوشمند فارسی است که با هدف کمک به کسب‌وکارهای ایرانی برای هوشمندسازی فرآیندهای خود طراحی شده است.
          </p>

          <div className="space-y-8">
            <div>
              <h2 className="text-xl md:text-2xl font-bold mb-3 text-[var(--text-primary)]">
                🎯 مأموریت ما
              </h2>
              <p className="text-[var(--text-secondary)] text-sm md:text-base leading-relaxed">
                ما باور داریم هر کسب‌وکاری، صرف‌نظر از اندازه، لیاقت دسترسی به فناوری هوش مصنوعی سطح جهانی را دارد. آشا این دسترسی را فراهم می‌کند.
              </p>
            </div>

            <div>
              <h2 className="text-xl md:text-2xl font-bold mb-3 text-[var(--text-primary)]">
                💡 چرا آشا؟
              </h2>
              <ul className="space-y-3 text-[var(--text-secondary)] text-sm md:text-base">
                <li className="flex gap-3">
                  <span className="text-[#6a8dff] shrink-0">◆</span>
                  <span>۱۹۱ ربات آماده در ۲۷ خوشه تخصصی</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#6a8dff] shrink-0">◆</span>
                  <span>پشتیبانی کامل از پیام‌رسان‌های ایرانی (ایتا، بله، روبیکا، سروش، گپ)</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#6a8dff] shrink-0">◆</span>
                  <span>رابط کاربری فارسی حرفه‌ای با RTL کامل</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#6a8dff] shrink-0">◆</span>
                  <span>قیمت‌گذاری منصفانه به تومان با پرداخت داخلی</span>
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl md:text-2xl font-bold mb-3 text-[var(--text-primary)]">
                👥 تیم ما
              </h2>
              <p className="text-[var(--text-secondary)] text-sm md:text-base leading-relaxed">
                آشا توسط تیمی از مهندسان نرم‌افزار و متخصصان هوش مصنوعی ایرانی ساخته شده که هدفشان ساختن آینده‌ای هوشمندتر برای کسب‌وکارهای ایران است.
              </p>
            </div>

            <div
              className="bg-gradient-to-br from-[#6a8dff]/10 to-[#b46eff]/5 border rounded-3xl p-6 md:p-8 text-center"
              style={{ borderColor: 'var(--border)' }}
            >
              <h3 className="text-xl md:text-2xl font-bold mb-3 text-[var(--text-primary)]">
                همراه ما شوید
              </h3>
              <p className="text-[var(--text-secondary)] text-sm md:text-base mb-6">
                امروز به هزاران کسب‌وکار هوشمند بپیوندید
              </p>
              <Link
                href="/register"
                className="inline-block px-6 md:px-8 py-3 md:py-4 rounded-2xl bg-gradient-to-r from-[#6a8dff] to-[#b46eff] font-bold text-sm md:text-base hover:opacity-90 transition-opacity text-white"
              >
                🚀 شروع رایگان
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}