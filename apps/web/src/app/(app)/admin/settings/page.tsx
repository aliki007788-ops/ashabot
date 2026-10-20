'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api, extractError } from '@/lib/api';
import { useFetch } from '@/lib/use-fetch';
import { NAV, ALWAYS_ON } from '@/lib/nav';
import { ErrorBox, Spinner, inputCls } from '@/components/ui/bits';
import { Button } from '@/components/ui/button';

interface S {
  enforcePurchases: boolean; allowFakePayments: boolean; storeName: string; announcement: string;
  registrationOpen: boolean; trialEnabled: boolean; trialDays: number; demoEnabled: boolean; demoPerHour: number; demoDailyCap: number;
  landingsEnabled: boolean; supportLink: string; disabledModules: string;
}

function Toggle({ on, onChange, title, desc }: { on: boolean; onChange: (v: boolean) => void; title: string; desc?: string }) {
  return (
    <label className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 cursor-pointer">
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} className="mt-1.5 w-5 h-5" />
      <span><span className="font-bold block">{title}</span>{desc && <span className="text-xs text-white/50 leading-6">{desc}</span>}</span>
    </label>
  );
}
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3"><h2 className="font-black text-lg border-b border-white/10 pb-2">{title}</h2>{children}</section>
);
const Num = ({ label, value, onChange, min, max, hint }: { label: string; value: number; onChange: (n: number) => void; min: number; max: number; hint?: string }) => (
  <div className="space-y-1"><label className="text-sm font-bold">{label}</label>
    <input type="number" min={min} max={max} value={value} onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || 0)))} className={inputCls + ' w-full'} dir="ltr" />
    {hint && <div className="text-[11px] text-white/40">{hint}</div>}</div>
);

export default function AdminSettings() {
  const { data, error, loading, reload } = useFetch<{ settings: S }>('/api/admin/settings');
  const [s, setS] = useState<S | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setS(data.settings); }, [data]);

  const save = async () => {
    if (!s) return;
    setBusy(true);
    try { const r = await api.put<{ settings: S }>('/api/admin/settings', s); setS(r.data.settings); toast.success('ذخیره شد'); } catch (e) { toast.error(extractError(e)); } finally { setBusy(false); }
  };

  if (loading && !s) return <Spinner />;
  if (error) return <ErrorBox msg={error} onRetry={reload} />;
  if (!s) return null;
  const off = new Set(s.disabledModules.split(',').map((x) => x.trim()).filter(Boolean));
  const toggleModule = (href: string, enabled: boolean) => {
    const next = new Set(off);
    if (enabled) next.delete(href); else next.add(href);
    setS({ ...s, disabledModules: [...next].join(',') });
  };

  return (
    <div className="space-y-10 max-w-3xl">
      <div>
        <h1 className="text-3xl font-black mb-1">تنظیمات فروش و کنترل پلتفرم</h1>
        <p className="text-white/50 text-sm">همه‌ی کلیدهای روشن/خاموش پلتفرم اینجاست. بعد از تغییر «ذخیره» را بزنید.</p>
      </div>

      <Section title="ثبت‌نام و دسترسی">
        <Toggle on={s.registrationOpen} onChange={(v) => setS({ ...s, registrationOpen: v })} title="ثبت‌نام کاربر جدید باز باشد" desc="خاموش: کسی نمی‌تواند حساب تازه بسازد (مدیران با ADMIN_EMAILS همیشه می‌توانند)." />
        <Toggle on={s.enforcePurchases} onChange={(v) => setS({ ...s, enforcePurchases: v })} title="اجباری‌کردن خرید (قفل محتوای پولی)" desc="خاموش: همه‌چیز برای همه باز است. روشن: کاربر عادی فقط به خوشه/رباتی که قیمت دارد و خریده (یا دوره‌ی رایگان/هدیه دارد) دسترسی دارد. مدیر همیشه دسترسی کامل دارد." />
      </Section>

      <Section title="دوره‌ی رایگان">
        <Toggle on={s.trialEnabled} onChange={(v) => setS({ ...s, trialEnabled: v })} title="دوره‌ی رایگان فعال باشد" desc="هر کاربر برای هر خوشه فقط یک‌بار می‌تواند دوره‌ی رایگان را بگیرد. برای هر لندینگ هم جداگانه می‌توانید خاموش یا مدت را عوض کنید." />
        <Num label="مدت پیش‌فرض (روز)" value={s.trialDays} onChange={(n) => setS({ ...s, trialDays: n })} min={1} max={365} />
      </Section>

      <Section title="لندینگ‌ها و دمو">
        <Toggle on={s.landingsEnabled} onChange={(v) => setS({ ...s, landingsEnabled: v })} title="صفحه‌های لندینگ عمومی (/c) فعال باشند" desc="برای فعال/غیرفعال‌کردن هر خوشه، از تب «لندینگ‌ها» استفاده کنید." />
        <Toggle on={s.demoEnabled} onChange={(v) => setS({ ...s, demoEnabled: v })} title="دموی زنده‌ی بدون ثبت‌نام فعال باشد" desc="از کلید هوش مصنوعی شما هزینه می‌برد؛ پس سقف‌ها را پایین نگه دارید." />
        <div className="grid sm:grid-cols-2 gap-4">
          <Num label="سهمیه‌ی هر بازدیدکننده در ساعت" value={s.demoPerHour} onChange={(n) => setS({ ...s, demoPerHour: n })} min={1} max={100} />
          <Num label="سقف کل دموها در روز (۰ = بدون سقف)" value={s.demoDailyCap} onChange={(n) => setS({ ...s, demoDailyCap: n })} min={0} max={100000} />
        </div>
      </Section>

      <Section title="بخش‌های برنامه">
        <p className="text-xs text-white/50 leading-6">هر بخش را که خاموش کنید از منوی کاربران پنهان می‌شود و صفحه‌اش پیام «غیرفعال» نشان می‌دهد. مدیر همه‌ی بخش‌ها را می‌بیند.</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {NAV.filter((n) => !ALWAYS_ON.includes(n.href)).map((n) => (
            <label key={n.href} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 cursor-pointer text-sm">
              <input type="checkbox" checked={!off.has(n.href)} onChange={(e) => toggleModule(n.href, e.target.checked)} className="w-4 h-4" />{n.label}
            </label>
          ))}
        </div>
      </Section>

      <Section title="فروشگاه و ارتباط">
        <div className="space-y-2"><label className="text-sm font-bold">نام فروشگاه</label><input value={s.storeName} onChange={(e) => setS({ ...s, storeName: e.target.value })} className={inputCls + ' w-full'} maxLength={60} /></div>
        <div className="space-y-2"><label className="text-sm font-bold">لینک پشتیبانی (تلگرام/واتساپ)</label><input value={s.supportLink} onChange={(e) => setS({ ...s, supportLink: e.target.value })} className={inputCls + ' w-full'} dir="ltr" placeholder="https://t.me/your_id" /></div>
        <div className="space-y-2"><label className="text-sm font-bold">اعلان بالای فروشگاه (اختیاری)</label><textarea value={s.announcement} onChange={(e) => setS({ ...s, announcement: e.target.value })} className={inputCls + ' w-full h-24'} maxLength={300} /></div>
        <Toggle on={s.allowFakePayments} onChange={(v) => setS({ ...s, allowFakePayments: v })} title="پرداخت آزمایشی (بدون درگاه)" desc="فقط برای تست؛ وقتی درگاه زرین‌پال تنظیم نشده، سفارش بلافاصله «پرداخت‌شده» می‌شود. پیش از فروش واقعی خاموش کنید." />
      </Section>

      <div className="sticky bottom-4"><Button loading={busy} onClick={save} className="shadow-2xl">ذخیره‌ی همه‌ی تنظیمات</Button></div>
      <div className="rounded-2xl border border-white/10 p-4 text-xs text-white/50 leading-7">مدیران با متغیر محیطی <code dir="ltr">ADMIN_EMAILS</code> تعیین می‌شوند و از «کاربران» هم می‌توانید کاربر را به مدیر ارتقا دهید. تخفیف خرید چندماهه ثابت است: ۳ ماه ۵٪، ۶ ماه ۱۰٪، ۱۲ ماه ۲۰٪.</div>
    </div>
  );
}
