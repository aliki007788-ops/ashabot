'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NAV, ALWAYS_ON } from '@/lib/nav';
import { usePublicConfig } from '@/lib/public-config';
import { api, extractError } from '@/lib/api';
import { toast } from 'sonner';


const ADMIN_NAV = { href: '/admin', label: '🛡 مدیریت' };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const cfg = usePublicConfig();
  const disabled = (cfg?.disabledModules ?? []).filter((h) => !ALWAYS_ON.includes(h));
  const isOff = (href: string) => !isAdmin && disabled.some((h) => href === h || href.startsWith(h + '/'));

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  // ادامه‌ی مسیر «شروع از لندینگ»: بعد از ثبت‌نام/ورود، دوره‌ی رایگان را شروع کن و به میزکار برو
  useEffect(() => {
    if (!user) return;
    let raw: string | null = null;
    try { raw = sessionStorage.getItem('asha_go'); sessionStorage.removeItem('asha_go'); } catch { /* ignore */ }
    if (!raw) return;
    let go: { slug?: string; trial?: boolean } = {};
    try { go = JSON.parse(raw); } catch { return; }
    if (!go.slug) return;
    const slug = go.slug;
    void (async () => {
      if (go.trial) {
        try { await api.post('/api/store/trial', { slug }); toast.success('دوره‌ی رایگان شما شروع شد'); } catch (e) { toast.error(extractError(e)); }
      }
      router.replace(`/w/${slug}`);
    })();
  }, [user, router]);

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
        <nav className="max-w-7xl mx-auto px-6 pb-2 flex gap-1 overflow-x-auto text-sm">
          {(isAdmin ? [ADMIN_NAV, ...NAV] : NAV).filter((n) => !isOff(n.href)).map((n) => {
            const active = pathname === n.href || pathname.startsWith(n.href + '/');
            return (
              <Link
                key={n.href}
                href={n.href}
                className={
                  'px-3 py-1.5 rounded-lg whitespace-nowrap transition ' +
                  (active
                    ? 'bg-white/10 text-white font-bold'
                    : 'text-[var(--text-secondary)] hover:bg-white/5')
                }
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="max-w-7xl mx-auto p-6">
        {isOff(pathname) ? (
          <div className="max-w-xl mx-auto mt-16 rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center">
            <div className="text-5xl mb-4">🚧</div>
            <h1 className="text-2xl font-black mb-2">این بخش فعلاً غیرفعال است</h1>
            <p className="text-white/50 text-sm">مدیر پلتفرم این بخش را موقتاً خاموش کرده است.</p>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}