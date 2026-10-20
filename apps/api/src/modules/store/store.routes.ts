import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../../env.js';
import { getSettings } from '../../lib/access.js';
import { DISCOUNT, MONTH_CHOICES, fulfillOrder, newOrderCode, priceFor } from '../../lib/store.js';

/**
 * فروشگاه: کاتالوگ خوشه‌ها و ربات‌ها، سبد خرید/پرداخت زرین‌پال، دسترسی‌ها و سفارش‌های کاربر.
 * مبلغ‌ها «تومان» است و هنگام پرداخت به ریال (×۱۰) تبدیل می‌شود.
 */
const zHost = () => (env.ZARINPAL_SANDBOX === 'true' ? 'https://sandbox.zarinpal.com' : 'https://payment.zarinpal.com');
const publicApi = () => (env.PUBLIC_API_URL || env.RENDER_EXTERNAL_URL || `http://localhost:${env.API_PORT}`).replace(/\/$/, '');
const frontend = () => (env.FRONTEND_URL || env.CORS_ORIGIN.split(',')[0] || 'http://localhost:3000').replace(/\/$/, '');

export async function storeRoutes(app: FastifyInstance) {
  const prisma = app.prisma;
  const auth = { preHandler: [app.authenticate] };

  /** آدرس پرداخت یک سفارش را از زرین‌پال می‌گیرد */
  async function startPayment(order: { id: string; code: string; amount: number }): Promise<string> {
    const res = await fetch(`${zHost()}/pg/v4/payment/request.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        merchant_id: env.ZARINPAL_MERCHANT_ID,
        amount: order.amount * 10,
        currency: 'IRR',
        description: `سفارش ${order.code}`,
        callback_url: `${publicApi()}/api/store/callback?oid=${order.id}`,
      }),
    });
    const json: any = await res.json().catch(() => ({}));
    const authority = json?.data?.authority;
    if (!authority) {
      app.log.warn({ json }, 'zarinpal request failed');
      throw Object.assign(new Error('ساخت تراکنش در درگاه ناموفق بود؛ کمی بعد دوباره تلاش کنید'), { statusCode: 502 });
    }
    await prisma.order.update({ where: { id: order.id }, data: { authority } });
    return `${zHost()}/pg/StartPay/${authority}`;
  }

  /* ───── کاتالوگ ───── */
  app.get('/catalog', auth, async (request) => {
    const now = new Date();
    const [settings, clusters, bots, ents] = await Promise.all([
      getSettings(prisma),
      prisma.cluster.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { slug: true, name: true, icon: true, color: true, description: true, priceMonthly: true, _count: { select: { bots: true } } },
      }),
      prisma.bot.findMany({
        where: { userId: null, isActive: true, priceMonthly: { gt: 0 } },
        orderBy: { name: 'asc' },
        take: 400,
        select: { slug: true, name: true, icon: true, description: true, isPremium: true, priceMonthly: true, cluster: { select: { slug: true, name: true } } },
      }),
      prisma.entitlement.findMany({ where: { userId: request.user.sub, expiresAt: { gt: now } } }),
    ]);
    const own = new Map(ents.map((e) => [`${e.kind}:${e.refSlug}`, e.expiresAt]));
    return {
      settings: { enforcePurchases: settings.enforcePurchases, storeName: settings.storeName, announcement: settings.announcement, zarinpal: !!env.ZARINPAL_MERCHANT_ID || settings.allowFakePayments },
      months: MONTH_CHOICES.map((m) => ({ months: m, discount: DISCOUNT[m] ?? 0 })),
      clusters: clusters.map((c) => ({
        slug: c.slug, name: c.name, icon: c.icon, color: c.color, description: c.description,
        priceMonthly: c.priceMonthly, botCount: c._count.bots, ownedUntil: own.get(`CLUSTER:${c.slug}`) ?? null,
      })),
      bots: bots.map((b) => ({
        slug: b.slug, name: b.name, icon: b.icon, description: b.description, isPremium: b.isPremium, priceMonthly: b.priceMonthly,
        clusterSlug: b.cluster?.slug ?? null, clusterName: b.cluster?.name ?? null,
        ownedUntil: own.get(`BOT:${b.slug}`) ?? null,
        includedByCluster: b.cluster ? own.has(`CLUSTER:${b.cluster.slug}`) : false,
      })),
    };
  });

  /* ───── ثبت سفارش و شروع پرداخت ───── */
  const checkoutSchema = z.object({
    items: z.array(z.object({ kind: z.enum(['CLUSTER', 'BOT']), slug: z.string().min(1).max(120), months: z.number().int().refine((m) => (MONTH_CHOICES as readonly number[]).includes(m), 'مدت نامعتبر') })).min(1).max(20),
  });

  app.post('/checkout', { ...auth, config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (request) => {
    const input = checkoutSchema.parse(request.body);
    const settings = await getSettings(prisma);
    if (!env.ZARINPAL_MERCHANT_ID && !settings.allowFakePayments) {
      throw Object.assign(new Error('درگاه پرداخت هنوز تنظیم نشده است؛ با پشتیبانی تماس بگیرید'), { statusCode: 503 });
    }
    const seen = new Set<string>();
    const lines: Array<{ kind: string; refSlug: string; title: string; months: number; unitPrice: number; total: number }> = [];
    for (const it of input.items) {
      const key = `${it.kind}:${it.slug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const row =
        it.kind === 'CLUSTER'
          ? await prisma.cluster.findUnique({ where: { slug: it.slug }, select: { name: true, priceMonthly: true, isActive: true } })
          : await prisma.bot.findFirst({ where: { slug: it.slug, userId: null }, select: { name: true, priceMonthly: true, isActive: true } });
      if (!row || !row.isActive) throw Object.assign(new Error('یکی از موارد سبد خرید پیدا نشد'), { statusCode: 404 });
      if (row.priceMonthly <= 0) throw Object.assign(new Error(`«${row.name}» رایگان است و نیازی به خرید ندارد`), { statusCode: 400 });
      lines.push({ kind: it.kind, refSlug: it.slug, title: row.name, months: it.months, unitPrice: row.priceMonthly, total: priceFor(row.priceMonthly, it.months) });
    }
    const amount = lines.reduce((a, l) => a + l.total, 0);
    if (amount < 1000) throw Object.assign(new Error('حداقل مبلغ سفارش ۱٬۰۰۰ تومان است'), { statusCode: 400 });
    const order = await prisma.order.create({
      data: { code: newOrderCode(), userId: request.user.sub, amount, items: { create: lines } },
    });
    if (!env.ZARINPAL_MERCHANT_ID && settings.allowFakePayments) {
      await fulfillOrder(prisma, order.id, 'TEST');
      return { orderId: order.id, code: order.code, amount, payUrl: `${frontend()}/account/orders?order=${order.code}&status=ok`, test: true };
    }
    const payUrl = await startPayment(order);
    return { orderId: order.id, code: order.code, amount, payUrl };
  });

  /** ادامه‌ی پرداخت یک سفارش ناتمام */
  app.post('/orders/:id/pay', auth, async (request) => {
    const { id } = request.params as { id: string };
    const order = await prisma.order.findFirst({ where: { id, userId: request.user.sub } });
    if (!order) throw Object.assign(new Error('سفارش پیدا نشد'), { statusCode: 404 });
    if (order.status === 'PAID') throw Object.assign(new Error('این سفارش قبلاً پرداخت شده است'), { statusCode: 400 });
    if (order.status === 'CANCELED') throw Object.assign(new Error('این سفارش لغو شده است'), { statusCode: 400 });
    if (!env.ZARINPAL_MERCHANT_ID) throw Object.assign(new Error('درگاه پرداخت تنظیم نشده است'), { statusCode: 503 });
    return { payUrl: await startPayment(order) };
  });

  /* ───── بازگشت از درگاه ───── */
  app.get('/callback', async (request, reply) => {
    const q = z.object({ oid: z.string(), Authority: z.string().optional(), Status: z.string().optional() }).parse(request.query);
    const order = await prisma.order.findUnique({ where: { id: q.oid } });
    const back = (status: string) => reply.redirect(`${frontend()}/account/orders?order=${order?.code ?? ''}&status=${status}`);
    if (!order || !q.Authority || order.authority !== q.Authority) return back('fail');
    if (order.status === 'PAID') return back('ok');
    if (q.Status !== 'OK') {
      await prisma.order.update({ where: { id: order.id }, data: { status: 'FAILED' } });
      return back('fail');
    }
    const res = await fetch(`${zHost()}/pg/v4/payment/verify.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ merchant_id: env.ZARINPAL_MERCHANT_ID, amount: order.amount * 10, authority: q.Authority }),
    });
    const json: any = await res.json().catch(() => ({}));
    const code = json?.data?.code;
    if (code === 100 || code === 101) {
      await fulfillOrder(prisma, order.id, String(json.data.ref_id ?? ''));
      app.io?.emit('order:paid', { orderId: order.id, amount: order.amount });
      return back('ok');
    }
    await prisma.order.update({ where: { id: order.id }, data: { status: 'FAILED' } });
    return back('fail');
  });

  /* ───── دوره‌ی رایگان (قابل‌کنترل کامل از پنل مدیریت) ───── */
  app.post('/trial', { ...auth, config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request) => {
    const { slug } = z.object({ slug: z.string().min(1).max(120) }).parse(request.body);
    const settings = await getSettings(prisma, true);
    const cluster = await prisma.cluster.findUnique({ where: { slug } });
    if (!cluster || !cluster.isActive) throw Object.assign(new Error('خوشه پیدا نشد'), { statusCode: 404 });
    const landing = await prisma.landing.findUnique({ where: { slug } });
    if (!settings.trialEnabled || landing?.trialEnabled === false) throw Object.assign(new Error('دوره‌ی رایگان برای این خوشه فعال نیست'), { statusCode: 403 });
    const userId = request.user.sub;
    const now = new Date();
    const prior = await prisma.entitlement.findFirst({ where: { userId, kind: 'CLUSTER', refSlug: slug, source: 'TRIAL' } });
    if (prior) throw Object.assign(new Error('دوره‌ی رایگان این خوشه را قبلاً استفاده کرده‌اید'), { statusCode: 400 });
    const active = await prisma.entitlement.findFirst({ where: { userId, kind: 'CLUSTER', refSlug: slug, expiresAt: { gt: now } } });
    if (active) return { ok: true, already: true, expiresAt: active.expiresAt };
    const days = landing?.trialDays ?? settings.trialDays;
    const ent = await prisma.entitlement.create({
      data: { userId, kind: 'CLUSTER', refSlug: slug, source: 'TRIAL', expiresAt: new Date(now.getTime() + days * 86_400_000) },
    });
    await prisma.activityLog.create({ data: { type: 'trial.start', message: `شروع دوره‌ی رایگان ${days} روزه‌ی خوشه ${cluster.name}`, userId } });
    return { ok: true, days, expiresAt: ent.expiresAt };
  });

  /* ───── خریدهای من ───── */
  app.get('/me', auth, async (request) => {
    const now = new Date();
    const [ents, orders] = await Promise.all([
      prisma.entitlement.findMany({ where: { userId: request.user.sub }, orderBy: { expiresAt: 'desc' }, take: 200 }),
      prisma.order.findMany({ where: { userId: request.user.sub }, orderBy: { createdAt: 'desc' }, take: 100, include: { items: true } }),
    ]);
    const clusterSlugs = ents.filter((e) => e.kind === 'CLUSTER').map((e) => e.refSlug);
    const botSlugs = ents.filter((e) => e.kind === 'BOT').map((e) => e.refSlug);
    const [clusters, bots] = await Promise.all([
      prisma.cluster.findMany({ where: { slug: { in: clusterSlugs } }, select: { slug: true, name: true, icon: true, color: true } }),
      prisma.bot.findMany({ where: { slug: { in: botSlugs } }, select: { slug: true, name: true, icon: true, cluster: { select: { slug: true } } } }),
    ]);
    const cm = new Map(clusters.map((c) => [c.slug, c]));
    const bm = new Map(bots.map((b) => [b.slug, b]));
    return {
      entitlements: ents.map((e) => {
        const info = e.kind === 'CLUSTER' ? cm.get(e.refSlug) : bm.get(e.refSlug);
        const active = e.expiresAt > now;
        return {
          id: e.id, kind: e.kind, slug: e.refSlug, name: info?.name ?? e.refSlug, icon: info?.icon ?? '📦',
          color: e.kind === 'CLUSTER' ? (cm.get(e.refSlug)?.color ?? '#6a8dff') : '#6a8dff',
          clusterSlug: e.kind === 'BOT' ? (bm.get(e.refSlug)?.cluster?.slug ?? null) : e.refSlug,
          source: e.source, startsAt: e.startsAt, expiresAt: e.expiresAt, active,
          daysLeft: active ? Math.ceil((e.expiresAt.getTime() - now.getTime()) / 86_400_000) : 0,
        };
      }),
      orders: orders.map((o) => ({
        id: o.id, code: o.code, status: o.status, amount: o.amount, refId: o.refId, createdAt: o.createdAt, paidAt: o.paidAt,
        items: o.items.map((i) => ({ kind: i.kind, slug: i.refSlug, title: i.title, months: i.months, total: i.total })),
      })),
    };
  });
}
