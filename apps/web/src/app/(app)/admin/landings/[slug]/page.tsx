'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { api, extractError } from '@/lib/api';
import { useFetch } from '@/lib/use-fetch';
import { ErrorBox, Spinner, inputCls } from '@/components/ui/bits';
import { Button } from '@/components/ui/button';

interface C {
  pain: string; sub: string; before: { b: string; a: string }[]; demoHint: string; demoPrompts: string[]; audience: string[];
  featured: { name: string; desc: string }[]; steps: { t: string; d: string }[]; proof: string; proofWho: string; ctaNote: string; metaTitle: string; metaDesc: string;
}
interface Resp { cluster: { name: string; slug: string }; defaults: C; content: C }

const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
  <div className="space-y-1.5"><label className="text-sm font-bold">{label}</label>{children}{hint && <div className="text-[11px] text-white/40">{hint}</div>}</div>
);

export default function LandingEditor() {
  const { slug } = useParams<{ slug: string }>();
  const { data, error, loading, reload } = useFetch<Resp>(`/api/admin/landings/${slug}`);
  const [c, setC] = useState<C | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setC(data.content); }, [data]);
  if (loading && !c) return <Spinner />;
  if (error) return <ErrorBox msg={error} onRetry={reload} />;
  if (!c || !data) return null;
  const set = <K extends keyof C>(k: K, v: C[K]) => setC({ ...c, [k]: v });
  const lines = (arr: string[]) => arr.join('\n');
  const fromLines = (t: string) => t.split('\n').map((x) => x.trim()).filter(Boolean);

  const save = async (reset = false) => {
    if (reset && !confirm('همه‌ی متن‌های این لندینگ به پیش‌فرض برگردد؟')) return;
    setBusy(true);
    try {
      await api.put(`/api/admin/landings/${slug}`, reset ? { resetContent: true } : { content: c });
      toast.success(reset ? 'به پیش‌فرض برگشت' : 'ذخیره شد');
      if (reset) await reload();
    } catch (e) { toast.error(extractError(e)); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/admin/landings" className="text-sm text-white/40">← همه‌ی لندینگ‌ها</Link>
      <div className="flex items-center justify-between flex-wrap gap-3"><h1 className="text-3xl font-black">ویرایش لندینگ «{data.cluster.name}»</h1><Link href={`/c/${slug}`} target="_blank" className="text-sm text-[#6a8dff]">دیدن صفحه ↗</Link></div>
      <p className="text-xs text-white/50 leading-6">قانون‌های پیشنهادی: زبان ساده و بدون اصطلاح فنی، بدون عدد اغراق‌آمیز، بدون وعده‌ی درآمد. نمونه‌ی واقعی را فقط وقتی بنویسید که واقعاً وجود دارد. قیمت و تعداد ربات‌ها خودکار از پلتفرم می‌آید.</p>

      <Field label="۱) تیتر درد"><input className={inputCls + ' w-full'} value={c.pain} onChange={(e) => set('pain', e.target.value)} maxLength={200} /></Field>
      <Field label="زیرتیتر"><textarea className={inputCls + ' w-full h-20'} value={c.sub} onChange={(e) => set('sub', e.target.value)} maxLength={400} /></Field>

      <section className="space-y-2"><h2 className="font-black">۲) قبل و بعد</h2>
        {c.before.map((r, i) => (
          <div key={i} className="grid sm:grid-cols-[1fr_1fr_auto] gap-2">
            <input className={inputCls} value={r.b} placeholder="قبل" onChange={(e) => set('before', c.before.map((x, j) => (j === i ? { ...x, b: e.target.value } : x)))} />
            <input className={inputCls} value={r.a} placeholder="بعد" onChange={(e) => set('before', c.before.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} />
            <button onClick={() => set('before', c.before.filter((_, j) => j !== i))} className="text-red-400 px-2">حذف</button>
          </div>
        ))}
        {c.before.length < 6 && <button onClick={() => set('before', [...c.before, { b: '', a: '' }])} className="text-xs text-[#6a8dff]">+ افزودن ردیف</button>}
      </section>

      <Field label="۳) راهنمای دمو" hint="بالای باکس دمو نمایش داده می‌شود."><textarea className={inputCls + ' w-full h-16'} value={c.demoHint} onChange={(e) => set('demoHint', e.target.value)} /></Field>
      <Field label="پرسش‌های پیشنهادی دمو (هر خط یکی، حداکثر ۴)"><textarea className={inputCls + ' w-full h-20'} value={lines(c.demoPrompts)} onChange={(e) => set('demoPrompts', fromLines(e.target.value).slice(0, 4))} /></Field>
      <Field label="۴) برای کیست؟ (هر خط یک جمله)"><textarea className={inputCls + ' w-full h-28'} value={lines(c.audience)} onChange={(e) => set('audience', fromLines(e.target.value).slice(0, 6))} /></Field>

      <section className="space-y-2"><h2 className="font-black">۵) ربات‌های برجسته</h2><p className="text-[11px] text-white/40">اگر خالی بگذارید، دو ربات اول خوشه خودکار نمایش داده می‌شود.</p>
        {c.featured.map((f, i) => (
          <div key={i} className="grid sm:grid-cols-[1fr_2fr_auto] gap-2">
            <input className={inputCls} value={f.name} placeholder="نام" onChange={(e) => set('featured', c.featured.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <input className={inputCls} value={f.desc} placeholder="یک جمله" onChange={(e) => set('featured', c.featured.map((x, j) => (j === i ? { ...x, desc: e.target.value } : x)))} />
            <button onClick={() => set('featured', c.featured.filter((_, j) => j !== i))} className="text-red-400 px-2">حذف</button>
          </div>
        ))}
        {c.featured.length < 4 && <button onClick={() => set('featured', [...c.featured, { name: '', desc: '' }])} className="text-xs text-[#6a8dff]">+ افزودن ربات</button>}
      </section>

      <section className="space-y-2"><h2 className="font-black">۶) سه قدم</h2>
        {c.steps.map((s, i) => (
          <div key={i} className="grid sm:grid-cols-[1fr_2fr] gap-2">
            <input className={inputCls} value={s.t} onChange={(e) => set('steps', c.steps.map((x, j) => (j === i ? { ...x, t: e.target.value } : x)))} />
            <input className={inputCls} value={s.d} onChange={(e) => set('steps', c.steps.map((x, j) => (j === i ? { ...x, d: e.target.value } : x)))} />
          </div>
        ))}
      </section>

      <Field label="۷) نمونه‌ی واقعی" hint="تا نتیجه‌ی واقعی نداری، همین متن پیش‌فرض («در حال تست…») را نگه دار. عدد و نتیجه‌ی ساختگی ننویس."><textarea className={inputCls + ' w-full h-24'} value={c.proof} onChange={(e) => set('proof', e.target.value)} /></Field>
      <Field label="گوینده‌ی نمونه (مثلاً «مغازه‌دار، تهران»)"><input className={inputCls + ' w-full'} value={c.proofWho} onChange={(e) => set('proofWho', e.target.value)} /></Field>
      <Field label="۹) جمله‌ی زیر دکمه"><input className={inputCls + ' w-full'} value={c.ctaNote} onChange={(e) => set('ctaNote', e.target.value)} /></Field>
      <Field label="عنوان صفحه (SEO)"><input className={inputCls + ' w-full'} value={c.metaTitle} onChange={(e) => set('metaTitle', e.target.value)} /></Field>
      <Field label="توضیح کوتاه (SEO)"><textarea className={inputCls + ' w-full h-16'} value={c.metaDesc} onChange={(e) => set('metaDesc', e.target.value)} /></Field>

      <div className="sticky bottom-4 flex gap-3"><Button loading={busy} onClick={() => save(false)} className="shadow-2xl">ذخیره</Button><Button variant="ghost" onClick={() => save(true)}>بازگشت به متن پیش‌فرض</Button></div>
    </div>
  );
}
