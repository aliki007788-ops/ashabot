'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api, extractError } from '@/lib/api';
import { useFetch } from '@/lib/use-fetch';
import { num, toman } from '@/lib/fmt';
import { ErrorBox, Spinner, inputCls } from '@/components/ui/bits';
import { Button } from '@/components/ui/button';

interface Cl { slug: string; name: string; icon: string; color: string; isActive: boolean; priceMonthly: number; botCount: number; sold: number }
interface Bt { slug: string; name: string; icon: string; isActive: boolean; isPremium: boolean; priceMonthly: number; sold: number; cluster: { name: string; slug: string } | null }

function PriceCell({ kind, slug, value, onSaved }: { kind: 'cluster' | 'bot'; slug: string; value: number; onSaved: (v: number) => void }) {
  const [v, setV] = useState(String(value));
  const [busy, setBusy] = useState(false);
  useEffect(() => setV(String(value)), [value]);
  const dirty = Number(v) !== value;
  const save = async () => {
    const n = Math.max(0, Math.round(Number(v) || 0));
    setBusy(true);
    try { await api.patch(`/api/admin/catalog/${kind}/${slug}`, { priceMonthly: n }); onSaved(n); toast.success('قیمت ذخیره شد'); } catch (e) { toast.error(extractError(e)); } finally { setBusy(false); }
  };
  return (
    <div className="flex items-center gap-2">
      <input type="number" min={0} step={1000} value={v} onChange={(e) => setV(e.target.value)} className={inputCls + ' w-32 py-1.5'} dir="ltr" />
      <span className="text-xs text-white/40">تومان/ماه</span>
      {dirty && <button disabled={busy} onClick={save} className="px-3 py-1 rounded-lg bg-[#6a8dff] text-white text-xs font-bold">ذخیره</button>}
    </div>
  );
}

export default function AdminCatalog() {
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  useEffect(() => { const t = setTimeout(() => setDq(q), 350); return () => clearTimeout(t); }, [q]);
  const { data, error, loading, reload, setData } = useFetch<{ clusters: Cl[]; bots: Bt[] }>('/api/admin/catalog', { q: dq });
  const [bulkKind, setBulkKind] = useState<'CLUSTER' | 'BOT'>('CLUSTER');
  const [bulkPrice, setBulkPrice] = useState('');
  const [onlyUnpriced, setOnlyUnpriced] = useState(true);

  const setC = (slug: string, p: number) => setData((d) => (d ? { ...d, clusters: d.clusters.map((c) => (c.slug === slug ? { ...c, priceMonthly: p } : c)) } : d));
  const setB = (slug: string, p: number) => setData((d) => (d ? { ...d, bots: d.bots.map((b) => (b.slug === slug ? { ...b, priceMonthly: p } : b)) } : d));

  const bulk = async () => {
    const n = Math.round(Number(bulkPrice));
    if (!(n >= 0)) return toast.error('قیمت را وارد کنید');
    if (!confirm(`قیمت ${bulkKind === 'CLUSTER' ? 'همه‌ی خوشه‌ها' : 'همه‌ی ربات‌ها'}${onlyUnpriced ? ' (فقط بدون قیمت)' : ''} روی ${toman(n)} تنظیم شود؟`)) return;
    try { const r = await api.post<{ updated: number }>('/api/admin/catalog/bulk', { kind: bulkKind, priceMonthly: n, onlyUnpriced }); toast.success(`${num(r.data.updated)} مورد به‌روز شد`); await reload(); } catch (e) { toast.error(extractError(e)); }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black mb-1">قیمت‌ها و کاتالوگ</h1>
        <p className="text-white/50 text-sm">قیمت ماهانه‌ی هر خوشه/ربات (تومان). قیمت صفر یعنی «رایگان».</p>
      </div>
      {error && <ErrorBox msg={error} onRetry={reload} />}

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
        <h2 className="font-black">تنظیم گروهی قیمت</h2>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <select value={bulkKind} onChange={(e) => setBulkKind(e.target.value as 'CLUSTER' | 'BOT')} className={inputCls}><option value="CLUSTER">همه‌ی خوشه‌ها</option><option value="BOT">همه‌ی ربات‌ها</option></select>
          <input type="number" min={0} value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)} placeholder="مثلاً 490000" dir="ltr" className={inputCls + ' w-40'} />
          <label className="flex items-center gap-2 text-white/70"><input type="checkbox" checked={onlyUnpriced} onChange={(e) => setOnlyUnpriced(e.target.checked)} />فقط مواردی که قیمت ندارند</label>
          <Button size="sm" onClick={bulk}>اعمال</Button>
        </div>
      </section>

      {loading && !data ? <Spinner /> : data && (
        <>
          <section className="space-y-2">
            <h2 className="font-black">خوشه‌ها ({num(data.clusters.length)})</h2>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] divide-y divide-white/5">
              {data.clusters.map((c) => (
                <div key={c.slug} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                  <div className="flex items-center gap-3"><span className="text-xl">{c.icon}</span><div><div className="font-bold">{c.name}{!c.isActive && <span className="text-red-400 text-[10px] mr-2">غیرفعال</span>}</div><div className="text-[11px] text-white/40">{num(c.botCount)} ربات · {num(c.sold)} فروش</div></div></div>
                  <PriceCell kind="cluster" slug={c.slug} value={c.priceMonthly} onSaved={(p) => setC(c.slug, p)} />
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap"><h2 className="font-black">ربات‌ها (تا ۳۰۰ مورد)</h2><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی ربات…" className={inputCls + ' w-56'} /></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] divide-y divide-white/5">
              {data.bots.map((b) => (
                <div key={b.slug} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                  <div className="flex items-center gap-3"><span className="text-xl">{b.icon}</span><div><div className="font-bold">{b.name}{b.isPremium && <span className="text-amber-300 text-[10px] mr-2">پرمیوم</span>}</div><div className="text-[11px] text-white/40">{b.cluster?.name ?? 'بدون خوشه'} · {num(b.sold)} فروش</div></div></div>
                  <PriceCell kind="bot" slug={b.slug} value={b.priceMonthly} onSaved={(p) => setB(b.slug, p)} />
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
