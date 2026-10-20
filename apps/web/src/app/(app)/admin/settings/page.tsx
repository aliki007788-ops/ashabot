'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api, extractError } from '@/lib/api';
import { useFetch } from '@/lib/use-fetch';
import { ErrorBox, Spinner, inputCls } from '@/components/ui/bits';
import { Button } from '@/components/ui/button';

interface S { enforcePurchases: boolean; allowFakePayments: boolean; storeName: string; announcement: string }

function Toggle({ on, onChange, title, desc }: { on: boolean; onChange: (v: boolean) => void; title: string; desc: string }) {
  return (
    <label className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 cursor-pointer">
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} className="mt-1.5 w-5 h-5" />
      <span><span className="font-bold block">{title}</span><span className="text-xs text-white/50 leading-6">{desc}</span></span>
    </label>
  );
}

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
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-black mb-1">تنظیمات فروش</h1>
        <p className="text-white/50 text-sm">رفتار فروشگاه و دسترسی کاربران را اینجا کنترل کنید.</p>
      </div>
      <Toggle on={s.enforcePurchases} onChange={(v) => setS({ ...s, enforcePurchases: v })} title="اجباری‌کردن خرید (قفل محتوای پولی)" desc="خاموش: همه‌چیز برای همه باز است (مناسب دوره‌ی آزمایشی). روشن: کاربر عادی فقط به خوشه/رباتی که قیمت دارد و خریده (یا مدیر هدیه داده) دسترسی دارد. مدیر همیشه دسترسی کامل دارد. پیشنهاد: اول قیمت‌ها را بگذارید، بعد روشن کنید." />
      <Toggle on={s.allowFakePayments} onChange={(v) => setS({ ...s, allowFakePayments: v })} title="پرداخت آزمایشی (بدون درگاه)" desc="فقط برای تست خودتان؛ وقتی درگاه زرین‌پال تنظیم نشده، سفارش بلافاصله «پرداخت‌شده» می‌شود. پیش از فروش واقعی حتماً خاموش کنید." />
      <div className="space-y-2">
        <label className="text-sm font-bold">نام فروشگاه</label>
        <input value={s.storeName} onChange={(e) => setS({ ...s, storeName: e.target.value })} className={inputCls + ' w-full'} maxLength={60} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-bold">اعلان بالای فروشگاه (اختیاری)</label>
        <textarea value={s.announcement} onChange={(e) => setS({ ...s, announcement: e.target.value })} className={inputCls + ' w-full h-24'} maxLength={300} placeholder="مثلاً: تخفیف ویژه تا پایان هفته" />
      </div>
      <Button loading={busy} onClick={save}>ذخیره‌ی تنظیمات</Button>
      <div className="rounded-2xl border border-white/10 p-4 text-xs text-white/50 leading-7">
        مدیران با متغیر محیطی <code dir="ltr">ADMIN_EMAILS</code> (چند ایمیل با ویرگول) در سرور تعیین می‌شوند و از همین پنل هم می‌توانید کاربر را به مدیر ارتقا دهید. تخفیف خرید چندماهه ثابت است: ۳ ماه ۵٪، ۶ ماه ۱۰٪، ۱۲ ماه ۲۰٪.
      </div>
    </div>
  );
}
