'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-white/20 border-t-[#6a8dff] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 backdrop-blur-md sticky top-0 z-10 bg-[#07122e]/80">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6a8dff] to-[#b46eff] grid place-items-center font-black text-white">
              B
            </span>
            <span className="font-black">پلتفرم ربات‌ها</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-white/60">{user.name}</span>
            <Button variant="ghost" size="sm" onClick={logout}>
              خروج
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-6">{children}</main>
    </div>
  );
}
