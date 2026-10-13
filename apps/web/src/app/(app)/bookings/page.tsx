'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, extractError } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader, Spinner, ErrorBox, Empty, Badge, Field, fieldCls, formatDate } from '@/components/ui/kit';

const STATUS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'در انتظار', color: '#f59e0b' },
  CONFIRMED: { label: 'تأیید‌شده', color: '#4ade80' },
  DONE: { label: 'انجام‌شده', color: '#22d3ee' },
  CANCELLED: { label: 'لغو‌شده', color: '#f87171' },
  NO_SHOW: { label: 'غیبت', color: '#94a3b8' },
};
interface Booking { id: string; customerName: string; customerPhone: string | null; service: string; startsAt: string; status: string }

export default function BookingsPage() {
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [f, setF] = useState({ customerName: '', customerPhone: '', service: '', when: '' });

  const load = useCallback(async () => {
    try { const r = await api.get('/api/bookings'); setItems(r.data.items || []); }
    catch (e) { setError(extractError(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!f.customerName || !f.service || !f.when) return setError('نام، خدمت و زمان لازم است');
    try {
      setError('');
      await api.post('/api/bookings', { customerName: f.customerName, customerPhone: f.customerPhone || undefined, service: f.service, startsAt: new Date(f.when).toISOString() });
      setF({ customerName: '', customerPhone: '', service: '', when: '' });
      await load();
    } catch (e) { setError(extractError(e)); }
  }
  async function setStatus(id: string, status: string) {
    try { await api.patch(`/api/bookings/${id}`, { status }); await load(); } catch (e) { setError(extractError(e)); }
  }
  async function remove(id: string) {
    if (!confirm('حذف شود؟')) return;
    try { await api.delete(`/api/bookings/${id}`); await load(); } catch (e) { setError(extractError(e)); }
  }

  if (loading) return <Spinner />;
  return (
    <div>
      <PageHeader title="نوبت‌ها و رزروها" subtitle="رزروهایی که ربات‌های نوبت‌دهی ثبت می‌کنند (ابزار create_booking) و رزروهای دستی" />
      <ErrorBox message={error} />
      <Card className="mb-6">
        <div className="grid md:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 items-end">
          <Field label="نام مشتری"><input className={fieldCls} value={f.customerName} onChange={(e) => setF({ ...f, customerName: e.target.value })} /></Field>
          <Field label="موبایل"><input className={fieldCls} dir="ltr" value={f.customerPhone} onChange={(e) => setF({ ...f, customerPhone: e.target.value })} /></Field>
          <Field label="خدمت"><input className={fieldCls} value={f.service} onChange={(e) => setF({ ...f, service: e.target.value })} /></Field>
          <Field label="زمان"><input type="datetime-local" className={fieldCls} value={f.when} onChange={(e) => setF({ ...f, when: e.target.value })} /></Field>
          <Button onClick={add}>ثبت نوبت</Button>
        </div>
      </Card>
      {items.length === 0 ? <Empty icon="📅" text="نوبتی ثبت نشده است." /> : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-white/60 text-xs"><tr>{['مشتری', 'خدمت', 'زمان', 'وضعیت', ''].map((h) => <th key={h} className="text-right p-3 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {items.map((b) => (
                <tr key={b.id} className="border-t border-white/5">
                  <td className="p-3 font-bold">{b.customerName}<div className="text-xs text-white/40 font-normal" dir="ltr">{b.customerPhone}</div></td>
                  <td className="p-3">{b.service}</td>
                  <td className="p-3 text-xs">{formatDate(b.startsAt)}</td>
                  <td className="p-3">
                    <select className="bg-transparent text-xs border border-white/15 rounded-lg px-2 py-1" value={b.status} onChange={(e) => setStatus(b.id, e.target.value)}>
                      {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k} className="text-black">{v.label}</option>)}
                    </select>{' '}
                    <Badge color={STATUS[b.status]?.color}>{STATUS[b.status]?.label}</Badge>
                  </td>
                  <td className="p-3"><button className="text-red-400 text-xs hover:underline" onClick={() => remove(b.id)}>حذف</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
