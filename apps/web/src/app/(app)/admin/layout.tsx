'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const TABS = [
  { href: '/admin', label: '📊 نمای کلی', exact: true },
  { href: '/admin/users', label: '👥 کاربران' },
  { href: '/admin/orders', label: '🧾 سفارش‌ها' },
  { href: '/admin/catalog', label: '🏷 قیمت‌ها و کاتالوگ' },
  { href: '/admin/settings', label: '⚙ تنظیمات فروش' },
  { href: '/admin/system', label: '🩺 سلامت سیستم' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  const pathname = usePathname();

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto mt-16 rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-2xl font-black mb-2">دسترسی مدیر لازم است</h1>
        <p className="text-white/50 text-sm leading-7">
          این بخش فقط برای مدیر پلتفرم است. اگر مدیر هستید، ایمیل خود را در متغیر <code dir="ltr">ADMIN_EMAILS</code> سرور (Render) بگذارید و دوباره وارد شوید.
        </p>
        <Link href="/dashboard" className="inline-block mt-6 px-5 py-2.5 rounded-xl bg-white/10 text-sm">
          بازگشت به داشبورد
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-1 overflow-x-auto border-b border-white/10 pb-2 text-sm">
        {TABS.map((t) => {
          const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} className={'px-4 py-2 rounded-lg whitespace-nowrap transition ' + (active ? 'bg-[#6a8dff]/20 text-white font-bold' : 'text-white/60 hover:bg-white/5')}>
              {t.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
