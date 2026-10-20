'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api, extractError } from '@/lib/api';
import { useFetch } from '@/lib/use-fetch';
import { num, toman } from '@/lib/fmt';
import { ErrorBox, Spinner, inputCls } from '@/components/ui/bits';
import { Button } from '@/components/ui/button';

interface Cl { slug: string; name: string; icon: string; color: string; description: string | null; sortOrder: number; isActive: boolean; priceMonthly: number; botCount: number; sold: number }
interface Bt { slug: string; name: string; icon: string; description: string | null; isActive: boolean; isPremium: boolean; priceMonthly: number; sold: number; cluster: { name: string; slug: string } | null }

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

type Edit = { kind: 'cluster' | 'bot'; slug: string; name: string; description: string; icon: string; color?: string; sortOrder?: number; isPremium?: boolean };

function EditModal({ e, onClose, onSaved }: { e: Edit; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState<Edit>(e);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      const body = v.kind === 'cluster'
        ? { name: v.name, description: v.description, icon: v.icon, color: v.color, sortOrder: Number(v.sortOrder) || 0 }
        : { name: v.name, description: v.description, icon: v.icon, isPremium: !!v.isPremium };
      await api.patch(`/api/admin/catalog/${v.kind}/${v.slug}`, body);
      toast.success('ذخیره شد');
      onSaved();
    } catch (err) { toast.error(extractError(err)); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl bg-[#0e1224] border border-white/10 p-6 space-y-4" onClick={(x) => x.stopPropagation()}>
        <h3 className="text-lg font-black">ویرایش {v.kind === 'cluster' ? 'خوشه' : 'ربات'}</h3>
        <div className="grid grid-cols-[80px_1fr] gap-3"><input className={inputCls + ' text-center text-xl'} value={v.icon} maxLength={8} onChange={(x) => setV({ ...v, icon: x.target.value })} /><input className={inputCls} value={v.name} onChange={(x) => setV({ ...v, name: x.target.value })} placeholder="نام" /></div>
        <textarea className={inputCls + ' w-full h-24'} value={v.description} onChange={(x) => setV({ ...v, description: x.target.value })} placeholder="توضیح" />
        {v.kind === 'cluster' ? (
          <div className="flex gap-3 items-center text-sm"><label>رنگ</label><input type="color" value={v.color} onChange={(x) => setV({ ...v, color: x.target.value })} /><label className="mr-4">ترتیب نمایش</label><input type="number" className={inputCls + ' w-24'} value={v.sortOrder} onChange={(x) => setV({ ...v, sortOrder: Number(x.target.value) })} dir="ltr" /></div>
        ) : (
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!v.isPremium} onChange={(x) => setV({ ...v, isPremium: x.target.checked })} />ربات پرمیوم</label>
        )}
        <div className="flex gap-3"><Button loading={busy} onClick={save}>ذخیره</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></div>
      </div>
    </div>
  );
}

function ActiveToggle({ kind, slug, value, onChanged }: { kind: 'cluster' | 'bot'; slug: string; value: boolean; onChanged: (v: boolean) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <label className="flex items-center gap-1.5 text-xs text-white/60 cursor-pointer">
      <input type="checkbox" disabled={busy} checked={value} className="w-4 h-4" onChange={async (e) => {
        setBusy(true);
        try { await api.patch(`/api/admin/catalog/${kind}/${slug}`, { isActive: e.target.checked }); onChanged(e.target.checked); } catch (err) { toast.error(extractError(err)); } finally { setBusy(false); }
      }} />
      فعال
    </label>
  );
}

export default function AdminCatalog() {
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  useEffect(() => { const t = setTimeout(() => setDq(q), 350); return () => clearTimeout(t); }, [q]);
  const { data, error, loading, reload, setData } = useFetch<{ clusters: Cl[]; bots: Bt[] }>('/api/admin/catalog', { q: dq });
  const [edit, setEdit] = useState<Edit | null>(null);
  const [bulkKind, setBulkKind] = useState<'CLUSTER' | 'BOT'>('CLUSTER');
  const [bulkPrice, setBulkPrice] = useState('');
  const [onlyUnpriced, setOnlyUnpriced] = useState(true);

  const setC = (slug: string, p: number) => setData((d) => (d ? { ...d, clusters: d.clusters.map((c) => (c.slug === slug ? { ...c, priceMonthly: p } : c)) } : d));
  const setB = (slug: string, p: number) => setData((d) => (d ? { ...d, bots: d.bots.map((b) => (b.slug === slug ? { ...b, priceMonthly: p } : b)) } : d));

  const setCA = (slug: string, a: boolean) => setData((d) => (d ? { ...d, clusters: d.clusters.map((c) => (c.slug === slug ? { ...c, isActive: a } : c)) } : d));
  const setBA = (slug: string, a: boolean) => setData((d) => (d ? { ...d, bots: d.bots.map((b) => (b.slug === slug ? { ...b, isActive: a } : b)) } : d));

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
                  <div className="flex flex-wrap items-center gap-3">
                    <ActiveToggle kind="cluster" slug={c.slug} value={c.isActive} onChanged={(a) => setCA(c.slug, a)} />
                    <button className="text-xs text-[#6a8dff]" onClick={() => setEdit({ kind: 'cluster', slug: c.slug, name: c.name, description: c.description ?? '', icon: c.icon, color: c.color, sortOrder: c.sortOrder })}>ویرایش</button>
                    <PriceCell kind="cluster" slug={c.slug} value={c.priceMonthly} onSaved={(p) => setC(c.slug, p)} />
                  </div>
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
                  <div className="flex flex-wrap items-center gap-3">
                    <ActiveToggle kind="bot" slug={b.slug} value={b.isActive} onChanged={(a) => setBA(b.slug, a)} />
                    <button className="text-xs text-[#6a8dff]" onClick={() => setEdit({ kind: 'bot', slug: b.slug, name: b.name, description: b.description ?? '', icon: b.icon, isPremium: b.isPremium })}>ویرایش</button>
                    <PriceCell kind="bot" slug={b.slug} value={b.priceMonthly} onSaved={(p) => setB(b.slug, p)} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
      {edit && <EditModal e={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); void reload(); }} />}
    </div>
  );
}
