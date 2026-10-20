'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useFetch } from '@/lib/use-fetch';
import { dateFa, toman } from '@/lib/fmt';
import { ErrorBox, Spinner, StatusBadge } from '@/components/ui/bits';

interface Ord { id: string; code: string; status: string; amount: number; refId: string | null; createdAt: string; paidAt: string | null; items: { kind: string; title: string; months: number; total: number }[] }

export default function InvoicePage() {
  const { code } = useParams<{ code: string }>();
  const { user } = useAuth();
  const { data, error, loading, reload } = useFetch<{ orders: Ord[] }>('/api/store/me');
  if (loading && !data) return <Spinner />;
  if (error) return <ErrorBox msg={error} onRetry={reload} />;
  const o = data?.orders.find((x) => x.code === code);
  if (!o) return <div className="text-center py-16 text-white/50">سفارش پیدا نشد. <Link href="/account/orders" className="text-[#6a8dff]">بازگشت</Link></div>;
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex justify-between print:hidden"><Link href="/account/orders" className="text-sm text-white/50">← سفارش‌ها</Link><button onClick={() => window.print()} className="px-4 py-2 rounded-xl bg-white/10 text-sm">🖨 چاپ / ذخیره PDF</button></div>
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] print:bg-white print:text-black p-8 space-y-6">
        <div className="flex justify-between items-start"><div><div className="text-2xl font-black">فاکتور</div><div className="text-sm text-white/50">آشا — پلتفرم ربات‌های هوشمند</div></div><div className="text-left"><div dir="ltr" className="font-mono font-bold">{o.code}</div><StatusBadge status={o.status} /></div></div>
        <div className="text-sm space-y-1"><div>خریدار: <b>{user?.name}</b> (<span dir="ltr">{user?.email}</span>)</div><div>تاریخ ثبت: {dateFa(o.createdAt, true)}</div>{o.paidAt && <div>تاریخ پرداخت: {dateFa(o.paidAt, true)}</div>}{o.refId && <div>کد پیگیری: <span dir="ltr">{o.refId}</span></div>}</div>
        <table className="w-full text-sm"><thead className="text-white/50"><tr className="text-right border-b border-white/10"><th className="py-2">شرح</th><th>مدت</th><th className="text-left">مبلغ</th></tr></thead>
          <tbody>{o.items.map((i, k) => <tr key={k} className="border-b border-white/5"><td className="py-2">{i.kind === 'CLUSTER' ? 'خوشه' : 'ربات'} {i.title}</td><td>{i.months} ماه</td><td className="text-left">{toman(i.total)}</td></tr>)}</tbody></table>
        <div className="flex justify-between text-lg font-black border-t border-white/10 pt-4"><span>جمع کل</span><span>{toman(o.amount)}</span></div>
      </div>
    </div>
  );
}
