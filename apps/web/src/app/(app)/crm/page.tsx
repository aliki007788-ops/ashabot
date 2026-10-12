'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, extractError } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader, Spinner, ErrorBox, Empty, Badge, Field, fieldCls, formatDate } from '@/components/ui/kit';

const STAGES: Record<string, { label: string; color: string }> = {
  NEW: { label: 'جدید', color: '#6a8dff' },
  CONTACTED: { label: 'تماس گرفته‌شده', color: '#22d3ee' },
  QUALIFIED: { label: 'واجد شرایط', color: '#a78bfa' },
  PROPOSAL: { label: 'پیشنهاد داده‌شده', color: '#f59e0b' },
  WON: { label: 'موفق', color: '#4ade80' },
  LOST: { label: 'از دست رفته', color: '#f87171' },
};

interface Contact { id: string; name: string | null; phone: string | null; email: string | null; stage: string; score: number; source: string | null; notes: string | null; createdAt: string }

export default function CrmPage() {
  const [items, setItems] = useState<Contact[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [stage, setStage] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', email: '' });

  const load = useCallback(async () => {
    try {
      const r = await api.get('/api/crm', { params: { stage: stage || undefined, q: q || undefined } });
      setItems(r.data.items || []); setCounts(r.data.counts || {});
    } catch (e) { setError(extractError(e)); } finally { setLoading(false); }
  }, [stage, q]);
  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!form.name && !form.phone && !form.email) return;
    try { await api.post('/api/crm', form); setForm({ name: '', phone: '', email: '' }); await load(); } catch (e) { setError(extractError(e)); }
  }
  async function setStageOf(id: string, s: string) {
    try { await api.patch(`/api/crm/${id}`, { stage: s }); await load(); } catch (e) { setError(extractError(e)); }
  }
  async function remove(id: string) {
    if (!confirm('حذف شود؟')) return;
    try { await api.delete(`/api/crm/${id}`); await load(); } catch (e) { setError(extractError(e)); }
  }
  async function exportCsv() {
    try {
      const r = await api.get('/api/crm/export.csv', { responseType: 'blob' });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a'); a.href = url; a.download = 'contacts.csv'; a.click(); URL.revokeObjectURL(url);
    } catch (e) { setError(extractError(e)); }
  }

  if (loading) return <Spinner />;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return (
    <div>
      <PageHeader title="مشتریان و سرنخ‌ها (CRM)" subtitle={`${total} مخاطب — سرنخ‌هایی که ربات‌ها با ابزار save_lead ثبت می‌کنند اینجا جمع می‌شود`} actions={<Button variant="ghost" size="sm" onClick={exportCsv}>خروجی CSV</Button>} />
      <ErrorBox message={error} />
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        {Object.entries(STAGES).map(([k, v]) => (
          <button key={k} onClick={() => setStage(stage === k ? '' : k)} className={'rounded-xl p-3 text-right border transition ' + (stage === k ? 'border-white/40 bg-white/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/5')}>
            <div className="text-2xl font-black" style={{ color: v.color }}>{counts[k] || 0}</div>
            <div className="text-xs text-white/60">{v.label}</div>
          </button>
        ))}
      </div>
      <Card className="mb-6">
        <div className="grid md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
          <Field label="نام"><input className={fieldCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="موبایل"><input className={fieldCls} dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="ایمیل"><input className={fieldCls} dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Button onClick={add}>افزودن</Button>
        </div>
      </Card>
      <input className={fieldCls + ' mb-4'} placeholder="جست‌وجو در نام، موبایل، ایمیل..." value={q} onChange={(e) => setQ(e.target.value)} />
      {items.length === 0 ? <Empty icon="👥" text="مخاطبی نیست." /> : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-white/60 text-xs">
              <tr>{['نام', 'تماس', 'مرحله', 'امتیاز', 'منبع', 'تاریخ', ''].map((h) => <th key={h} className="text-right p-3 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                  <td className="p-3 font-bold">{c.name || '—'}{c.notes && <div className="text-[11px] text-white/40 font-normal">{c.notes}</div>}</td>
                  <td className="p-3 text-xs" dir="ltr">{c.phone || ''}<br />{c.email || ''}</td>
                  <td className="p-3">
                    <select className="bg-transparent text-xs border border-white/15 rounded-lg px-2 py-1" value={c.stage} onChange={(e) => setStageOf(c.id, e.target.value)}>
                      {Object.entries(STAGES).map(([k, v]) => <option key={k} value={k} className="text-black">{v.label}</option>)}
                    </select>
                  </td>
                  <td className="p-3"><Badge color={c.score >= 70 ? '#4ade80' : c.score >= 40 ? '#f59e0b' : '#94a3b8'}>{c.score}</Badge></td>
                  <td className="p-3 text-xs text-white/50">{c.source}</td>
                  <td className="p-3 text-xs text-white/50">{formatDate(c.createdAt)}</td>
                  <td className="p-3"><button className="text-red-400 text-xs hover:underline" onClick={() => remove(c.id)}>حذف</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
