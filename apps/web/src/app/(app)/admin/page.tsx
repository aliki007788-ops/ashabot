'use client';

import Link from 'next/link';
import { useFetch } from '@/lib/use-fetch';
import { dateFa, num, toman } from '@/lib/fmt';
import { ErrorBox, Spinner, Stat, StatusBadge } from '@/components/ui/bits';

interface Stats {
  users: { total: number; new7d: number; admins: number };
  orders: Record<string, number>;
  revenue: { total: number; last30d: number; paidOrders: number; series: { date: string; amount: number }[] };
  activeEntitlements: number;
  topSold: { kind: string; slug: string; title: string; count: number; revenue: number }[];
  usage: { conversations: number; messages: number; processRuns7d: number };
  recentOrders: { id: string; code: string; status: string; amount: number; createdAt: string; user: { name: string; email: string } }[];
  recentUsers: { id: string; name: string; email: string; role: string; createdAt: string }[];
}

export default function AdminHome() {
  const { data, error, loading, reload } = useFetch<Stats>('/api/admin/stats');
  if (loading && !data) return <Spinner />;
  if (error) return <ErrorBox msg={error} onRetry={reload} />;
  if (!data) return null;
  const max = Math.max(1, ...data.revenue.series.map((s) => s.amount));
  const pending = data.orders.PENDING ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black mb-1">پنل مدیریت</h1>
        <p className="text-white/50 text-sm">وضعیت فروش، کاربران و مصرف پلتفرم در یک نگاه</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="درآمد کل" value={toman(data.revenue.total)} hint={`${num(data.revenue.paidOrders)} سفارش پرداخت‌شده`} color="#4ade80" />
        <Stat label="درآمد ۳۰ روز اخیر" value={toman(data.revenue.last30d)} color="#6a8dff" />
        <Stat label="کاربران" value={num(data.users.total)} hint={`${num(data.users.new7d)} نفر در ۷ روز اخیر`} color="#b46eff" />
        <Stat label="اشتراک فعال" value={num(data.activeEntitlements)} hint={pending ? `${num(pending)} سفارش در انتظار پرداخت` : undefined} color="#f59e0b" />
      </div>

      <section className="rounded-2xl bg-white/[0.04] border border-white/10 p-6">
        <h2 className="font-black mb-4">درآمد ۱۴ روز اخیر</h2>
        <div className="flex items-end gap-1.5 h-40" dir="ltr">
          {data.revenue.series.map((s) => (
            <div key={s.date} className="flex-1 flex flex-col items-center justify-end h-full group">
              <div className="text-[10px] text-white/0 group-hover:text-white/80 mb-1 whitespace-nowrap">{num(s.amount)}</div>
              <div className="w-full rounded-t-md bg-gradient-to-t from-[#6a8dff] to-[#b46eff]" style={{ height: `${Math.max(2, (s.amount / max) * 100)}%`, opacity: s.amount ? 1 : 0.25 }} />
              <div className="text-[9px] text-white/40 mt-1">{s.date.slice(5)}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="rounded-2xl bg-white/[0.04] border border-white/10 p-6">
          <h2 className="font-black mb-4">پرفروش‌ترین‌ها</h2>
          {data.topSold.length === 0 ? (
            <p className="text-white/40 text-sm">هنوز فروشی ثبت نشده.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.topSold.map((t) => (
                <li key={t.kind + t.slug} className="flex items-center justify-between gap-3">
                  <span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 ml-2">{t.kind === 'CLUSTER' ? 'خوشه' : 'ربات'}</span>
                    {t.title}
                  </span>
                  <span className="text-white/60 whitespace-nowrap">
                    {num(t.count)} فروش · {toman(t.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl bg-white/[0.04] border border-white/10 p-6">
          <h2 className="font-black mb-4">مصرف پلتفرم</h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div><div className="text-2xl font-black">{num(data.usage.conversations)}</div><div className="text-xs text-white/50">گفتگو</div></div>
            <div><div className="text-2xl font-black">{num(data.usage.messages)}</div><div className="text-xs text-white/50">پیام</div></div>
            <div><div className="text-2xl font-black">{num(data.usage.processRuns7d)}</div><div className="text-xs text-white/50">اجرای فرایند (۷ روز)</div></div>
          </div>
        </section>

        <section className="rounded-2xl bg-white/[0.04] border border-white/10 p-6">
          <div className="flex justify-between mb-4"><h2 className="font-black">آخرین سفارش‌ها</h2><Link href="/admin/orders" className="text-xs text-[#6a8dff]">همه ←</Link></div>
          {data.recentOrders.length === 0 ? <p className="text-white/40 text-sm">سفارشی نیست.</p> : (
            <ul className="space-y-2 text-sm">
              {data.recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-2">
                  <span className="truncate"><span dir="ltr" className="font-mono text-xs ml-2">{o.code}</span>{o.user.name}</span>
                  <span className="flex items-center gap-2 whitespace-nowrap"><span className="text-white/60">{toman(o.amount)}</span><StatusBadge status={o.status} /></span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl bg-white/[0.04] border border-white/10 p-6">
          <div className="flex justify-between mb-4"><h2 className="font-black">تازه‌ترین کاربران</h2><Link href="/admin/users" className="text-xs text-[#6a8dff]">همه ←</Link></div>
          <ul className="space-y-2 text-sm">
            {data.recentUsers.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{u.name} <span className="text-white/40 text-xs" dir="ltr">{u.email}</span></span>
                <span className="text-white/50 text-xs whitespace-nowrap">{dateFa(u.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
