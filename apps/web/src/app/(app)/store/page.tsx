'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { api, extractError } from '@/lib/api';
import { useFetch } from '@/lib/use-fetch';
import { dateFa, num, priceWithDiscount, toman } from '@/lib/fmt';
import { ErrorBox, Spinner, inputCls } from '@/components/ui/bits';
import { Button } from '@/components/ui/button';

interface Cl { slug: string; name: string; icon: string; color: string; description: string | null; priceMonthly: number; botCount: number; ownedUntil: string | null }
interface Bt { slug: string; name: string; icon: string; description: string | null; isPremium: boolean; priceMonthly: number; clusterSlug: string | null; clusterName: string | null; ownedUntil: string | null; includedByCluster: boolean }
interface Catalog {
  settings: { enforcePurchases: boolean; storeName: string; announcement: string; zarinpal: boolean };
  months: { months: number; discount: number }[];
  clusters: Cl[];
  bots: Bt[];
}
interface Line { kind: 'CLUSTER' | 'BOT'; slug: string; name: string; icon: string; unit: number }

export default function StorePage() {
  const { data, error, loading, reload } = useFetch<Catalog>('/api/store/catalog');
  const [tab, setTab] = useState<'CLUSTER' | 'BOT'>('CLUSTER');
  const [q, setQ] = useState('');
  const [months, setMonths] = useState(1);
  const [cart, setCart] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);

  const disc = data?.months.find((m) => m.months === months)?.discount ?? 0;
  const key = (l: { kind: string; slug: string }) => `${l.kind}:${l.slug}`;
  const inCart = (kind: string, slug: string) => cart.some((l) => key(l) === `${kind}:${slug}`);
  const toggle = (l: Line) => setCart((c) => (c.some((x) => key(x) === key(l)) ? c.filter((x) => key(x) !== key(l)) : [...c, l]));
  const total = cart.reduce((a, l) => a + priceWithDiscount(l.unit, months, disc), 0);

  const bots = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (data?.bots ?? []).filter((b) => !t || b.name.toLowerCase().includes(t) || (b.clusterName ?? '').toLowerCase().includes(t));
  }, [data, q]);

  const checkout = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ payUrl: string }>('/api/store/checkout', { items: cart.map((l) => ({ kind: l.kind, slug: l.slug, months })) });
      window.location.href = r.data.payUrl;
    } catch (e) {
      toast.error(extractError(e));
      setBusy(false);
    }
  };

  if (loading && !data) return <Spinner />;
  if (error) return <ErrorBox msg={error} onRetry={reload} />;
  if (!data) return null;
  const paidClusters = data.clusters.filter((c) => c.priceMonthly > 0);

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-8 items-start">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black mb-1">{data.settings.storeName || 'فروشگاه'}</h1>
          <p className="text-white/50 text-sm">خوشه‌های کامل (میزکار + همه‌ی رباتهای آن) یا ربات‌های تکی را با اشتراک ماهانه تهیه کنید. خرید چندماهه تخفیف دارد.</p>
        </div>
        {data.settings.announcement && <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-200 p-4 text-sm">📣 {data.settings.announcement}</div>}

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl overflow-hidden border border-white/15 text-sm">
            <button onClick={() => setTab('CLUSTER')} className={'px-5 py-2 ' + (tab === 'CLUSTER' ? 'bg-[#6a8dff]/30 font-bold' : 'text-white/60')}>خوشه‌ها ({num(paidClusters.length)})</button>
            <button onClick={() => setTab('BOT')} className={'px-5 py-2 ' + (tab === 'BOT' ? 'bg-[#6a8dff]/30 font-bold' : 'text-white/60')}>ربات‌های تکی ({num(data.bots.length)})</button>
          </div>
          {tab === 'BOT' && <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی ربات…" className={inputCls + ' w-56'} />}
        </div>

        {tab === 'CLUSTER' && (
          <>
            {paidClusters.length === 0 && <div className="rounded-2xl border border-white/10 p-8 text-center text-white/50 text-sm">هنوز قیمتی برای خوشه‌ها ثبت نشده است. همه‌ی خوشه‌ها فعلاً در <Link href="/clusters" className="text-[#6a8dff]">بخش خوشه‌ها</Link> قابل استفاده‌اند.</div>}
            <div className="grid sm:grid-cols-2 gap-4">
              {paidClusters.map((c) => {
                const owned = !!c.ownedUntil;
                const picked = inCart('CLUSTER', c.slug);
                return (
                  <div key={c.slug} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 flex flex-col gap-3" style={{ borderTop: `3px solid ${c.color}` }}>
                    <div className="flex items-center gap-3"><span className="text-3xl">{c.icon}</span><div><div className="font-black">{c.name}</div><div className="text-xs text-white/40">{num(c.botCount)} ربات + میزکار اختصاصی</div></div></div>
                    {c.description && <p className="text-xs text-white/60 leading-6 line-clamp-3">{c.description}</p>}
                    <div className="mt-auto flex items-center justify-between gap-2">
                      <div className="font-black">{toman(c.priceMonthly)}<span className="text-xs text-white/40 font-normal"> / ماه</span></div>
                      <Button size="sm" variant={picked ? 'ghost' : 'primary'} onClick={() => toggle({ kind: 'CLUSTER', slug: c.slug, name: c.name, icon: c.icon, unit: c.priceMonthly })}>{picked ? '✓ در سبد' : owned ? 'تمدید' : 'افزودن به سبد'}</Button>
                    </div>
                    {owned && <div className="text-[11px] text-green-300">فعال تا {dateFa(c.ownedUntil)}</div>}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === 'BOT' && (
          <div className="grid sm:grid-cols-2 gap-4">
            {bots.length === 0 && <div className="text-white/50 text-sm col-span-full text-center py-8">رباتی با قیمت ثبت‌شده پیدا نشد.</div>}
            {bots.map((b) => {
              const picked = inCart('BOT', b.slug);
              return (
                <div key={b.slug} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-3"><span className="text-2xl">{b.icon}</span><div><div className="font-bold text-sm">{b.name}</div>{b.clusterName && <div className="text-[11px] text-white/40">{b.clusterName}</div>}</div></div>
                  {b.description && <p className="text-xs text-white/55 leading-6 line-clamp-2">{b.description}</p>}
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <div className="font-black text-sm">{toman(b.priceMonthly)}<span className="text-xs text-white/40 font-normal"> / ماه</span></div>
                    {b.includedByCluster ? <span className="text-[11px] text-green-300">با خوشه فعال است</span> : <Button size="sm" variant={picked ? 'ghost' : 'primary'} onClick={() => toggle({ kind: 'BOT', slug: b.slug, name: b.name, icon: b.icon, unit: b.priceMonthly })}>{picked ? '✓ در سبد' : b.ownedUntil ? 'تمدید' : 'افزودن'}</Button>}
                  </div>
                  {b.ownedUntil && <div className="text-[11px] text-green-300">فعال تا {dateFa(b.ownedUntil)}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <aside className="lg:sticky lg:top-40 rounded-2xl border border-white/10 bg-white/[0.05] p-5 space-y-4">
        <h2 className="font-black">سبد خرید</h2>
        <div>
          <div className="text-xs text-white/50 mb-2">مدت اشتراک</div>
          <div className="grid grid-cols-4 gap-2">
            {data.months.map((m) => (
              <button key={m.months} onClick={() => setMonths(m.months)} className={'rounded-xl py-2 text-xs border ' + (months === m.months ? 'border-[#6a8dff] bg-[#6a8dff]/20 font-bold' : 'border-white/15 text-white/60')}>
                {num(m.months)} ماه{m.discount > 0 && <div className="text-[10px] text-green-300">{num(m.discount)}٪ تخفیف</div>}
              </button>
            ))}
          </div>
        </div>
        {cart.length === 0 ? <p className="text-sm text-white/40 text-center py-4">سبد خالی است.</p> : (
          <ul className="space-y-2 text-sm">
            {cart.map((l) => (
              <li key={key(l)} className="flex items-center justify-between gap-2">
                <span className="truncate">{l.icon} {l.name}</span>
                <span className="flex items-center gap-2 whitespace-nowrap text-white/70 text-xs">{toman(priceWithDiscount(l.unit, months, disc))}<button onClick={() => toggle(l)} className="text-red-400 text-base leading-none">×</button></span>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-white/10 pt-3 flex items-center justify-between"><span className="text-sm text-white/60">جمع کل</span><span className="font-black text-lg">{toman(total)}</span></div>
        <Button className="w-full" disabled={cart.length === 0 || !data.settings.zarinpal} loading={busy} onClick={checkout}>پرداخت و فعال‌سازی</Button>
        {!data.settings.zarinpal && <p className="text-[11px] text-amber-300 leading-5">درگاه پرداخت هنوز فعال نشده است.</p>}
        <p className="text-[11px] text-white/40 leading-5">پرداخت امن از طریق زرین‌پال. پس از پرداخت موفق، دسترسی بلافاصله فعال می‌شود. <Link href="/account/orders" className="text-[#6a8dff]">سفارش‌های من</Link></p>
      </aside>
    </div>
  );
}
