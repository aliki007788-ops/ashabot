'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api, extractError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useFetch } from '@/lib/use-fetch';
import { num, toman } from '@/lib/fmt';
import { ErrorBox, Spinner } from '@/components/ui/bits';
import { PublicShell } from '@/components/PublicShell';

interface Landing {
  cluster: { slug: string; name: string; icon: string; color: string; priceMonthly: number; botCount: number };
  content: {
    pain: string; sub: string; before: { b: string; a: string }[]; demoHint: string; demoPrompts: string[]; audience: string[];
    featured: { name: string; desc: string }[]; steps: { t: string; d: string }[]; proof: string; proofWho: string; ctaNote: string; metaTitle: string; metaDesc: string;
  };
  moreBots: number;
  trial: { enabled: boolean; days: number };
  demo: { enabled: boolean };
  supportLink: string;
}

const PLACEHOLDER_MARK = 'در حال تست';

export default function LandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { data: l, error, loading, reload } = useFetch<Landing>(`/api/public/landing/${slug}`);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (l) document.title = l.content.metaTitle;
  }, [l]);

  const start = async () => {
    if (!l) return;
    const dest = `/w/${l.cluster.slug}`;
    if (!user) {
      try { sessionStorage.setItem('asha_go', JSON.stringify({ slug: l.cluster.slug, trial: l.trial.enabled })); } catch { /* ignore */ }
      router.push('/register');
      return;
    }
    if (!l.trial.enabled) { router.push(l.cluster.priceMonthly > 0 ? '/store' : dest); return; }
    setBusy(true);
    try {
      await api.post('/api/store/trial', { slug: l.cluster.slug });
      toast.success(`دوره‌ی رایگان ${num(l.trial.days)} روزه شروع شد`);
      router.push(dest);
    } catch (e) {
      toast.error(extractError(e));
      setBusy(false);
    }
  };

  if (loading && !l) return <PublicShell><Spinner /></PublicShell>;
  if (error || !l) return <PublicShell><div className="max-w-xl mx-auto py-20 px-4"><ErrorBox msg={error || 'این صفحه در دسترس نیست'} onRetry={reload} /><div className="text-center mt-6"><Link href="/c" className="text-[#6a8dff]">همه‌ی خوشه‌ها</Link></div></div></PublicShell>;

  const { cluster: c, content: k } = l;
  const ctaLabel = l.trial.enabled ? `${num(l.trial.days)} روز رایگان شروع کن` : c.priceMonthly > 0 ? 'شروع کن' : 'شروع رایگان';
  const card = { borderColor: 'var(--border)', background: 'var(--bg-tertiary)' } as const;
  const isPlaceholder = k.proof.includes(PLACEHOLDER_MARK);

  return (
    <PublicShell>
      <main className="max-w-4xl mx-auto px-4 md:px-6 pb-28 space-y-14">
        {/* ۱ — تیتر درد */}
        <section className="text-center pt-12 space-y-5">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border" style={{ borderColor: c.color, color: c.color }}>{c.icon} {c.name}</div>
          <h1 className="text-3xl md:text-5xl font-black leading-snug">{k.pain}</h1>
          <p className="text-lg text-[var(--text-secondary)] leading-8 max-w-2xl mx-auto">{k.sub}</p>
          <div className="flex flex-col items-center gap-2 pt-2">
            <button onClick={start} disabled={busy} className="px-8 py-4 rounded-2xl text-white font-black text-lg shadow-xl hover:brightness-110 disabled:opacity-60" style={{ background: `linear-gradient(135deg, ${c.color}, #b46eff)` }}>{busy ? 'کمی صبر کنید…' : ctaLabel}</button>
            <span className="text-xs text-[var(--text-tertiary)]">{k.ctaNote}</span>
          </div>
        </section>

        {/* ۲ — قبل و بعد */}
        <section className="space-y-4">
          <h2 className="text-2xl font-black text-center">قبل و بعد</h2>
          <div className="rounded-2xl border overflow-hidden" style={card}>
            <div className="grid grid-cols-2 text-sm font-black text-center"><div className="p-3 bg-red-500/10 text-red-400">قبل</div><div className="p-3 bg-green-500/10 text-green-400">بعد</div></div>
            {k.before.map((r, i) => (
              <div key={i} className="grid grid-cols-2 border-t text-sm leading-7" style={{ borderColor: 'var(--border)' }}>
                <div className="p-4 text-[var(--text-secondary)]">{r.b}</div><div className="p-4 border-r" style={{ borderColor: 'var(--border)' }}>{r.a}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ۳ — دموی زنده */}
        {l.demo.enabled && <Demo slug={c.slug} hint={k.demoHint} prompts={k.demoPrompts} color={c.color} />}

        {/* ۴ — برای کیست */}
        <section className="space-y-4">
          <h2 className="text-2xl font-black text-center">این خوشه برای کیست؟</h2>
          <ul className="grid sm:grid-cols-2 gap-3">
            {k.audience.map((a, i) => <li key={i} className="rounded-2xl border p-4 text-sm leading-7" style={card}>✅ {a}</li>)}
          </ul>
        </section>

        {/* ۵ — ربات‌ها */}
        {k.featured.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-2xl font-black text-center">ربات‌های این خوشه</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {k.featured.map((b, i) => (
                <div key={i} className="rounded-2xl border p-5 space-y-2" style={{ ...card, borderTop: `3px solid ${c.color}` }}>
                  <div className="font-black">{b.name}</div>
                  {b.desc && <p className="text-sm text-[var(--text-secondary)] leading-7">{b.desc}</p>}
                </div>
              ))}
            </div>
            {l.moreBots > 0 && <p className="text-center text-sm text-[var(--text-secondary)]">و {num(l.moreBots)} ربات دیگر در همین خوشه</p>}
          </section>
        )}

        {/* ۶ — سه قدم */}
        <section className="space-y-4">
          <h2 className="text-2xl font-black text-center">شروع در ۳ قدم</h2>
          <ol className="space-y-3">
            {k.steps.map((s, i) => (
              <li key={i} className="flex gap-4 rounded-2xl border p-4" style={card}>
                <span className="w-9 h-9 rounded-full grid place-items-center font-black text-white shrink-0" style={{ background: c.color }}>{num(i + 1)}</span>
                <div><div className="font-bold">{s.t}</div><p className="text-sm text-[var(--text-secondary)] leading-7">{s.d}</p></div>
              </li>
            ))}
          </ol>
        </section>

        {/* ۷ — نمونه‌ی واقعی */}
        <section className="space-y-4">
          <h2 className="text-2xl font-black text-center">نتیجه‌ی کاربران</h2>
          <blockquote className={'rounded-2xl p-6 text-center leading-8 ' + (isPlaceholder ? 'border border-dashed text-[var(--text-secondary)]' : 'border')} style={card}>
            {isPlaceholder ? k.proof : `«${k.proof}»`}
            {k.proofWho && !isPlaceholder && <footer className="mt-3 text-xs text-[var(--text-tertiary)]">— {k.proofWho}</footer>}
          </blockquote>
        </section>

        {/* ۸ — قیمت */}
        <section className="space-y-4 text-center">
          <h2 className="text-2xl font-black">قیمت</h2>
          <div className="rounded-2xl border p-6 space-y-2" style={card}>
            <div className="text-3xl font-black">{c.priceMonthly > 0 ? <>{toman(c.priceMonthly)}<span className="text-base font-normal text-[var(--text-secondary)]"> / ماه</span></> : 'رایگان'}</div>
            {l.trial.enabled && <p className="text-sm text-[var(--text-secondary)] leading-7">{num(l.trial.days)} روز اول رایگان است. بعد از آن اگر ادامه خواستی از «فروشگاه» اشتراک می‌گیری؛ اگر نخواستی، هیچ هزینه‌ای از تو کسر نمی‌شود.</p>}
            {c.priceMonthly > 0 && <p className="text-xs text-[var(--text-tertiary)]">خرید ۳، ۶ و ۱۲ ماهه با ۵٪، ۱۰٪ و ۲۰٪ تخفیف.</p>}
          </div>
        </section>

        {/* ۹ — دکمه‌ی پایانی */}
        <section className="text-center space-y-3 py-6">
          <button onClick={start} disabled={busy} className="px-10 py-4 rounded-2xl text-white font-black text-lg shadow-xl hover:brightness-110 disabled:opacity-60" style={{ background: `linear-gradient(135deg, ${c.color}, #b46eff)` }}>{ctaLabel}</button>
          <p className="text-xs text-[var(--text-tertiary)]">{k.ctaNote}</p>
          {l.supportLink && <p className="text-sm">سؤالی داری؟ <a href={l.supportLink} target="_blank" rel="noreferrer" className="text-[#6a8dff] underline">پیام در پشتیبانی</a></p>}
          <p className="text-xs"><Link href="/c" className="text-[var(--text-tertiary)]">← دیدن بقیه‌ی خوشه‌ها</Link></p>
        </section>
      </main>

      <div className="fixed bottom-0 inset-x-0 z-30 p-3 md:hidden border-t backdrop-blur-md" style={{ borderColor: 'var(--border)', background: 'var(--bg-overlay)' }}>
        <button onClick={start} disabled={busy} className="w-full py-3 rounded-xl text-white font-black" style={{ background: `linear-gradient(135deg, ${c.color}, #b46eff)` }}>{ctaLabel}</button>
      </div>
    </PublicShell>
  );
}

function Demo({ slug, hint, prompts, color }: { slug: string; hint: string; prompts: string[]; color: string }) {
  const [text, setText] = useState('');
  const [reply, setReply] = useState('');
  const [botName, setBotName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const ask = async (msg: string) => {
    const m = msg.trim();
    if (m.length < 2 || busy) return;
    setBusy(true); setErr(''); setReply('');
    try {
      const r = await api.post<{ reply: string; bot: string }>(`/api/public/landing/${slug}/demo`, { message: m });
      setReply(r.data.reply); setBotName(r.data.bot);
    } catch (e) {
      setErr(extractError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-black text-center">همین حالا امتحان کن</h2>
      <p className="text-center text-sm text-[var(--text-secondary)] leading-7">{hint}</p>
      <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-tertiary)', borderTop: `3px solid ${color}` }}>
        <div className="flex flex-wrap gap-2">
          {prompts.map((p) => <button key={p} onClick={() => { setText(p); void ask(p); }} className="text-xs px-3 py-1.5 rounded-full border hover:bg-white/10 text-right" style={{ borderColor: 'var(--border)' }}>{p}</button>)}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); void ask(text); }} className="flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={400} placeholder="سؤالت را بنویس…" className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-sm focus:outline-none focus:border-[#6a8dff]" />
          <button type="submit" disabled={busy || text.trim().length < 2} className="px-5 rounded-xl text-white font-bold disabled:opacity-50" style={{ background: color }}>{busy ? '…' : 'بپرس'}</button>
        </form>
        {busy && <p className="text-sm text-[var(--text-secondary)]">ربات در حال نوشتن است…</p>}
        {err && <p className="text-sm text-red-400">{err}</p>}
        {reply && (
          <div className="rounded-xl bg-white/5 p-4 text-sm leading-8 whitespace-pre-wrap">
            {reply}
            <div className="mt-3 text-[11px] text-[var(--text-tertiary)]">پاسخ نمونه از «{botName}» — این یک دموی کوتاه است و به اطلاعات واقعی کسب‌وکار تو وصل نیست.</div>
          </div>
        )}
      </div>
    </section>
  );
}
