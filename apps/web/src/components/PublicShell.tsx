'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ThemeToggle } from '@/components/ThemeToggle';
import { usePublicConfig } from '@/lib/public-config';

export function PublicShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const cfg = usePublicConfig();
  const link = 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors';
  return (
    <div className="min-h-screen">
      <header className="border-b sticky top-0 z-20 backdrop-blur-md" style={{ borderColor: 'var(--border)', background: 'var(--bg-overlay)' }}>
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6a8dff] to-[#b46eff] grid place-items-center font-black text-white">A</span>
            <span className="font-black text-lg">{cfg?.storeName || 'آشا'}</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/c" className={link}>خوشه‌ها</Link>
            <Link href="/pricing" className={link + ' hidden sm:block'}>قیمت‌ها</Link>
            <Link href="/contact" className={link + ' hidden sm:block'}>تماس</Link>
            <ThemeToggle />
            {user ? (
              <Link href="/account" className="px-4 py-2 rounded-xl bg-gradient-to-br from-[#6a8dff] to-[#b46eff] text-white font-bold">حساب من</Link>
            ) : (
              <>
                <Link href="/login" className={link}>ورود</Link>
                {cfg?.registrationOpen !== false && <Link href="/register" className="px-4 py-2 rounded-xl bg-gradient-to-br from-[#6a8dff] to-[#b46eff] text-white font-bold">ثبت‌نام</Link>}
              </>
            )}
          </nav>
        </div>
      </header>
      {children}
      <footer className="border-t mt-16 py-8 text-center text-xs text-[var(--text-tertiary)]" style={{ borderColor: 'var(--border)' }}>
        <div className="flex justify-center gap-5 mb-2">
          <Link href="/about">درباره</Link><Link href="/terms">قوانین</Link><Link href="/privacy">حریم خصوصی</Link>
          {cfg?.supportLink && <a href={cfg.supportLink} target="_blank" rel="noreferrer">پشتیبانی</a>}
        </div>
        © {cfg?.storeName || 'آشا'}
      </footer>
    </div>
  );
}
