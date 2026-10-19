'use client';

import { useEffect, useState } from 'react';
import { api, extractError, getToken, setToken } from '@/lib/api';
import Workspace from '@/workspaces/__SLUG__';

/** ورود با حساب آشا، بعد نمایش میزکار */
export default function Home() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAuthed(!!getToken());
    setReady(true);
  }, []);

  async function login(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const r = await api.post('/api/auth/login', { email, password });
      setToken((r.data as { accessToken: string }).accessToken);
      setAuthed(true);
    } catch (e2) {
      setErr(extractError(e2));
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;

  if (!authed) {
    const cls = 'w-full px-3 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-white/40';
    return (
      <main className="min-h-screen grid place-items-center px-4">
        <form onSubmit={login} className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-6 space-y-4">
          <div>
            <div className="text-xl font-black">__TITLE__</div>
            <div className="text-xs text-white/50 mt-1">برای ورود، حساب خود را وارد کنید</div>
          </div>
          <input className={cls} dir="ltr" type="email" placeholder="ایمیل" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className={cls} dir="ltr" type="password" placeholder="رمز عبور" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {err && <div className="text-sm text-red-300">{err}</div>}
          <button disabled={busy} className="w-full rounded-xl py-3 font-bold text-[#07122e] disabled:opacity-50" style={{ background: '#6a8dff' }}>
            {busy ? '…' : 'ورود'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex justify-end mb-3">
        <button
          className="text-xs text-white/50 hover:text-white"
          onClick={() => {
            setToken(null);
            setAuthed(false);
          }}
        >
          خروج
        </button>
      </div>
      <Workspace />
    </main>
  );
}
