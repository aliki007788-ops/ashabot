'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { api, extractError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SecurityPage() {
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) return toast.error('رمز تازه باید حداقل ۸ نویسه باشد');
    if (next !== again) return toast.error('تکرار رمز با رمز تازه یکی نیست');
    setBusy(true);
    try {
      await api.post('/api/auth/change-password', { currentPassword: cur, newPassword: next });
      toast.success('رمز عبور تغییر کرد؛ سایر دستگاه‌ها خارج شدند');
      setCur(''); setNext(''); setAgain('');
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <Link href="/settings" className="text-sm text-white/40 hover:text-white/70">← بازگشت به تنظیمات</Link>
      <div><h1 className="text-4xl font-black mb-2">امنیت</h1><p className="text-white/50">تغییر رمز عبور</p></div>
      <form onSubmit={submit} className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 space-y-4">
        <Input id="cur" type="password" label="رمز فعلی" value={cur} onChange={(e) => setCur(e.target.value)} dir="ltr" autoComplete="current-password" required />
        <Input id="new" type="password" label="رمز تازه (حداقل ۸ نویسه)" value={next} onChange={(e) => setNext(e.target.value)} dir="ltr" autoComplete="new-password" required />
        <Input id="again" type="password" label="تکرار رمز تازه" value={again} onChange={(e) => setAgain(e.target.value)} dir="ltr" autoComplete="new-password" required />
        <Button type="submit" loading={busy}>تغییر رمز</Button>
      </form>
    </div>
  );
}
