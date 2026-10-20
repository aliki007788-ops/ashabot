import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getSettings } from '../../lib/access.js';
import { clusterBots, loadLanding } from '../../lib/landing.js';
import { getProvider, resolveModel } from '../../lib/ai/index.js';
import { detectInjection, SAFETY_SUFFIX } from '../../lib/guardrails.js';

/** شمارنده‌ی روزانه‌ی دمو (سقف هزینه)؛ در حافظه نگه داشته می‌شود */
let demoDay = '';
let demoCount = 0;
const dayKey = () => new Date().toISOString().slice(0, 10);

export async function publicRoutes(app: FastifyInstance) {
  const prisma = app.prisma;

  /** تنظیمات عمومی برای رابط (بدون احراز هویت) */
  app.get('/config', async () => {
    const s = await getSettings(prisma);
    return {
      storeName: s.storeName,
      announcement: s.announcement,
      registrationOpen: s.registrationOpen,
      landingsEnabled: s.landingsEnabled,
      supportLink: s.supportLink,
      disabledModules: s.disabledModules.split(',').map((x) => x.trim()).filter(Boolean),
    };
  });

  /** فهرست لندینگ‌های فعال */
  let listCache: { at: number; value: unknown } | null = null;
  app.get('/landings', async () => {
    const s = await getSettings(prisma);
    if (!s.landingsEnabled) return { items: [] };
    if (listCache && Date.now() - listCache.at < 30_000) return listCache.value;
    const [clusters, rows] = await Promise.all([
      prisma.cluster.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' }, select: { slug: true, name: true, icon: true, color: true, priceMonthly: true, _count: { select: { bots: true } } } }),
      prisma.landing.findMany({ select: { slug: true, isActive: true } }),
    ]);
    const off = new Set(rows.filter((r) => !r.isActive).map((r) => r.slug));
    const items = await Promise.all(
      clusters
        .filter((c) => !off.has(c.slug))
        .map(async (c) => {
          const l = await loadLanding(prisma, c.slug);
          return l ? { slug: c.slug, name: c.name, icon: c.icon, color: c.color, priceMonthly: c.priceMonthly, botCount: c._count.bots, pain: l.content.pain } : null;
        }),
    );
    const value = { items: items.filter(Boolean) };
    listCache = { at: Date.now(), value };
    return value;
  });

  app.get('/landing/:slug', async (request) => {
    const { slug } = request.params as { slug: string };
    const l = await loadLanding(prisma, slug);
    if (!l) throw Object.assign(new Error('این صفحه در دسترس نیست'), { statusCode: 404 });
    // شمارنده‌ی بازدید (ساده)
    prisma.landing
      .upsert({ where: { slug }, create: { slug, views: 1 }, update: { views: { increment: 1 } } })
      .catch(() => undefined);
    const { row: _row, active: _a, ...pub } = l;
    return pub;
  });

  /** دموی زنده‌ی بدون ثبت‌نام؛ سخت‌گیرانه محدود */
  app.post('/landing/:slug/demo', { config: { rateLimit: { max: 12, timeWindow: '1 hour' } } }, async (request) => {
    const { slug } = request.params as { slug: string };
    const { message } = z.object({ message: z.string().trim().min(2).max(400) }).parse(request.body);
    const settings = await getSettings(prisma);
    const l = await loadLanding(prisma, slug);
    if (!l || !l.demo.enabled) throw Object.assign(new Error('دموی این صفحه غیرفعال است'), { statusCode: 403 });

    // محدودیت هر IP در ساعت (قابل‌تنظیم) و سقف روزانه‌ی کل
    const ip = request.ip;
    const now = Date.now();
    const bucket = ((app as any)._demoIp ??= new Map<string, number[]>()) as Map<string, number[]>;
    const hits = (bucket.get(ip) ?? []).filter((t) => now - t < 3_600_000);
    if (hits.length >= settings.demoPerHour) throw Object.assign(new Error('سهمیه‌ی دموی شما برای این ساعت تمام شد؛ برای ادامه ثبت‌نام کنید.'), { statusCode: 429 });
    if (demoDay !== dayKey()) { demoDay = dayKey(); demoCount = 0; }
    if (settings.demoDailyCap > 0 && demoCount >= settings.demoDailyCap) throw Object.assign(new Error('دمو امروز به سقف رسیده؛ لطفاً ثبت‌نام کنید یا فردا امتحان کنید.'), { statusCode: 429 });
    if (detectInjection(message)) throw Object.assign(new Error('این پرسش برای دمو مناسب نیست'), { statusCode: 400 });

    const bots = await clusterBots(prisma, (await prisma.cluster.findUniqueOrThrow({ where: { slug } })).id);
    const bot = bots[0];
    if (!bot) throw Object.assign(new Error('رباتی برای دمو پیدا نشد'), { statusCode: 404 });
    const model = resolveModel(bot.model || 'gpt-4o-mini');
    try {
      const provider = getProvider(model);
      const res = await provider.chat([{ role: 'user', content: message }], {
        model,
        temperature: 0.5,
        maxTokens: 350,
        systemPrompt: `${bot.systemPrompt}\n\n[حالت دموی عمومی] پاسخ را فارسی و حداکثر حدود ۱۲۰ کلمه بده. وانمود نکن به سیستم‌ها یا اطلاعات واقعی کاربر وصل هستی؛ نمونه‌ی کلی بده. اگر پرسش نامرتبط با کار این خوشه بود، مؤدبانه به موضوع برگرد.${SAFETY_SUFFIX}`,
      });
      hits.push(now);
      bucket.set(ip, hits);
      demoCount += 1;
      return { reply: res.content, bot: bot.name, remaining: Math.max(0, settings.demoPerHour - hits.length) };
    } catch (e) {
      app.log.warn({ err: (e as Error).message }, 'demo failed');
      throw Object.assign(new Error('دمو الان در دسترس نیست؛ با ثبت‌نام می‌توانید خود ربات را امتحان کنید.'), { statusCode: 503 });
    }
  });
}
