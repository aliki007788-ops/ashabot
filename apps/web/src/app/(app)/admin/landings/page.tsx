'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { api, extractError } from '@/lib/api';
import { useFetch } from '@/lib/use-fetch';
import { num } from '@/lib/fmt';
import { ErrorBox, Spinner } from '@/components/ui/bits';

interface Row {
  slug: string; name: string; icon: string; color: string; isActive: boolean; priceMonthly: number;
  landingActive: boolean; trialEnabled: boolean | null; trialDays: number | null; demoEnabled: boolean | null; views: number; trials: number; customized: boolean;
}

export default function AdminLandings() {
  const { data, error, loading, reload, setData } = useFetch<{ items: Row[] }>('/api/admin/landings');
  const [busy, setBusy] = useState('');

  const patch = async (slug: string, body: Record<string, unknown>) => {
    setBusy(slug);
    try {
      await api.put(`/api/admin/landings/${slug}`, body);
      setData((d) => (d ? { items: d.items.map((r) => (r.slug === slug ? { ...r, ...(body as Partial<Row>), landingActive: (body.isActive as boolean | undefined) ?? r.landingActive } : r)) } : d));
    } catch (e) { toast.error(extractError(e)); } finally { setBusy(''); }
  };
  const bulk = async (field: 'isActive' | 'trialEnabled' | 'demoEnabled', value: boolean, label: string) => {
    if (!confirm(`${label} برای همه‌ی ۲۷ لندینگ؟`)) return;
    try { await api.post('/api/admin/landings/bulk', { field, value }); toast.success('انجام شد'); await reload(); } catch (e) { toast.error(extractError(e)); }
  };

  if (loading && !data) return <Spinner />;
  if (error) return <ErrorBox msg={error} onRetry={reload} />;
  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-black mb-1">لندینگ‌ها</h1><p className="text-white/50 text-sm">هر خوشه یک صفحه‌ی فروش عمومی در <code dir="ltr">/c/نام-خوشه</code> دارد. اینجا فعال/غیرفعال، دوره‌ی رایگان، دمو و متن هر صفحه را کنترل می‌کنید.</p></div>
      <div className="flex flex-wrap gap-2 text-xs">
        <button onClick={() => bulk('isActive', true, 'فعال‌کردن')} className="px-3 py-2 rounded-lg bg-white/10">فعال‌کردن همه</button>
        <button onClick={() => bulk('isActive', false, 'غیرفعال‌کردن')} className="px-3 py-2 rounded-lg bg-white/10">غیرفعال‌کردن همه</button>
        <button onClick={() => bulk('trialEnabled', true, 'روشن‌کردن دوره‌ی رایگان')} className="px-3 py-2 rounded-lg bg-white/10">روشن‌کردن دوره‌ی رایگان همه</button>
        <button onClick={() => bulk('trialEnabled', false, 'خاموش‌کردن دوره‌ی رایگان')} className="px-3 py-2 rounded-lg bg-white/10">خاموش‌کردن دوره‌ی رایگان همه</button>
        <button onClick={() => bulk('demoEnabled', false, 'خاموش‌کردن دمو')} className="px-3 py-2 rounded-lg bg-white/10">خاموش‌کردن دموی همه</button>
        <Link href="/c" target="_blank" className="px-3 py-2 rounded-lg bg-[#6a8dff]/25 text-[#9fb4ff]">مشاهده‌ی صفحه‌ی عمومی ↗</Link>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="text-white/50 text-xs"><tr className="text-right"><th className="p-3">خوشه</th><th>صفحه</th><th>دوره‌ی رایگان</th><th>روز</th><th>دمو</th><th>بازدید</th><th>شروع رایگان</th><th /></tr></thead>
          <tbody>
            {(data?.items ?? []).map((r) => (
              <tr key={r.slug} className="border-t border-white/5">
                <td className="p-3"><span className="ml-2">{r.icon}</span><b>{r.name}</b>{!r.isActive && <span className="text-red-400 text-[10px] mr-2">خوشه غیرفعال</span>}{r.customized && <span className="text-[10px] text-[#9fb4ff] mr-2">ویرایش‌شده</span>}<div className="text-[11px] text-white/40" dir="ltr" style={{ textAlign: 'right' }}>/c/{r.slug}</div></td>
                <td><input type="checkbox" disabled={busy === r.slug} checked={r.landingActive} onChange={(e) => patch(r.slug, { isActive: e.target.checked })} className="w-4 h-4" /></td>
                <td>
                  <select disabled={busy === r.slug} value={r.trialEnabled === null ? 'inherit' : r.trialEnabled ? 'on' : 'off'} onChange={(e) => patch(r.slug, { trialEnabled: e.target.value === 'inherit' ? null : e.target.value === 'on' })} className="bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-xs">
                    <option value="inherit">طبق تنظیم کلی</option><option value="on">روشن</option><option value="off">خاموش</option>
                  </select>
                </td>
                <td><input type="number" min={1} max={365} defaultValue={r.trialDays ?? ''} placeholder="پیش‌فرض" onBlur={(e) => { const v = e.target.value === '' ? null : Number(e.target.value); if (v !== r.trialDays) void patch(r.slug, { trialDays: v }); }} className="w-20 bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-xs" dir="ltr" /></td>
                <td>
                  <select disabled={busy === r.slug} value={r.demoEnabled === null ? 'inherit' : r.demoEnabled ? 'on' : 'off'} onChange={(e) => patch(r.slug, { demoEnabled: e.target.value === 'inherit' ? null : e.target.value === 'on' })} className="bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-xs">
                    <option value="inherit">طبق تنظیم کلی</option><option value="on">روشن</option><option value="off">خاموش</option>
                  </select>
                </td>
                <td className="text-white/60">{num(r.views)}</td>
                <td className="text-white/60">{num(r.trials)}</td>
                <td className="whitespace-nowrap"><Link href={`/admin/landings/${r.slug}`} className="text-[#6a8dff] text-xs px-2">ویرایش متن</Link><Link href={`/c/${r.slug}`} target="_blank" className="text-white/50 text-xs px-2">دیدن ↗</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-white/40 leading-6">«شروع رایگان» تعداد کاربرانی است که دوره‌ی رایگان آن خوشه را گرفته‌اند. دوره‌ی رایگان فقط برای خوشه‌های قیمت‌دار نمایش داده می‌شود.</p>
    </div>
  );
}
