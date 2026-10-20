'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api, extractError } from '@/lib/api';
import { useFetch } from '@/lib/use-fetch';
import { dateFa, toman } from '@/lib/fmt';
import { Empty, ErrorBox, Pager, Spinner, StatusBadge, inputCls, selectCls } from '@/components/ui/bits';

interface Order {
  id: string; code: string; status: string; amount: number; gateway: string | null; refId: string | null; createdAt: string; paidAt: string | null; note: string | null;
  items: { id: string; title: string; kind: string; months: number; total: number }[];
  user: { name: string; email: string };
}
const TAKE = 25;

export default function AdminOrders() {
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const [status, setStatus] = useState('');
  const [skip, setSkip] = useState(0);
  const [busy, setBusy] = useState('');
  useEffect(() => { const t = setTimeout(() => { setDq(q); setSkip(0); }, 350); return () => clearTimeout(t); }, [q]);
  const { data, error, loading, reload } = useFetch<{ items: Order[]; total: number; paidSum: number }>('/api/admin/orders', { q: dq, status, skip, take: TAKE });

  const act = async (id: string, path: 'mark-paid' | 'cancel', ok: string) => {
    if (path === 'mark-paid' && !confirm('سفارش «پرداخت‌شده» شود و دسترسی‌ها فعال گردد؟ (مثلاً پرداخت کارت‌به‌کارت)')) return;
    if (path === 'cancel' && !confirm('سفارش لغو شود؟')) return;
    setBusy(id);
    try { await api.post(`/api/admin/orders/${id}/${path}`, path === 'mark-paid' ? { note: 'تأیید دستی مدیر' } : {}); toast.success(ok); await reload(); } catch (e) { toast.error(extractError(e)); } finally { setBusy(''); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-black">سفارش‌ها</h1>
        {data && <div className="text-sm text-white/60">جمع پرداخت‌شده‌ها در این فیلتر: <b className="text-green-300">{toman(data.paidSum)}</b></div>}
      </div>
      <div className="flex flex-wrap gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="کد سفارش یا ایمیل…" className={inputCls + ' flex-1 min-w-[200px]'} />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setSkip(0); }} className={selectCls}>
          <option value="">همه‌ی وضعیت‌ها</option>
          <option value="PENDING">در انتظار پرداخت</option><option value="PAID">پرداخت‌شده</option><option value="FAILED">ناموفق</option><option value="CANCELED">لغو‌شده</option>
        </select>
      </div>
      {error && <ErrorBox msg={error} onRetry={reload} />}
      {loading && !data ? <Spinner /> : data && (
        <div className="space-y-3">
          {data.items.length === 0 && <Empty text="سفارشی پیدا نشد" />}
          {data.items.map((o) => (
            <div key={o.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3"><span dir="ltr" className="font-mono font-bold">{o.code}</span><StatusBadge status={o.status} /></div>
                <div className="font-black">{toman(o.amount)}</div>
              </div>
              <div className="text-white/60">{o.user.name} · <span dir="ltr">{o.user.email}</span> · {dateFa(o.createdAt, true)}{o.paidAt && ` · پرداخت: ${dateFa(o.paidAt, true)}`}{o.refId && <span dir="ltr"> · ref {o.refId}</span>}</div>
              <div className="text-white/80">{o.items.map((i) => `${i.kind === 'CLUSTER' ? 'خوشه' : 'ربات'} ${i.title} × ${i.months} ماه`).join(' ، ')}</div>
              {o.note && <div className="text-xs text-white/40">یادداشت: {o.note}</div>}
              {(o.status === 'PENDING' || o.status === 'FAILED') && (
                <div className="flex gap-2 pt-1">
                  <button disabled={busy === o.id} onClick={() => act(o.id, 'mark-paid', 'سفارش پرداخت‌شده شد')} className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-300 text-xs font-bold">✓ تأیید پرداخت دستی</button>
                  <button disabled={busy === o.id} onClick={() => act(o.id, 'cancel', 'سفارش لغو شد')} className="px-3 py-1.5 rounded-lg bg-white/10 text-white/70 text-xs">لغو</button>
                </div>
              )}
            </div>
          ))}
          <Pager skip={skip} take={TAKE} total={data.total} onChange={setSkip} />
        </div>
      )}
    </div>
  );
}
