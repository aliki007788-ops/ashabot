'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

const NAV_ITEMS = [
  { href: '/#features', label: 'امکانات' },
  { href: '/pricing', label: 'قیمت‌گذاری' },
  { href: '/about', label: 'درباره' },
  { href: '/contact', label: 'تماس' },
];

export default function ContactPage() {
  const [sent, setSent] = useState(false);

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
                  item.href === '/contact'
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
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h1 className="text-3xl md:text-5xl font-black mb-4 text-[var(--text-primary)]">
              تماس با ما
            </h1>
            <p className="text-[var(--text-secondary)] text-sm md:text-lg">
              هر سؤالی دارید، تیم ما آماده پاسخگویی است
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-12">
            {[
              { icon: '📧', title: 'ایمیل', value: 'hello@asha.ai', color: '#6a8dff' },
              { icon: '📱', title: 'پشتیبانی', value: 'پاسخ ۲۴/۷ برای Business', color: '#b46eff' },
              { icon: '💬', title: 'فروش', value: 'sales@asha.ai', color: '#4ade80' },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-[var(--bg-tertiary)] border rounded-3xl p-6 text-center hover:border-[var(--border-hover)] transition-colors"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="text-3xl md:text-4xl mb-3">{item.icon}</div>
                <div className="font-bold mb-1 text-sm md:text-base" style={{ color: item.color }}>
                  {item.title}
                </div>
                <div className="text-xs md:text-sm text-[var(--text-tertiary)]" dir="ltr">
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          <div
            className="max-w-2xl mx-auto bg-[var(--bg-tertiary)] border rounded-3xl p-6 md:p-8"
            style={{ borderColor: 'var(--border)' }}
          >
            {sent ? (
              <div className="text-center py-6">
                <div className="text-5xl md:text-6xl mb-4">✅</div>
                <h2 className="text-xl md:text-2xl font-black mb-3 text-[var(--text-primary)]">
                  پیام ارسال شد
                </h2>
                <p className="text-[var(--text-secondary)] text-sm">
                  در اولین فرصت با شما تماس خواهیم گرفت.
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-xl md:text-2xl font-black mb-6 text-center text-[var(--text-primary)]">
                  ارسال پیام
                </h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSent(true);
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold mb-2 text-[var(--text-primary)]">نام</label>
                      <input
                        type="text"
                        required
                        className="w-full bg-[var(--bg-secondary)] border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#6a8dff] text-[var(--text-primary)]"
                        style={{ borderColor: 'var(--border)' }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2 text-[var(--text-primary)]">ایمیل</label>
                      <input
                        type="email"
                        required
                        className="w-full bg-[var(--bg-secondary)] border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#6a8dff] text-[var(--text-primary)]"
                        style={{ borderColor: 'var(--border)' }}
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2 text-[var(--text-primary)]">موضوع</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-[var(--bg-secondary)] border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#6a8dff] text-[var(--text-primary)]"
                      style={{ borderColor: 'var(--border)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2 text-[var(--text-primary)]">پیام</label>
                    <textarea
                      required
                      rows={6}
                      className="w-full bg-[var(--bg-secondary)] border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#6a8dff] resize-none text-[var(--text-primary)]"
                      style={{ borderColor: 'var(--border)' }}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#6a8dff] to-[#b46eff] font-bold text-sm hover:opacity-90 transition-opacity text-white"
                  >
                    📨 ارسال پیام
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}