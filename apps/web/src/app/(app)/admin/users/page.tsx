'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api, extractError } from '@/lib/api';
import { useFetch } from '@/lib/use-fetch';
import { dateFa, toman } from '@/lib/fmt';
import { Empty, ErrorBox, Pager, Spinner, StatusBadge, inputCls, selectCls } from '@/components/ui/bits';
import { Button } from '@/components/ui/button';

interface UserRow { id: string; name: string; email: string; role: string; isActive: boolean; createdAt: string; _count: { orders: number; entitlements: number; bots: number } }
interface Detail {
  id: string; name: string; email: string; role: string; isActive: boolean; createdAt: string;
  entitlements: { id: string; kind: string; refSlug: string; source: string; expiresAt: string }[];
  orders: { id: string; code: string; status: string; amount: number; createdAt: string; items: { title: string; months: number }[] }[];
  _count: { bots: number; conversations: number };
}
interface Catalog { clusters: { slug: string; name: string }[]; bots: { slug: string; name: string }[] }

const TAKE = 25;

export default function AdminUsers() {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [role, setRole] = useState('');
  const [skip, setSkip] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(q); setSkip(0); }, 350);
    return () => clearTimeout(t);
  }, [q]);
  const { data, error, loading, reload } = useFetch<{ items: UserRow[]; total: number }>('/api/admin/users', { q: debounced, role, skip, take: TAKE });

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-black">کاربران</h1>
      <div className="flex flex-wrap gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی نام یا ایمیل…" className={inputCls + ' flex-1 min-w-[200px]'} />
        <select value={role} onChange={(e) => { setRole(e.target.value); setSkip(0); }} className={selectCls}>
          <option value="">همه‌ی نقش‌ها</option>
          <option value="ADMIN">مدیر</option>
          <option value="USER">کاربر</option>
        </select>
      </div>
      {error && <ErrorBox msg={error} onRetry={reload} />}
      {loading && !data ? <Spinner /> : data && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-white/50 text-xs"><tr className="text-right"><th className="p-3">نام</th><th>ایمیل</th><th>نقش</th><th>سفارش</th><th>اشتراک</th><th>عضویت</th><th /></tr></thead>
            <tbody>
              {data.items.map((u) => (
                <tr key={u.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                  <td className="p-3 font-bold">{u.name}{!u.isActive && <span className="text-[10px] text-red-400 mr-2">غیرفعال</span>}</td>
                  <td dir="ltr" className="text-white/60 text-right">{u.email}</td>
                  <td>{u.role === 'ADMIN' ? '🛡 مدیر' : 'کاربر'}</td>
                  <td>{u._count.orders}</td>
                  <td>{u._count.entitlements}</td>
                  <td className="text-white/50">{dateFa(u.createdAt)}</td>
                  <td><button className="text-[#6a8dff] text-xs px-3" onClick={() => setOpenId(u.id)}>مدیریت</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.items.length === 0 && <Empty text="کاربری پیدا نشد" />}
          <div className="px-4 pb-3"><Pager skip={skip} take={TAKE} total={data.total} onChange={setSkip} /></div>
        </div>
      )}
      {openId && <UserDrawer id={openId} onClose={() => { setOpenId(null); void reload(); }} />}
    </div>
  );
}

function UserDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, error, loading, reload } = useFetch<Detail>(`/api/admin/users/${id}`);
  const { data: cat } = useFetch<Catalog>('/api/admin/catalog');
  const [kind, setKind] = useState<'CLUSTER' | 'BOT'>('CLUSTER');
  const [slug, setSlug] = useState('');
  const [months, setMonths] = useState(1);
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); toast.success(ok); await reload(); } catch (e) { toast.error(extractError(e)); } finally { setBusy(false); }
  };
  const options = kind === 'CLUSTER' ? cat?.clusters ?? [] : cat?.bots ?? [];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-start" onClick={onClose}>
      <div className="w-full max-w-xl h-full overflow-y-auto bg-[#0e1224] border-r border-white/10 p-6 space-y-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center"><h2 className="text-xl font-black">مدیریت کاربر</h2><button onClick={onClose} className="text-white/50 text-2xl">×</button></div>
        {error && <ErrorBox msg={error} onRetry={reload} />}
        {loading && !data ? <Spinner /> : data && (
          <>
            <div className="rounded-2xl bg-white/5 p-4 space-y-1 text-sm">
              <div className="font-black text-lg">{data.name}</div>
              <div dir="ltr" className="text-white/60 text-right">{data.email}</div>
              <div className="text-white/50 text-xs">عضویت: {dateFa(data.createdAt)} · {data._count.bots} ربات · {data._count.conversations} گفتگو</div>
              <div className="flex flex-wrap gap-2 pt-3">
                <Button size="sm" variant="ghost" loading={busy} onClick={() => run(() => api.patch(`/api/admin/users/${id}`, { role: data.role === 'ADMIN' ? 'USER' : 'ADMIN' }), 'نقش تغییر کرد')}>{data.role === 'ADMIN' ? 'تبدیل به کاربر عادی' : 'ارتقا به مدیر'}</Button>
                <Button size="sm" variant={data.isActive ? 'danger' : 'primary'} loading={busy} onClick={() => run(() => api.patch(`/api/admin/users/${id}`, { isActive: !data.isActive }), data.isActive ? 'کاربر غیرفعال شد' : 'کاربر فعال شد')}>{data.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}</Button>
                <Button size="sm" variant="ghost" loading={busy} onClick={async () => { try { const r = await api.post<{ link: string }>(`/api/admin/users/${id}/reset-link`); setLink(r.data.link); } catch (e) { toast.error(extractError(e)); } }}>ساخت لینک بازیابی رمز</Button>
              </div>
              {link && (
                <div className="pt-2">
                  <div className="text-xs text-white/50 mb-1">این لینک را (۶۰ دقیقه معتبر) برای کاربر بفرستید:</div>
                  <input readOnly value={link} dir="ltr" className={inputCls + ' w-full text-xs'} onFocus={(e) => e.currentTarget.select()} />
                </div>
              )}
            </div>

            <section>
              <h3 className="font-black mb-2">اشتراک‌ها</h3>
              {data.entitlements.length === 0 ? <p className="text-white/40 text-sm">اشتراکی ندارد.</p> : (
                <ul className="space-y-2 text-sm">
                  {data.entitlements.map((e) => {
                    const active = new Date(e.expiresAt) > new Date();
                    return (
                      <li key={e.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2">
                        <span>{e.kind === 'CLUSTER' ? 'خوشه' : 'ربات'} <b dir="ltr">{e.refSlug}</b> <span className="text-[10px] text-white/40">({e.source === 'ADMIN' ? 'هدیه/دستی' : e.source === 'TRIAL' ? 'دوره‌ی رایگان' : 'خرید'})</span></span>
                        <span className="flex items-center gap-2"><span className={active ? 'text-green-300 text-xs' : 'text-white/40 text-xs'}>{active ? 'تا ' : 'منقضی '}{dateFa(e.expiresAt)}</span>
                          <button className="text-red-400 text-xs" onClick={() => { if (confirm('این دسترسی حذف شود؟')) void run(() => api.delete(`/api/admin/entitlements/${e.id}`), 'حذف شد'); }}>حذف</button></span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="mt-3 rounded-xl border border-white/10 p-3 space-y-2">
                <div className="text-xs text-white/60">دادن دسترسی دستی (هدیه/پرداخت آفلاین)</div>
                <div className="flex flex-wrap gap-2">
                  <select value={kind} onChange={(e) => { setKind(e.target.value as 'CLUSTER' | 'BOT'); setSlug(''); }} className={selectCls}><option value="CLUSTER">خوشه</option><option value="BOT">ربات</option></select>
                  <select value={slug} onChange={(e) => setSlug(e.target.value)} className={selectCls + ' flex-1 min-w-[140px]'}><option value="">انتخاب…</option>{options.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}</select>
                  <select value={months} onChange={(e) => setMonths(Number(e.target.value))} className={selectCls}>{[1, 3, 6, 12].map((m) => <option key={m} value={m}>{m} ماه</option>)}</select>
                  <Button size="sm" loading={busy} disabled={!slug} onClick={() => run(() => api.post(`/api/admin/users/${id}/grant`, { kind, slug, months }), 'دسترسی داده شد')}>ثبت</Button>
                </div>
              </div>
            </section>

            <section>
              <h3 className="font-black mb-2">سفارش‌ها</h3>
              {data.orders.length === 0 ? <p className="text-white/40 text-sm">سفارشی ندارد.</p> : (
                <ul className="space-y-2 text-sm">
                  {data.orders.map((o) => (
                    <li key={o.id} className="rounded-xl bg-white/5 px-3 py-2 flex items-center justify-between gap-2">
                      <span><span dir="ltr" className="font-mono text-xs ml-2">{o.code}</span>{o.items.map((i) => `${i.title} (${i.months} ماه)`).join('، ')}</span>
                      <span className="flex items-center gap-2 whitespace-nowrap"><span className="text-white/60 text-xs">{toman(o.amount)}</span><StatusBadge status={o.status} /></span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
