'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[var(--border-strong)] border-t-[#6a8dff] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <header
        className="border-b sticky top-0 z-10 backdrop-blur-md"
        style={{
          borderColor: 'var(--border)',
          background: 'var(--bg-overlay)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6a8dff] to-[#b46eff] grid place-items-center font-black text-white shadow-lg">
              A
            </span>
            <span className="font-black text-[var(--text-primary)]">آشا</span>
            <span className="text-xs text-[var(--text-muted)] hidden md:block">
              پلتفرم ربات‌های هوشمند
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-[var(--text-secondary)] hidden sm:block">
              {user.name}
            </span>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={logout}>
              خروج
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-6">{children}</main>
    </div>
  );
}