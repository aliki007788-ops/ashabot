/* Workspace Kit — اقدام‌های واقعی مشترک (CRM، نوبت، پرداخت، دانش) که هر مرحله‌ی فرایند با برچسب `act` صدا می‌زند. */
import { api } from '@/lib/api';
import { fa, jDateTime, toEnDigits, toman } from './format';
import type { Executor, ExecResult, ProcessDef } from './process';

const clip = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/* ───────────── استخراج اطلاعات از متن آزاد ───────────── */
export function extractPhone(text: string): string | null {
  const m = toEnDigits(text).match(/(?:\+98|0098|0)?9\d{2}[\s-]?\d{3}[\s-]?\d{4}/);
  if (!m) return null;
  const d = m[0].replace(/[^\d]/g, '').replace(/^(98|0098)/, '');
  return d.startsWith('0') ? d : `0${d}`;
}

const STOP = new Set(['بابت', 'که', 'تا', 'به', 'هستم', 'می', 'میخوام', 'میخواهم', 'برای', 'شماره', 'با', 'در', 'و', 'را', 'از', 'یک', 'بود', 'هست', 'دارم', 'لطفا', 'لطفاً']);
export function extractName(text: string): string | null {
  const m = text.match(/(?:آقای|خانم|دکتر|مهندس|اسم من|نام من|اسمم|نامم|من)\s+([؀-ۿ]{2,}(?:\s+[؀-ۿ]{2,})?)/);
  if (!m) return null;
  const parts: string[] = [];
  for (const w of m[1].split(/\s+/)) {
    if (STOP.has(w)) break;
    parts.push(w);
  }
  return parts.length ? parts.slice(0, 2).join(' ') : null;
}

/** مبلغ به تومان؛ «۲ میلیون»، «۵۰۰ هزار تومان»، «1,200,000» */
export function extractAmount(text: string): number | null {
  const t = toEnDigits(text).replace(/(?:\+98|0098|0)?9\d{2}[\s-]?\d{3}[\s-]?\d{4}/g, ' ');
  const unit = t.match(/(\d+(?:[.,٫]\d+)?)\s*(میلیون|هزار)\s*(?:و\s*(\d+)\s*هزار)?\s*(?:تومان|تومن|ریال)?/);
  if (unit) {
    const n = Number(unit[1].replace(/[,٫]/g, '.'));
    let v = Math.round(n * (unit[2] === 'میلیون' ? 1_000_000 : 1000));
    if (unit[3] && unit[2] === 'میلیون') v += Number(unit[3]) * 1000;
    return v >= 1000 ? v : null;
  }
  const plain = t.match(/(\d{1,3}(?:[,٬]\d{3})+|\d{4,})\s*(تومان|تومن|ریال)?/);
  if (plain) {
    let v = Number(plain[1].replace(/[,٬]/g, ''));
    if (plain[2] === 'ریال') v = Math.round(v / 10);
    return v >= 1000 ? v : null;
  }
  return null;
}

const WEEKDAYS: Array<[string, number]> = [
  ['شنبه', 6],
  ['یکشنبه', 0],
  ['یک‌شنبه', 0],
  ['دوشنبه', 1],
  ['دو‌شنبه', 1],
  ['سه‌شنبه', 2],
  ['سه شنبه', 2],
  ['چهارشنبه', 3],
  ['پنجشنبه', 4],
  ['پنج‌شنبه', 4],
  ['جمعه', 5],
];

/** زمان درخواستی؛ پیش‌فرض فردا ساعت ۱۰ */
export function extractWhen(text: string, now = new Date()): Date {
  const t = toEnDigits(text);
  const d = new Date(now);
  d.setSeconds(0, 0);
  let dayShift = 1;
  if (/پس\s*[‌-]?\s*فردا/.test(t)) dayShift = 2;
  else if (/فردا/.test(t)) dayShift = 1;
  else if (/امروز/.test(t)) dayShift = 0;
  else {
    for (const [w, js] of WEEKDAYS.sort((a, b) => b[0].length - a[0].length)) {
      if (t.includes(w)) {
        dayShift = (js - now.getDay() + 7) % 7 || 7;
        break;
      }
    }
  }
  d.setDate(d.getDate() + dayShift);
  let hour = 10;
  let min = 0;
  const m1 = t.match(/ساعت\s*(\d{1,2})(?:[:٫.](\d{2}))?/) ?? t.match(/(\d{1,2})(?::(\d{2}))?\s*(?:صبح|ظهر|عصر|بعدازظهر|بعد از ظهر|شب)/);
  if (m1) {
    hour = Math.min(23, Number(m1[1]));
    min = m1[2] ? Math.min(59, Number(m1[2])) : 0;
    if (/عصر|بعدازظهر|بعد از ظهر|شب/.test(t) && hour < 12) hour += 12;
  }
  d.setHours(hour, min, 0, 0);
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
  return d;
}

const SERVICES: Array<[RegExp, string]> = [
  [/ویزیت|پزشک|دکتر|کلینیک|دندان/, 'ویزیت'],
  [/مو|رنگ|کوتاه|ناخن|میکاپ|پوست|سالن|اصلاح/, 'خدمات سالن'],
  [/میز|رستوران|کافه|شام|ناهار/, 'رزرو میز'],
  [/اتاق|هتل|اقامت|سوئیت/, 'رزرو اقامت'],
  [/کارشناسی|بازدید|خودرو|ملک|آپارتمان/, 'بازدید / کارشناسی'],
  [/مصاحبه|رزومه/, 'مصاحبه'],
  [/مشاوره/, 'مشاوره'],
];
export function guessService(text: string): string {
  for (const [re, label] of SERVICES) if (re.test(text)) return label;
  return 'نوبت عمومی';
}

/* ───────────── اقدام‌های واقعی ───────────── */
/** شناسه‌ی رکوردهایی که خود میزکار ساخته (bk:… / pay:…) تا منبع رویداد آن‌ها را دوباره پرونده‌ی تازه حساب نکند */
export const ownIds = new Set<string>();

const STAGE_FA: Record<string, string> = {
  NEW: 'جدید',
  CONTACTED: 'تماس گرفته شد',
  QUALIFIED: 'واجد شرایط',
  PROPOSAL: 'پیشنهاد',
  WON: 'برنده',
  LOST: 'ازدست‌رفته',
};

interface Contact {
  id: string;
  name: string | null;
  score: number;
  notes: string | null;
}

/** crm:STAGE[:score] — ثبت یا به‌روزرسانی مخاطب در CRM پلتفرم */
const crmExec =
  (arg: string): Executor =>
  async (ctx): Promise<ExecResult | null> => {
    const [stageRaw, scoreRaw] = arg.split(':');
    const stage = STAGE_FA[stageRaw] ? stageRaw : 'NEW';
    const score = Math.max(0, Math.min(100, Number(scoreRaw) || 0));
    const phone = extractPhone(ctx.input);
    const found = extractName(ctx.input);
    if (!phone && !found) return null; // بدون نام و شماره، مخاطب گمنام نمی‌سازیم
    const name = found ?? 'مشتری جدید';
    let existing: Contact | undefined;
    if (phone) {
      const r = await api.get('/api/crm', { params: { q: phone } });
      existing = ((r.data.items ?? []) as Contact[])[0];
    }
    if (existing) {
      await api.patch(`/api/crm/${existing.id}`, {
        stage,
        score: Math.max(existing.score ?? 0, score),
        notes: clip(`${existing.notes ?? ''}\n[${ctx.slug}] ${ctx.input}`.trim(), 1900),
      });
      return { output: `مخاطب «${existing.name ?? name}» در CRM به مرحله‌ی «${STAGE_FA[stage]}» رفت (به‌روزرسانی)${score ? ` · امتیاز ${fa(score)}` : ''}.`, note: 'CRM' };
    }
    await api.post('/api/crm', {
      name,
      ...(phone ? { phone } : {}),
      stage,
      score,
      source: `میزکار ${ctx.slug}`,
      notes: clip(ctx.input, 1900),
    });
    return { output: `مخاطب «${name}»${phone ? ` (${phone})` : ''} در CRM ثبت شد — مرحله‌ی «${STAGE_FA[stage]}»${score ? ` · امتیاز ${fa(score)}` : ''}.`, note: 'CRM' };
  };

/** booking — ثبت نوبت تأییدشده؛ اگر ساعت پر بود به اولین ساعت خالی می‌رود */
const bookingExec: Executor = async (ctx): Promise<ExecResult | null> => {
  const phone = extractPhone(ctx.input);
  const name = extractName(ctx.input) ?? 'مشتری';
  const service = guessService(ctx.input);
  let when = extractWhen(ctx.input);
  for (let i = 0; i < 12; i++) {
    try {
      const created = await api.post('/api/bookings', {
        customerName: name,
        ...(phone ? { customerPhone: phone } : {}),
        service,
        startsAt: when.toISOString(),
        durationMin: 30,
        notes: clip(`ثبت خودکار از میزکار: ${ctx.input}`, 900),
      });
      ownIds.add(`bk:${String((created.data as { id?: string }).id ?? '')}`);
      return { output: `نوبت «${service}» برای ${name} در ${jDateTime(when)} ثبت و تأیید شد${i ? ' (نزدیک‌ترین ساعت خالی)' : ''}.`, note: 'نوبت واقعی' };
    } catch (e) {
      const status = (e as { response?: { status?: number } }).response?.status;
      if (status !== 409) throw e;
      when = new Date(when.getTime() + 30 * 60 * 1000);
    }
  }
  throw new Error('ساعت خالی پیدا نشد');
};

/** payment — ساخت لینک پرداخت (فقط وقتی مبلغ در پرونده باشد) */
const paymentExec: Executor = async (ctx): Promise<ExecResult | null> => {
  // فقط وقتی صریحاً فاکتور/لینک پرداخت خواسته شده؛ «بودجه» یا «هزینه» لینک پرداخت نمی‌سازد
  if (!/فاکتور|صورت‌?حساب|لینک\s*پرداخت/.test(ctx.input) || /ثبت\s*شود/.test(ctx.input)) return null;
  const amount = extractAmount(ctx.input);
  if (!amount) return null;
  const name = extractName(ctx.input);
  const r = await api.post('/api/payments', { amount, description: clip(`${name ? `${name} — ` : ''}${ctx.input}`, 190) });
  ownIds.add(`pay:${String((r.data as { id?: string }).id ?? '')}`);
  const url = String((r.data as { url?: string }).url ?? '');
  return { output: `لینک پرداخت ${toman(amount)} ساخته شد${url ? `:\n${url}` : '.'}`, note: 'پرداخت واقعی' };
};

/** kb — جست‌وجو در پایگاه دانش شما؛ اگر پایگاهی نبود به ربات هوشمند می‌سپارد */
const kbExec: Executor = async (ctx): Promise<ExecResult | null> => {
  const list = await api.get('/api/knowledge');
  const kbs = (list.data.items ?? list.data ?? []) as Array<{ id: string }>;
  if (!Array.isArray(kbs) || !kbs.length) return null;
  const r = await api.post(`/api/knowledge/${kbs[0].id}/search`, { query: ctx.input });
  const hits = (r.data.results ?? []) as Array<{ content: string; title: string }>;
  if (!hits.length) return { output: 'در اسناد شما پاسخی پیدا نشد — این پرسش به‌عنوان «شکاف دانش» ثبت می‌شود و به انسان می‌رسد.', note: 'دانش' };
  return { output: hits.slice(0, 2).map((h) => `«${h.title}»: ${clip(h.content.replace(/\s+/g, ' '), 160)}`).join('\n'), note: 'دانش واقعی' };
};

/** رویدادی که کارش قبلاً در سیستم انجام شده (مثلاً نوبتی که ربات تلگرام ثبت کرده) دوباره ثبت نمی‌شود */
const once =
  (fn: Executor): Executor =>
  async (ctx) =>
    (ctx.event?.data as { existing?: boolean } | undefined)?.existing
      ? { output: 'این اقدام پیش‌تر در سیستم ثبت شده بود و مستقیماً وارد فرایند شد.', note: 'ثبت‌شده' }
      : fn(ctx);

/** برچسب `act` هر مرحله را به اجراکننده‌ی واقعی تبدیل می‌کند */
export function buildExecutors(def: ProcessDef): Record<string, Executor> {
  const out: Record<string, Executor> = {};
  for (const s of def.stages) {
    if (!s.act) continue;
    const [kind, ...rest] = s.act.split(':');
    const arg = rest.join(':');
    if (kind === 'crm') out[s.id] = once(crmExec(arg));
    else if (kind === 'booking') out[s.id] = once(bookingExec);
    else if (kind === 'payment') out[s.id] = once(paymentExec);
    else if (kind === 'kb') out[s.id] = kbExec;
  }
  return out;
}

/** برچسب‌های مجاز act (برای اعتبارسنجی تعریف‌ها) */
export const ACT_KINDS = ['crm', 'booking', 'payment', 'kb'] as const;
