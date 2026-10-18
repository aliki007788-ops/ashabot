'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, API_URL, extractError } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader, Spinner, ErrorBox, Empty, Badge, Field, fieldCls, formatDate, formatToman } from '@/components/ui/kit';

const STATUS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'در انتظار', color: '#f59e0b' },
  PAID: { label: 'پرداخت‌شده', color: '#4ade80' },
  FAILED: { label: 'ناموفق', color: '#f87171' },
};
interface Payment { id: string; amount: number; description: string; status: string; refId: string | null; createdAt: string; paidAt: string | null; purpose: string | null }

export default function PaymentsPage() {
  const [items, setItems] = useState<Payment[]>([]);
  const [paid, setPaid] = useState(0);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [link, setLink] = useState('');

  const load = useCallback(async () => {
    try { const r = await api.get('/api/payments'); setItems(r.data.items || []); setPaid(r.data.totalPaid || 0); setConfigured(r.data.configured); }
    catch (e) { setError(extractError(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function create() {
    const a = Number(amount.replace(/[^\d]/g, ''));
    if (!a || !desc.trim()) return setError('مبلغ (تومان) و توضیح لازم است');
    try { setError(''); const r = await api.post('/api/payments', { amount: a, description: desc }); setLink(r.data.url); setAmount(''); setDesc(''); await load(); }
    catch (e) { setError(extractError(e)); }
  }
  const linkFor = (id: string) => `${API_URL}/api/payments/pay/${id}`;

  if (loading) return <Spinner />;
  return (
    <div>
      <PageHeader title="پرداخت‌ها" subtitle="لینک پرداخت آنلاین (زرین‌پال) بسازید یا بگذارید ربات با ابزار create_payment_link بسازد" />
      {!configured && <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl p-3 text-sm mb-4">درگاه هنوز تنظیم نشده است: متغیر <code dir="ltr">ZARINPAL_MERCHANT_ID</code> را در تنظیمات سرور (Render) اضافه کنید.</div>}
      <ErrorBox message={error} />
      <div className="grid md:grid-cols-[1fr_2fr] gap-4 mb-6">
        <Card><div className="text-xs text-white/50">مجموع دریافتی</div><div className="text-3xl font-black text-[#4ade80] mt-2">{formatToman(paid)}</div></Card>
        <Card>
          <div className="grid md:grid-cols-[1fr_2fr_auto] gap-3 items-end">
            <Field label="مبلغ (تومان)"><input className={fieldCls} dir="ltr" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
            <Field label="بابت"><input className={fieldCls} value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
            <Button onClick={create}>ساخت لینک</Button>
          </div>
          {link && <div className="mt-3 text-xs bg-white/5 rounded-lg p-3 flex items-center justify-between gap-2"><span dir="ltr" className="truncate">{link}</span><Button size="sm" variant="ghost" onClick={() => navigator.clipboard?.writeText(link)}>کپی</Button></div>}
        </Card>
      </div>
      {items.length === 0 ? <Empty icon="💳" text="تراکنشی ثبت نشده است." /> : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-white/60 text-xs"><tr>{['بابت', 'مبلغ', 'وضعیت', 'کد پیگیری', 'تاریخ', 'لینک'].map((h) => <th key={h} className="text-right p-3 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t border-white/5">
                  <td className="p-3">{p.description}{p.purpose === 'bot' && <span className="text-[10px] text-white/40"> · ساخته‌شده توسط ربات</span>}</td>
                  <td className="p-3 font-bold">{formatToman(p.amount)}</td>
                  <td className="p-3"><Badge color={STATUS[p.status]?.color}>{STATUS[p.status]?.label || p.status}</Badge></td>
                  <td className="p-3 text-xs" dir="ltr">{p.refId || '—'}</td>
                  <td className="p-3 text-xs text-white/50">{formatDate(p.paidAt || p.createdAt)}</td>
                  <td className="p-3">{p.status === 'PENDING' && <button className="text-[#6a8dff] text-xs hover:underline" onClick={() => navigator.clipboard?.writeText(linkFor(p.id))}>کپی لینک</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
