'use client';

import Link from 'next/link';
import { useFetch } from '@/lib/use-fetch';
import { num, toman } from '@/lib/fmt';
import { ErrorBox, Spinner } from '@/components/ui/bits';
import { PublicShell } from '@/components/PublicShell';

interface Item { slug: string; name: string; icon: string; color: string; priceMonthly: number; botCount: number; pain: string }

export default function LandingsIndex() {
  const { data, error, loading, reload } = useFetch<{ items: Item[] }>('/api/public/landings');
  return (
    <PublicShell>
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-12 space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-3xl md:text-4xl font-black">کدام بخش کسب‌وکارت را می‌خواهی راحت‌تر کنی؟</h1>
          <p className="text-[var(--text-secondary)]">هر خوشه یک میزکار اختصاصی و مجموعه‌ای از ربات‌های هم‌کار است. یکی را انتخاب کن و همین‌جا امتحانش کن.</p>
        </div>
        {error && <ErrorBox msg={error} onRetry={reload} />}
        {loading && !data ? <Spinner /> : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {(data?.items ?? []).map((c) => (
              <Link key={c.slug} href={`/c/${c.slug}`} className="group rounded-2xl border p-5 space-y-3 hover:scale-[1.02] transition" style={{ borderColor: 'var(--border)', background: 'var(--bg-tertiary)', borderTop: `3px solid ${c.color}` }}>
                <div className="flex items-center gap-3"><span className="text-3xl">{c.icon}</span><span className="font-black">{c.name}</span></div>
                <p className="text-sm text-[var(--text-secondary)] leading-7">{c.pain}</p>
                <div className="flex justify-between text-xs text-[var(--text-tertiary)]">
                  <span>{num(c.botCount)} ربات</span>
                  <span>{c.priceMonthly > 0 ? `از ${toman(c.priceMonthly)} / ماه` : 'رایگان'}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
        {data && data.items.length === 0 && <p className="text-center text-[var(--text-secondary)]">فعلاً صفحه‌ای برای نمایش نیست.</p>}
      </main>
    </PublicShell>
  );
}
