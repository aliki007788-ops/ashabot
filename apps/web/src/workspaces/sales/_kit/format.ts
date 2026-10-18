/* Workspace Kit — قالب‌بندی فارسی و ابزارهای کوچک (بدون وابستگی) */

const faNum = new Intl.NumberFormat('fa-IR');
export const fa = (n: number | string | null | undefined): string => faNum.format(Number(n ?? 0));
export const toman = (n: number | null | undefined): string => `${fa(n ?? 0)} تومان`;
export const pct = (n: number): string => `${fa(Math.round(n))}٪`;

const mk = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('fa-IR-u-ca-persian', o);
const fDate = mk({ year: 'numeric', month: 'long', day: 'numeric' });
const fShort = mk({ month: '2-digit', day: '2-digit' });
const fDay = mk({ weekday: 'long' });
const fDayShort = mk({ weekday: 'short' });
const fTime = mk({ hour: '2-digit', minute: '2-digit' });

export const jDate = (d: string | Date): string => fDate.format(new Date(d));
export const jShort = (d: string | Date): string => fShort.format(new Date(d));
export const jWeekday = (d: string | Date): string => fDay.format(new Date(d));
export const jWeekdayShort = (d: string | Date): string => fDayShort.format(new Date(d));
export const jTime = (d: string | Date): string => fTime.format(new Date(d));
export const jDateTime = (d: string | Date): string => `${jDate(d)}، ${jTime(d)}`;

export const startOfDay = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
export const addDays = (d: Date, n: number): Date => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const sameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
/** شروع هفته ایرانی (شنبه) */
export const startOfWeek = (d: Date): Date => {
  const x = startOfDay(d);
  return addDays(x, -((x.getDay() + 1) % 7));
};
/** مقدار مناسب input[type=datetime-local] */
export const toLocalInput = (d: Date): string => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** تبدیل ارقام فارسی/عربی به انگلیسی (برای فیلدهای عددی) */
export const toEnDigits = (s: string): string =>
  s
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660));

export const digitsOnly = (s: string): string => toEnDigits(s).replace(/[^\d]/g, '');

/** شماره موبایل ایران → بین‌المللی بدون + (برای wa.me) */
export const intlPhone = (phone: string): string => {
  const p = digitsOnly(phone);
  if (p.startsWith('00')) return p.slice(2);
  if (p.startsWith('98')) return p;
  if (p.startsWith('0')) return `98${p.slice(1)}`;
  return `98${p}`;
};
export const waLink = (phone: string, text: string): string =>
  `https://wa.me/${intlPhone(phone)}?text=${encodeURIComponent(text)}`;
export const smsLink = (phone: string, text: string): string =>
  `sms:${digitsOnly(phone)}?body=${encodeURIComponent(text)}`;

export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallthrough */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** CSV با BOM تا اکسل فارسی را درست بخواند */
export function downloadCsv(filename: string, rows: (string | number)[][]): void {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const text = '﻿' + rows.map((r) => r.map(esc).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
