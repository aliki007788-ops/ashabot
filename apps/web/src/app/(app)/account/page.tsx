'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useFetch } from '@/lib/use-fetch';
import { dateFa, toman } from '@/lib/fmt';
import { Empty, ErrorBox, Spinner, StatusBadge } from '@/components/ui/bits';
import { DownloadPack } from '@/components/DownloadPack';

interface Ent { id: string; kind: 'CLUSTER' | 'BOT'; slug: string; name: string; icon: string; color: string; clusterSlug: string | null; source: string; expiresAt: string; active: boolean; daysLeft: number }
interface Ord { id: string; code: string; status: string; amount: number; createdAt: string; items: { title: string; months: number }[] }

export default function AccountPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useFetch<{ entitlements: Ent[]; orders: Ord[] }>('/api/store/me');
  if (loading && !data) return <Spinner />;
  if (error) return <ErrorBox msg={error} onRetry={reload} />;
  if (!data) return null;
  const active = data.entitlements.filter((e) => e.active);
  const expired = data.entitlements.filter((e) => !e.active);
  const pending = data.orders.filter((o) => o.status === 'PENDING');

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black mb-1">سلام {user?.name} 👋</h1><p className="text-white/50 text-sm">خدمات، اشتراک‌ها و سفارش‌های شما</p></div>
        <div className="flex gap-2"><Link href="/store" className="px-5 py-2.5 rounded-xl bg-gradient-to-br from-[#6a8dff] to-[#b46eff] font-bold text-sm">🛒 خرید خوشه/ربات</Link><Link href="/settings/profile" className="px-5 py-2.5 rounded-xl bg-white/10 text-sm">ویرایش پروفایل</Link></div>
      </div>

      {pending.length > 0 && <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">{pending.length} سفارش پرداخت‌نشده دارید. <Link href="/account/orders" className="underline">ادامه‌ی پرداخت</Link></div>}

      <section className="space-y-3">
        <h2 className="font-black">خدمات فعال من</h2>
        {active.length === 0 ? (
          <div className="rounded-2xl border border-white/10 p-8 text-center text-sm text-white/50">هنوز اشتراک فعالی ندارید. از <Link href="/store" className="text-[#6a8dff]">فروشگاه</Link> یک خوشه یا ربات تهیه کنید.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {active.map((e) => (
              <div key={e.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 space-y-3" style={{ borderTop: `3px solid ${e.color}` }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3"><span className="text-3xl">{e.icon}</span><div><div className="font-black">{e.name}</div><div className="text-xs text-white/40">{e.kind === 'CLUSTER' ? 'خوشه‌ی کامل' : 'ربات'}{e.source === 'ADMIN' && ' · هدیه'}</div></div></div>
                  <div className={'text-xs font-bold px-3 py-1 rounded-full ' + (e.daysLeft <= 7 ? 'bg-amber-500/20 text-amber-300' : 'bg-green-500/15 text-green-300')}>{e.daysLeft} روز مانده</div>
                </div>
                <div className="text-[11px] text-white/40">اعتبار تا {dateFa(e.expiresAt)}</div>
                <div className="flex flex-wrap gap-2 items-center">
                  {e.clusterSlug && <Link href={e.kind === 'CLUSTER' ? `/w/${e.slug}` : `/clusters/${e.clusterSlug}`} className="px-4 py-2 rounded-lg bg-[#6a8dff]/25 text-sm font-bold">باز کردن</Link>}
                  {e.kind === 'CLUSTER' && <DownloadPack slug={e.slug} />}
                  <Link href="/store" className="px-4 py-2 rounded-lg bg-white/10 text-xs">تمدید</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {expired.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-black text-white/70">منقضی‌شده</h2>
          {expired.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-sm"><span>{e.icon} {e.name} <span className="text-white/40 text-xs">(پایان {dateFa(e.expiresAt)})</span></span><Link href="/store" className="text-[#6a8dff] text-xs">تمدید</Link></div>
          ))}
        </section>
      )}

      <section className="space-y-3">
        <div className="flex justify-between"><h2 className="font-black">آخرین سفارش‌ها</h2><Link href="/account/orders" className="text-xs text-[#6a8dff]">همه ←</Link></div>
        {data.orders.length === 0 ? <Empty text="هنوز سفارشی ثبت نکرده‌اید" /> : (
          <div className="space-y-2">
            {data.orders.slice(0, 5).map((o) => (
              <Link key={o.id} href={`/account/orders/${o.code}`} className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-sm hover:bg-white/[0.06]">
                <span><span dir="ltr" className="font-mono text-xs ml-2">{o.code}</span>{o.items.map((i) => i.title).join('، ')}</span>
                <span className="flex items-center gap-3"><span className="text-white/60 text-xs">{toman(o.amount)}</span><StatusBadge status={o.status} /></span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
