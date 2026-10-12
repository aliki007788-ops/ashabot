import type { FastifyInstance } from 'fastify';
import type { ToolDefinition } from '../../lib/ai/index.js';
import { env } from '../../env.js';

export interface ToolContext {
  app: FastifyInstance;
  bot: { id: string; userId: string | null; name: string };
  conversation: { id: string; sessionId: string };
  /** ابزارها می‌توانند این‌ها را ست کنند تا AiService رفتار را عوض کند */
  state: { handoff?: string };
}

interface RegisteredTool {
  def: ToolDefinition;
  run: (args: any, ctx: ToolContext) => Promise<unknown>;
}

const publicApiUrl = () =>
  (env.PUBLIC_API_URL || env.RENDER_EXTERNAL_URL || `http://localhost:${env.API_PORT}`).replace(/\/$/, '');

const TZ = 'Asia/Tehran';

function tehranParts(d: Date) {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d);
  const g = (t: string) => f.find((p) => p.type === t)?.value || '';
  return { date: `${g('year')}-${g('month')}-${g('day')}`, time: `${g('hour')}:${g('minute')}` };
}

/** تهران UTC+3:30 (بدون DST از ۱۴۰۱) */
function tehranToDate(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+03:30`);
}

export const TOOLS: Record<string, RegisteredTool> = {
  get_current_time: {
    def: {
      name: 'get_current_time',
      description: 'تاریخ و ساعت فعلی (منطقه زمانی تهران) را برمی‌گرداند.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
    run: async () => {
      const p = tehranParts(new Date());
      const weekday = new Intl.DateTimeFormat('fa-IR', { timeZone: TZ, weekday: 'long' }).format(new Date());
      return { date: p.date, time: p.time, weekday, timezone: TZ };
    },
  },

  save_lead: {
    def: {
      name: 'save_lead',
      description: 'اطلاعات تماس مشتری بالقوه (سرنخ) را در CRM ذخیره می‌کند. وقتی کاربر نام/شماره/ایمیل داد یا علاقه خرید نشان داد استفاده کن.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'نام مشتری' },
          phone: { type: 'string', description: 'شماره موبایل' },
          email: { type: 'string' },
          interest: { type: 'string', description: 'محصول/خدمت مورد علاقه' },
          score: { type: 'number', description: 'امتیاز آمادگی خرید ۰ تا ۱۰۰' },
        },
        required: [],
      },
    },
    run: async (a, ctx) => {
      const { prisma } = ctx.app;
      const existing = await prisma.contact.findFirst({
        where: { conversationId: ctx.conversation.id },
      });
      const data: any = {
        name: a.name || undefined,
        phone: a.phone || undefined,
        email: a.email || undefined,
        score: typeof a.score === 'number' ? Math.max(0, Math.min(100, Math.round(a.score))) : undefined,
        notes: a.interest ? `علاقه: ${a.interest}` : undefined,
      };
      const contact = existing
        ? await prisma.contact.update({ where: { id: existing.id }, data })
        : await prisma.contact.create({
            data: {
              ...data,
              userId: ctx.bot.userId,
              botId: ctx.bot.id,
              conversationId: ctx.conversation.id,
              source: ctx.bot.name,
              stage: 'NEW',
            },
          });
      await prisma.conversation.update({ where: { id: ctx.conversation.id }, data: { contactId: contact.id } });
      return { ok: true, contactId: contact.id };
    },
  },

  handoff_to_human: {
    def: {
      name: 'handoff_to_human',
      description: 'گفتگو را به اپراتور انسانی منتقل می‌کند. وقتی کاربر اپراتور خواست، عصبانی است، موضوع حساس/پیچیده است یا پاسخ را نمی‌دانی استفاده کن.',
      parameters: {
        type: 'object',
        properties: { reason: { type: 'string', description: 'دلیل انتقال' } },
        required: ['reason'],
      },
    },
    run: async (a, ctx) => {
      ctx.state.handoff = String(a.reason || 'درخواست انتقال به اپراتور');
      return { ok: true, message: 'گفتگو به اپراتور منتقل شد. به کاربر بگو به‌زودی پاسخ داده می‌شود.' };
    },
  },

  get_available_slots: {
    def: {
      name: 'get_available_slots',
      description: 'ساعت‌های خالی نوبت‌دهی (۹ تا ۱۷، هر ۳۰ دقیقه) را برای یک تاریخ میلادی (YYYY-MM-DD) برمی‌گرداند.',
      parameters: {
        type: 'object',
        properties: { date: { type: 'string', description: 'YYYY-MM-DD' } },
        required: ['date'],
      },
    },
    run: async (a, ctx) => {
      const date = String(a.date || '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'فرمت تاریخ نامعتبر است' };
      const dayStart = tehranToDate(date, '00:00');
      const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);
      const booked = await ctx.app.prisma.booking.findMany({
        where: {
          userId: ctx.bot.userId,
          status: { not: 'CANCELLED' },
          startsAt: { gte: dayStart, lt: dayEnd },
        },
      });
      const taken = new Set(booked.map((b) => tehranParts(b.startsAt).time));
      const slots: string[] = [];
      for (let h = 9; h < 17; h++)
        for (const m of ['00', '30']) {
          const t = `${String(h).padStart(2, '0')}:${m}`;
          if (!taken.has(t)) slots.push(t);
        }
      return { date, slots };
    },
  },

  create_booking: {
    def: {
      name: 'create_booking',
      description: 'یک نوبت/رزرو ثبت می‌کند. قبل از ثبت، نام، شماره تماس، خدمت و زمان را از کاربر بگیر و با get_available_slots ساعت خالی را چک کن.',
      parameters: {
        type: 'object',
        properties: {
          customer_name: { type: 'string' },
          customer_phone: { type: 'string' },
          service: { type: 'string' },
          date: { type: 'string', description: 'YYYY-MM-DD' },
          time: { type: 'string', description: 'HH:MM به وقت تهران' },
        },
        required: ['customer_name', 'service', 'date', 'time'],
      },
    },
    run: async (a, ctx) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(a.date || '') || !/^\d{2}:\d{2}$/.test(a.time || '')) {
        return { error: 'تاریخ یا ساعت نامعتبر است' };
      }
      const startsAt = tehranToDate(a.date, a.time);
      if (isNaN(startsAt.getTime()) || startsAt.getTime() < Date.now()) {
        return { error: 'زمان انتخابی گذشته یا نامعتبر است' };
      }
      const clash = await ctx.app.prisma.booking.findFirst({
        where: { userId: ctx.bot.userId, startsAt, status: { not: 'CANCELLED' } },
      });
      if (clash) return { error: 'این ساعت قبلاً رزرو شده است' };
      const booking = await ctx.app.prisma.booking.create({
        data: {
          userId: ctx.bot.userId,
          botId: ctx.bot.id,
          customerName: String(a.customer_name).slice(0, 120),
          customerPhone: a.customer_phone ? String(a.customer_phone).slice(0, 30) : null,
          service: String(a.service).slice(0, 200),
          startsAt,
          status: 'CONFIRMED',
        },
      });
      return { ok: true, bookingId: booking.id, when: `${a.date} ${a.time}` };
    },
  },

  create_payment_link: {
    def: {
      name: 'create_payment_link',
      description: 'لینک پرداخت آنلاین (زرین‌پال) می‌سازد. مبلغ به تومان است. لینک را به کاربر بده.',
      parameters: {
        type: 'object',
        properties: {
          amount_toman: { type: 'number', description: 'مبلغ به تومان (حداقل ۱۰۰۰)' },
          description: { type: 'string' },
        },
        required: ['amount_toman', 'description'],
      },
    },
    run: async (a, ctx) => {
      const amount = Math.round(Number(a.amount_toman));
      if (!amount || amount < 1000 || amount > 500_000_000) return { error: 'مبلغ نامعتبر است' };
      const payment = await ctx.app.prisma.payment.create({
        data: {
          userId: ctx.bot.userId,
          botId: ctx.bot.id,
          amount,
          description: String(a.description).slice(0, 200),
          purpose: 'bot',
        },
      });
      return { ok: true, paymentId: payment.id, url: `${publicApiUrl()}/api/payments/pay/${payment.id}` };
    },
  },

  calculate: {
    def: {
      name: 'calculate',
      description: 'یک عبارت ریاضی ساده (+ - * / پرانتز) را محاسبه می‌کند. برای قیمت، تخفیف، اقساط.',
      parameters: {
        type: 'object',
        properties: { expression: { type: 'string' } },
        required: ['expression'],
      },
    },
    run: async (a) => {
      const expr = String(a.expression || '');
      if (!/^[\d\s+\-*/().,%]+$/.test(expr) || expr.length > 200) return { error: 'عبارت نامعتبر' };
      try {
        const v = Function(`"use strict"; return (${expr.replace(/,/g, '').replace(/%/g, '/100')})`)();
        return { result: Number.isFinite(v) ? v : null };
      } catch {
        return { error: 'خطا در محاسبه' };
      }
    },
  },
};

export const TOOL_NAMES = Object.keys(TOOLS);

export function getToolDefinitions(names: string[]): ToolDefinition[] {
  return names.filter((n) => TOOLS[n]).map((n) => TOOLS[n].def);
}

export async function runTool(name: string, args: any, ctx: ToolContext) {
  const t = TOOLS[name];
  if (!t) return { error: `ابزار ناشناخته: ${name}` };
  try {
    return await t.run(args || {}, ctx);
  } catch (e: any) {
    ctx.app.log.error(`tool ${name} failed: ${e.message}`);
    return { error: 'اجرای ابزار ناموفق بود' };
  }
}
