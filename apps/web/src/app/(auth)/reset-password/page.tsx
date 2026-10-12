'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, extractError } from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('رمز عبور و تکرار آن مطابقت ندارد');
      return;
    }
    if (password.length < 6) {
      setError('رمز عبور باید حداقل ۶ کاراکتر باشد');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await api.post('/api/auth/reset-password', { token, password });
      router.push('/login?reset=success');
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center py-8">
        <div className="text-6xl mb-4">❌</div>
        <h1 className="text-2xl font-black mb-3">لینک نامعتبر</h1>
        <p className="text-white/60 mb-6">لینک بازیابی نامعتبر یا منقضی شده است.</p>
        <Link href="/forgot-password" className="text-[#6a8dff] hover:underline">
          درخواست لینک جدید →
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">🔑</div>
        <h1 className="text-2xl font-black mb-2">تعیین رمز جدید</h1>
        <p className="text-sm text-white/50">رمز عبور جدید خود را وارد کنید</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-bold mb-2">رمز عبور جدید</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="حداقل ۶ کاراکتر"
            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#6a8dff] transition-colors"
            dir="ltr"
          />
        </div>

        <div>
          <label className="block text-sm font-bold mb-2">تکرار رمز عبور</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            placeholder="تکرار رمز"
            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#6a8dff] transition-colors"
            dir="ltr"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#6a8dff] to-[#b46eff] font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? '⏳ ذخیره...' : '🔑 تغییر رمز عبور'}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link href="/login" className="text-sm text-white/40 hover:text-white/70 mb-6 inline-block">
          ← بازگشت به ورود
        </Link>

        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
          <Suspense fallback={
            <div className="text-center py-12">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-white/50">در حال بارگذاری...</p>
            </div>
          }>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}