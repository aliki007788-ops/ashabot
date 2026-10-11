'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function ProfilePage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/settings" className="text-sm text-white/40 hover:text-white/70">
        ← بازگشت به تنظیمات
      </Link>

      <div>
        <h1 className="text-4xl font-black mb-2">پروفایل</h1>
        <p className="text-white/50">مدیریت اطلاعات شخصی</p>
      </div>

      {saved && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 rounded-2xl p-4">
          ✅ اطلاعات با موفقیت ذخیره شد
        </div>
      )}

      {/* Avatar */}
      <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#6a8dff] to-[#b46eff] grid place-items-center font-black text-white text-3xl">
            {name?.[0] || 'A'}
          </div>
          <div className="flex-1">
            <div className="font-bold text-lg mb-1">{name || 'کاربر'}</div>
            <div className="text-sm text-white/50" dir="ltr">{email}</div>
            <button className="mt-3 text-xs px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              📷 تغییر آواتار
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
        }}
        className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 space-y-4"
      >
        <h2 className="font-bold mb-2">اطلاعات شخصی</h2>

        <div>
          <label className="block text-sm font-bold mb-2">نام کامل</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#6a8dff]"
          />
        </div>

        <div>
          <label className="block text-sm font-bold mb-2">ایمیل</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            dir="ltr"
            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#6a8dff]"
          />
        </div>

        <button
          type="submit"
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#6a8dff] to-[#b46eff] font-bold text-sm hover:opacity-90"
        >
          💾 ذخیره تغییرات
        </button>
      </form>
    </div>
  );
}