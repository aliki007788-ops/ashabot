'use client';

import { useFetch } from '@/lib/use-fetch';
import { dateFa, num } from '@/lib/fmt';
import { ErrorBox, Spinner } from '@/components/ui/bits';

interface Sys {
  db: { ok: boolean; latencyMs: number };
  counts: { clusters: number; bots: number; templates: number; brains: number };
  config: Record<string, boolean>;
  runtime: { node: string; uptimeSec: number; rssMb: number; env: string };
}
interface Act { id: string; type: string; message: string; createdAt: string; user: { name: string; email: string } | null; bot: { name: string; icon: string } | null }

const CHECKS: { key: string; label: string; hint: string; critical?: boolean }[] = [
  { key: 'openai', label: 'کلید هوش مصنوعی (OpenAI/سازگار)', hint: 'OPENAI_API_KEY و در صورت نیاز OPENAI_BASE_URL', critical: true },
  { key: 'zarinpal', label: 'درگاه پرداخت زرین‌پال', hint: 'ZARINPAL_MERCHANT_ID (برای تست: ZARINPAL_SANDBOX=true)', critical: true },
  { key: 'adminEmails', label: 'ایمیل مدیران', hint: 'ADMIN_EMAILS' },
  { key: 'frontendUrl', label: 'آدرس سایت (بازگشت از درگاه و لینک‌ها)', hint: 'FRONTEND_URL', critical: true },
  { key: 'publicApiUrl', label: 'آدرس عمومی API', hint: 'PUBLIC_API_URL' },
  { key: 'email', label: 'ارسال ایمیل (بازیابی رمز)', hint: 'RESEND_API_KEY و MAIL_FROM — بدون آن مدیر لینک بازیابی را دستی می‌دهد' },
];

export default function AdminSystem() {
  const sys = useFetch<Sys>('/api/admin/system');
  const act = useFetch<{ items: Act[] }>('/api/admin/activity', { take: 60 });
  if (sys.loading && !sys.data) return <Spinner />;
  if (sys.error) return <ErrorBox msg={sys.error} onRetry={sys.reload} />;
  const d = sys.data;
  if (!d) return null;
  const up = d.runtime.uptimeSec;
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between"><h1 className="text-3xl font-black">سلامت سیستم</h1><button onClick={() => { void sys.reload(); void act.reload(); }} className="px-4 py-2 rounded-xl bg-white/10 text-sm">↻ تازه‌سازی</button></div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4"><div className="text-2xl">{d.db.ok ? '🟢' : '🔴'}</div><div className="font-bold">پایگاه‌داده</div><div className="text-xs text-white/50">{d.db.ok ? `${num(d.db.latencyMs)} میلی‌ثانیه` : 'قطع'}</div></div>
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4"><div className="text-2xl font-black">{num(d.counts.clusters)}</div><div className="text-xs text-white/50">خوشه</div></div>
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4"><div className="text-2xl font-black">{num(d.counts.templates)}</div><div className="text-xs text-white/50">قالب ربات ({num(d.counts.bots)} کل)</div></div>
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4"><div className="text-2xl font-black">{num(d.counts.brains)}</div><div className="text-xs text-white/50">مغز</div></div>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
        <h2 className="font-black">چک‌لیست راه‌اندازی برای فروش</h2>
        {CHECKS.map((c) => {
          const ok = !!d.config[c.key];
          return (
            <div key={c.key} className="flex items-start gap-3 text-sm">
              <span>{ok ? '✅' : c.critical ? '❌' : '⚠️'}</span>
              <div><div className="font-bold">{c.label}</div>{!ok && <div className="text-xs text-white/50" dir="ltr" style={{ textAlign: 'right' }}>{c.hint}</div>}</div>
            </div>
          );
        })}
        {d.config.zarinpalSandbox && <div className="text-xs text-amber-300">درگاه در حالت آزمایشی (Sandbox) است.</div>}
        {d.config.corsOpen && <div className="text-xs text-amber-300">CORS روی «همه» باز است؛ برای امنیت بهتر CORS_ORIGIN را روی آدرس سایت بگذارید.</div>}
      </section>

      <div className="text-xs text-white/40">Node {d.runtime.node} · محیط {d.runtime.env} · {num(Math.floor(up / 3600))} ساعت و {num(Math.floor((up % 3600) / 60))} دقیقه روشن · {num(d.runtime.rssMb)} MB حافظه</div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="font-black mb-3">آخرین فعالیت‌ها</h2>
        {act.loading && !act.data ? <Spinner /> : (
          <ul className="space-y-2 text-sm max-h-96 overflow-y-auto">
            {(act.data?.items ?? []).map((a) => (
              <li key={a.id} className="flex justify-between gap-3 border-b border-white/5 pb-2">
                <span>{a.bot?.icon} {a.message} {a.user && <span className="text-white/40 text-xs">— {a.user.name}</span>}</span>
                <span className="text-white/40 text-xs whitespace-nowrap">{dateFa(a.createdAt, true)}</span>
              </li>
            ))}
            {act.data?.items.length === 0 && <li className="text-white/40">فعالیتی ثبت نشده.</li>}
          </ul>
        )}
      </section>
    </div>
  );
}
