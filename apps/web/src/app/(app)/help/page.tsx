'use client';

import Link from 'next/link';

const CATEGORIES = [
  {
    icon: '🚀',
    title: 'شروع سریع',
    color: '#6a8dff',
    articles: [
      { title: 'چطور اولین ربات را بسازم؟', href: '#' },
      { title: 'اتصال ربات به تلگرام', href: '#' },
      { title: 'اتصال ربات به ایتا', href: '#' },
      { title: 'آشنایی با خوشه‌ها', href: '#' },
    ],
  },
  {
    icon: '🧠',
    title: 'هوش مصنوعی',
    color: '#b46eff',
    articles: [
      { title: 'تنظیمات System Prompt', href: '#' },
      { title: 'مدل‌های پشتیبانی‌شده', href: '#' },
      { title: 'کنترل مصرف توکن', href: '#' },
      { title: 'اتصال به AvalAI', href: '#' },
    ],
  },
  {
    icon: '📱',
    title: 'کانال‌ها',
    color: '#39d7e7',
    articles: [
      { title: 'لیست کانال‌های پشتیبانی‌شده', href: '#' },
      { title: 'پیکربندی Webhook', href: '#' },
      { title: 'رفع مشکلات اتصال', href: '#' },
    ],
  },
  {
    icon: '💳',
    title: 'پرداخت و صورتحساب',
    color: '#f59e0b',
    articles: [
      { title: 'روش‌های پرداخت', href: '#' },
      { title: 'ارتقا پلن', href: '#' },
      { title: 'دریافت فاکتور', href: '#' },
    ],
  },
  {
    icon: '🔧',
    title: 'پیکربندی پیشرفته',
    color: '#4ade80',
    articles: [
      { title: 'استفاده از API', href: '#' },
      { title: 'Webhook سفارشی', href: '#' },
      { title: 'ادغام با ابزارهای خارجی', href: '#' },
    ],
  },
  {
    icon: '🆘',
    title: 'رفع مشکلات',
    color: '#ef4444',
    articles: [
      { title: 'ربات پاسخ نمی‌دهد', href: '#' },
      { title: 'خطای اتصال به کانال', href: '#' },
      { title: 'تماس با پشتیبانی', href: '/contact' },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-4xl font-black mb-2">راهنما</h1>
        <p className="text-white/50">چطور با آشا کار کنم؟</p>
      </div>

      <div className="bg-gradient-to-br from-[#6a8dff]/10 to-[#b46eff]/5 border border-[#6a8dff]/30 rounded-3xl p-8 text-center">
        <div className="text-4xl mb-3">🔍</div>
        <h2 className="text-2xl font-bold mb-3">دنبال چه چیزی هستید؟</h2>
        <input
          type="text"
          placeholder="جستجو در راهنما..."
          className="w-full max-w-xl mx-auto block bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#6a8dff]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CATEGORIES.map((cat) => (
          <div
            key={cat.title}
            className="bg-white/[0.03] border border-white/10 rounded-3xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: `${cat.color}22` }}
              >
                {cat.icon}
              </div>
              <h3 className="font-bold" style={{ color: cat.color }}>
                {cat.title}
              </h3>
            </div>
            <ul className="space-y-2">
              {cat.articles.map((a) => (
                <li key={a.title}>
                  <Link
                    href={a.href}
                    className="text-sm text-white/60 hover:text-white transition-colors flex items-center gap-2"
                  >
                    <span className="text-white/30">›</span>
                    <span>{a.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 text-center">
        <h3 className="text-xl font-bold mb-3">پاسخ سؤالتان را پیدا نکردید؟</h3>
        <p className="text-white/50 text-sm mb-6">
          تیم پشتیبانی آماده کمک به شماست
        </p>
        <Link
          href="/contact"
          className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-[#6a8dff] to-[#b46eff] font-bold text-sm hover:opacity-90"
        >
          💬 تماس با پشتیبانی
        </Link>
      </div>
    </div>
  );
}