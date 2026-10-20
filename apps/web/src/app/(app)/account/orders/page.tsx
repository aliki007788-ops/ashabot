'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { api, extractError } from '@/lib/api';
import { useFetch } from '@/lib/use-fetch';
import { dateFa, toman } from '@/lib/fmt';
import { Empty, ErrorBox, Spinner, StatusBadge } from '@/components/ui/bits';

interface Ord { id: string; code: string; status: string; amount: number; refId: string | null; createdAt: string; paidAt: string | null; items: { title: string; months: number; total: number }[] }

function Inner() {
  const sp = useSearchParams();
  const status = sp.get('status');
  const code = sp.get('order');
  const { data, error, loading, reload } = useFetch<{ orders: Ord[] }>('/api/store/me');
  const [busy, setBusy] = useState('');

  const pay = async (id: string) => {
    setBusy(id);
    try { const r = await api.post<{ payUrl: string }>(`/api/store/orders/${id}/pay`); window.location.href = r.data.payUrl; } catch (e) { toast.error(extractError(e)); setBusy(''); }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between"><h1 className="text-3xl font-black">سفارش‌های من</h1><Link href="/account" className="text-sm text-white/50">← حساب من</Link></div>
      {status === 'ok' && <div className="rounded-2xl border border-green-500/30 bg-green-500/10 text-green-300 p-4 text-sm">✅ پرداخت موفق بود{code && <> (سفارش <span dir="ltr">{code}</span>)</>}. اشتراک شما فعال شد؛ از <Link href="/account" className="underline">حساب من</Link> می‌توانید استفاده کنید.</div>}
      {status === 'fail' && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 text-red-300 p-4 text-sm">❌ پرداخت انجام نشد یا لغو شد. مبلغی کسر نشده؛ اگر کسر شده، تا ۷۲ ساعت به حساب برمی‌گردد. می‌توانید دوباره تلاش کنید.</div>}
      {error && <ErrorBox msg={error} onRetry={reload} />}
      {loading && !data ? <Spinner /> : data && (data.orders.length === 0 ? <Empty text="هنوز سفارشی ثبت نکرده‌اید" /> : (
        <div className="space-y-3">
          {data.orders.map((o) => (
            <div key={o.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-3"><span dir="ltr" className="font-mono font-bold">{o.code}</span><StatusBadge status={o.status} /></div><div className="font-black">{toman(o.amount)}</div></div>
              <div className="text-white/70">{o.items.map((i) => `${i.title} (${i.months} ماه)`).join('، ')}</div>
              <div className="text-xs text-white/40">{dateFa(o.createdAt, true)}{o.refId && <span dir="ltr"> · کد پیگیری {o.refId}</span>}</div>
              <div className="flex gap-2 pt-1">
                {(o.status === 'PENDING' || o.status === 'FAILED') && <button disabled={busy === o.id} onClick={() => pay(o.id)} className="px-4 py-1.5 rounded-lg bg-[#6a8dff] text-white text-xs font-bold">پرداخت</button>}
                <Link href={`/account/orders/${o.code}`} className="px-4 py-1.5 rounded-lg bg-white/10 text-xs">فاکتور</Link>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Inner />
    </Suspense>
  );
}
