'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { api, extractError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return toast.error('نام باید حداقل ۲ نویسه باشد');
    setBusy(true);
    try {
      await api.patch('/api/auth/me', { name: name.trim() });
      await refreshUser();
      toast.success('اطلاعات ذخیره شد');
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/settings" className="text-sm text-white/40 hover:text-white/70">← بازگشت به تنظیمات</Link>
      <div><h1 className="text-4xl font-black mb-2">پروفایل</h1><p className="text-white/50">مدیریت اطلاعات شخصی</p></div>
      <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 flex items-center gap-5">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#6a8dff] to-[#b46eff] grid place-items-center font-black text-white text-3xl">{user?.name?.[0] || 'A'}</div>
        <div><div className="font-bold text-lg">{user?.name}</div><div className="text-sm text-white/50" dir="ltr">{user?.email}</div><div className="text-xs text-white/40 mt-1">{user?.role === 'ADMIN' ? '🛡 مدیر پلتفرم' : 'کاربر'}</div></div>
      </div>
      <form onSubmit={save} className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 space-y-4">
        <h2 className="font-bold">اطلاعات شخصی</h2>
        <Input id="name" label="نام کامل" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        <Input id="email" label="ایمیل (غیرقابل تغییر)" value={user?.email ?? ''} readOnly dir="ltr" className="opacity-60" />
        <Button type="submit" loading={busy}>💾 ذخیره تغییرات</Button>
      </form>
    </div>
  );
}
