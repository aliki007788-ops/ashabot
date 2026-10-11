'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

const SETTINGS_SECTIONS = [
  { icon: '👤', title: 'پروفایل', desc: 'نام، ایمیل و اطلاعات شخصی', href: '/settings/profile', color: '#6a8dff' },
  { icon: '💳', title: 'صورتحساب و پلن', desc: 'مدیریت اشتراک و پرداخت‌ها', href: '/settings/billing', color: '#b46eff' },
  { icon: '👥', title: 'اعضای تیم', desc: 'مدیریت کاربران سازمان', href: '/settings/team', color: '#4ade80' },
  { icon: '🔑', title: 'کلیدهای API', desc: 'دسترسی برنامه‌نویسی', href: '/settings/api-keys', color: '#f59e0b' },
  { icon: '🔔', title: 'اعلان‌ها', desc: 'تنظیمات اطلاع‌رسانی', href: '/settings/notifications', color: '#ec4899' },
  { icon: '🔒', title: 'امنیت', desc: 'رمز عبور و احراز هویت', href: '/settings/security', color: '#ef4444' },
];

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-4xl font-black mb-2">تنظیمات</h1>
        <p className="text-white/50">مدیریت حساب کاربری و سازمان</p>
      </div>

      <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6a8dff] to-[#b46eff] grid place-items-center font-black text-white text-2xl">
            {user?.name?.[0] || 'A'}
          </div>
          <div className="flex-1">
            <div className="font-bold text-lg">{user?.name || 'Admin'}</div>
            <div className="text-sm text-white/50" dir="ltr">{user?.email || 'admin@test.com'}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SETTINGS_SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group bg-white/[0.03] border border-white/10 rounded-3xl p-6 hover:border-white/20 transition-all hover:scale-[1.02]"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4"
              style={{ background: `${s.color}22` }}
            >
              {s.icon}
            </div>
            <h3 className="font-bold mb-1 group-hover:text-[#6a8dff] transition-colors">
              {s.title}
            </h3>
            <p className="text-xs text-white/50">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}