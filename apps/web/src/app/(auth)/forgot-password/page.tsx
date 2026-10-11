'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api, extractError } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      await api.post('/api/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link href="/login" className="text-sm text-white/40 hover:text-white/70 mb-6 inline-block">
          ← بازگشت به ورود
        </Link>

        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
          {sent ? (
            <div className="text-center py-6">
              <div className="text-6xl mb-4">📧</div>
              <h1 className="text-2xl font-black mb-3">ایمیل ارسال شد</h1>
              <p className="text-white/60 text-sm mb-6 leading-relaxed">
                اگر ایمیل <span className="text-white">{email}</span> در سیستم ثبت شده باشد،
                لینک بازیابی رمز عبور برای شما ارسال شد.
              </p>
              <Link
                href="/login"
                className="text-[#6a8dff] hover:underline text-sm"
              >
                بازگشت به صفحه ورود →
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">🔐</div>
                <h1 className="text-2xl font-black mb-2">فراموشی رمز عبور</h1>
                <p className="text-sm text-white/50">
                  ایمیل خود را وارد کنید تا لینک بازیابی دریافت کنید
                </p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm mb-6">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">ایمیل</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#6a8dff] transition-colors"
                    dir="ltr"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#6a8dff] to-[#b46eff] font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? '⏳ ارسال...' : '📧 ارسال لینک بازیابی'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}