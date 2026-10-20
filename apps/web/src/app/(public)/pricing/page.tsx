'use client';

import Link from 'next/link';
import { useFetch } from '@/lib/use-fetch';
import { num, toman } from '@/lib/fmt';
import { ErrorBox, Spinner } from '@/components/ui/bits';
import { PublicShell } from '@/components/PublicShell';

interface Item { slug: string; name: string; icon: string; color: string; priceMonthly: number; botCount: number }

const DISCOUNTS = [{ m: 1, d: 0 }, { m: 3, d: 5 }, { m: 6, d: 10 }, { m: 12, d: 20 }];

export default function PricingPage() {
  const { data, error, loading, reload } = useFetch<{ items: Item[] }>('/api/public/landings');
  return (
    <PublicShell>
      <main className="max-w-5xl mx-auto px-4 md:px-6 py-12 space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-3xl md:text-4xl font-black">قیمت شفاف، بدون «تماس بگیرید»</h1>
          <p className="text-[var(--text-secondary)] leading-8">هر خوشه یک اشتراک ماهانه‌ی جدا دارد و همه‌ی ربات‌ها و میزکار آن را شامل می‌شود. خرید چندماهه ارزان‌تر است.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 text-sm">
          {DISCOUNTS.map((x) => <span key={x.m} className="px-4 py-2 rounded-full border" style={{ borderColor: 'var(--border)' }}>{num(x.m)} ماه{x.d > 0 ? ` · ${num(x.d)}٪ تخفیف` : ''}</span>)}
        </div>
        {error && <ErrorBox msg={error} onRetry={reload} />}
        {loading && !data ? <Spinner /> : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(data?.items ?? []).map((c) => (
              <Link key={c.slug} href={`/c/${c.slug}`} className="rounded-2xl border p-5 space-y-2 hover:scale-[1.02] transition" style={{ borderColor: 'var(--border)', background: 'var(--bg-tertiary)', borderTop: `3px solid ${c.color}` }}>
                <div className="flex items-center gap-2 font-black"><span className="text-2xl">{c.icon}</span>{c.name}</div>
                <div className="text-xl font-black">{c.priceMonthly > 0 ? toman(c.priceMonthly) : 'رایگان'}{c.priceMonthly > 0 && <span className="text-xs font-normal text-[var(--text-secondary)]"> / ماه</span>}</div>
                <div className="text-xs text-[var(--text-tertiary)]">{num(c.botCount)} ربات + میزکار اختصاصی</div>
              </Link>
            ))}
          </div>
        )}
        {data && data.items.every((c) => c.priceMonthly === 0) && data.items.length > 0 && <p className="text-center text-sm text-[var(--text-secondary)]">در حال حاضر همه‌ی خوشه‌ها رایگان است.</p>}
      </main>
    </PublicShell>
  );
}
