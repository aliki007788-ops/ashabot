import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../../env.js';
import { ci } from '../../lib/dbmode.js';
import { adminEmails, getSettings, saveSettings } from '../../lib/access.js';
import { addMonths, fulfillOrder, MONTH_CHOICES } from '../../lib/store.js';
import { generateOpaqueToken, hashToken } from '../../lib/jwt.js';

const frontend = () => (env.FRONTEND_URL || env.CORS_ORIGIN.split(',')[0] || 'http://localhost:3000').replace(/\/$/, '');
const dayKey = (d: Date): string => d.toISOString().slice(0, 10);
const clampInt = (v: unknown, a: number, b: number, d: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(b, Math.max(a, Math.trunc(n))) : d;
};

/** پنل مدیریت: فقط ADMIN (نقش از دیتابیس خوانده می‌شود) */
export async function adminRoutes(app: FastifyInstance) {
  const prisma = app.prisma;
  const admin = { preHandler: [app.requireAdmin] };
  const bad = (m: string, code = 400): Error => Object.assign(new Error(m), { statusCode: code });

  /* ───── نمای کلی ───── */
  app.get('/stats', admin, async () => {
    const now = new Date();
    const d7 = new Date(now.getTime() - 7 * 86_400_000);
    const d14 = new Date(now.getTime() - 14 * 86_400_000);
    const d30 = new Date(now.getTime() - 30 * 86_400_000);
    const [users, newUsers7, admins, ordersByStatus, paidAll, paid30, paidRecent, activeEnts, soldItems, conversations, messages, runs7, recentOrders, recentUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: d7 } } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.order.aggregate({ where: { status: 'PAID' }, _sum: { amount: true }, _count: { _all: true } }),
      prisma.order.aggregate({ where: { status: 'PAID', paidAt: { gte: d30 } }, _sum: { amount: true } }),
      prisma.order.findMany({ where: { status: 'PAID', paidAt: { gte: d14 } }, select: { amount: true, paidAt: true } }),
      prisma.entitlement.count({ where: { expiresAt: { gt: now } } }),
      prisma.orderItem.groupBy({ by: ['kind', 'refSlug', 'title'], where: { order: { status: 'PAID' } }, _count: { _all: true }, _sum: { total: true }, orderBy: { _sum: { total: 'desc' } }, take: 8 }),
      prisma.conversation.count(),
      prisma.message.count(),
      prisma.clusterOutput.count({ where: { type: 'PROCESS_RUN', createdAt: { gte: d7 } } }),
      prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 8, include: { user: { select: { name: true, email: true } } } }),
      prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 8, select: { id: true, name: true, email: true, role: true, createdAt: true } }),
    ]);
    const series: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) series[dayKey(new Date(now.getTime() - i * 86_400_000))] = 0;
    for (const o of paidRecent) {
      const k = dayKey(o.paidAt ?? now);
      if (k in series) series[k] += o.amount;
    }
    return {
      users: { total: users, new7d: newUsers7, admins },
      orders: Object.fromEntries(ordersByStatus.map((r) => [r.status, r._count._all])),
      revenue: { total: paidAll._sum.amount ?? 0, last30d: paid30._sum.amount ?? 0, paidOrders: paidAll._count._all, series: Object.entries(series).map(([date, amount]) => ({ date, amount })) },
      activeEntitlements: activeEnts,
      topSold: soldItems.map((s) => ({ kind: s.kind, slug: s.refSlug, title: s.title, count: s._count._all, revenue: s._sum.total ?? 0 })),
      usage: { conversations, messages, processRuns7d: runs7 },
      recentOrders: recentOrders.map((o) => ({ id: o.id, code: o.code, status: o.status, amount: o.amount, createdAt: o.createdAt, user: o.user })),
      recentUsers,
    };
  });

  /* ───── کاربران ───── */
  app.get('/users', admin, async (request) => {
    const q = (request.query ?? {}) as { q?: string; role?: string; skip?: string; take?: string };
    const where = {
      ...(q.role === 'ADMIN' || q.role === 'USER' ? { role: q.role } : {}),
      ...(q.q?.trim() ? { OR: [{ email: { contains: q.q.trim(), ...ci } }, { name: { contains: q.q.trim(), ...ci } }] } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: clampInt(q.skip, 0, 100000, 0), take: clampInt(q.take, 1, 100, 25),
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, _count: { select: { orders: true, entitlements: true, bots: true } } },
      }),
      prisma.user.count({ where }),
    ]);
    return { items, total };
  });

  app.get('/users/:id', admin, async (request) => {
    const { id } = request.params as { id: string };
    const u = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, role: true, isActive: true, createdAt: true,
        entitlements: { orderBy: { expiresAt: 'desc' }, take: 100 },
        orders: { orderBy: { createdAt: 'desc' }, take: 50, include: { items: true } },
        _count: { select: { bots: true, conversations: true } },
      },
    });
    if (!u) throw bad('کاربر پیدا نشد', 404);
    return u;
  });

  app.patch('/users/:id', admin, async (request) => {
    const { id } = request.params as { id: string };
    const body = z.object({ role: z.enum(['ADMIN', 'USER']).optional(), isActive: z.boolean().optional(), name: z.string().min(2).max(80).optional() }).parse(request.body);
    if (id === request.user.sub && (body.role === 'USER' || body.isActive === false)) throw bad('نمی‌توانید نقش یا فعال‌بودن خودتان را کم کنید');
    const u = await prisma.user.update({ where: { id }, data: body, select: { id: true, name: true, email: true, role: true, isActive: true } });
    if (body.isActive === false) await prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    await prisma.activityLog.create({ data: { type: 'admin.user', message: `مدیر کاربر ${u.email} را ویرایش کرد`, userId: request.user.sub, metadata: JSON.stringify(body) } });
    return u;
  });

  app.post('/users/:id/grant', admin, async (request) => {
    const { id } = request.params as { id: string };
    const b = z.object({ kind: z.enum(['CLUSTER', 'BOT']), slug: z.string().min(1), months: z.number().int().min(1).max(36) }).parse(request.body);
    const exists = b.kind === 'CLUSTER' ? await prisma.cluster.findUnique({ where: { slug: b.slug } }) : await prisma.bot.findFirst({ where: { slug: b.slug, userId: null } });
    if (!exists) throw bad('مورد پیدا نشد', 404);
    const now = new Date();
    const active = await prisma.entitlement.findFirst({ where: { userId: id, kind: b.kind, refSlug: b.slug, expiresAt: { gt: now } }, orderBy: { expiresAt: 'desc' } });
    const ent = active
      ? await prisma.entitlement.update({ where: { id: active.id }, data: { expiresAt: addMonths(active.expiresAt, b.months) } })
      : await prisma.entitlement.create({ data: { userId: id, kind: b.kind, refSlug: b.slug, source: 'ADMIN', expiresAt: addMonths(now, b.months) } });
    await prisma.activityLog.create({ data: { type: 'admin.grant', message: `دسترسی ${b.kind}:${b.slug} برای ${b.months} ماه داده شد`, userId: request.user.sub, metadata: JSON.stringify({ target: id }) } });
    return ent;
  });

  app.delete('/entitlements/:id', admin, async (request) => {
    const { id } = request.params as { id: string };
    await prisma.entitlement.deleteMany({ where: { id } });
    return { ok: true };
  });

  /** لینک بازیابی رمز برای کاربر (وقتی ایمیل پیکربندی نشده) */
  app.post('/users/:id/reset-link', admin, async (request) => {
    const { id } = request.params as { id: string };
    const u = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!u) throw bad('کاربر پیدا نشد', 404);
    const raw = generateOpaqueToken();
    await prisma.passwordReset.create({ data: { userId: id, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
    return { link: `${frontend()}/reset-password?token=${raw}`, expiresInMinutes: 60 };
  });

  /* ───── سفارش‌ها ───── */
  app.get('/orders', admin, async (request) => {
    const q = (request.query ?? {}) as { q?: string; status?: string; skip?: string; take?: string };
    const where = {
      ...(['PENDING', 'PAID', 'FAILED', 'CANCELED'].includes(String(q.status)) ? { status: String(q.status) } : {}),
      ...(q.q?.trim() ? { OR: [{ code: { contains: q.q.trim().toUpperCase() } }, { user: { email: { contains: q.q.trim(), ...ci } } }] } : {}),
    };
    const [items, total, sum] = await Promise.all([
      prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip: clampInt(q.skip, 0, 100000, 0), take: clampInt(q.take, 1, 100, 25), include: { items: true, user: { select: { name: true, email: true } } } }),
      prisma.order.count({ where }),
      prisma.order.aggregate({ where: { ...where, status: 'PAID' }, _sum: { amount: true } }),
    ]);
    return { items, total, paidSum: sum._sum.amount ?? 0 };
  });

  app.post('/orders/:id/mark-paid', admin, async (request) => {
    const { id } = request.params as { id: string };
    const b = z.object({ note: z.string().max(200).optional() }).parse(request.body ?? {});
    const o = await prisma.order.findUnique({ where: { id } });
    if (!o) throw bad('سفارش پیدا نشد', 404);
    if (o.status === 'CANCELED') throw bad('سفارش لغوشده را نمی‌شود پرداخت‌شده کرد');
    const r = await fulfillOrder(prisma, id, 'MANUAL');
    if (b.note) await prisma.order.update({ where: { id }, data: { note: b.note } });
    await prisma.activityLog.create({ data: { type: 'admin.order', message: `سفارش ${o.code} دستی «پرداخت‌شده» شد`, userId: request.user.sub } });
    return r;
  });

  app.post('/orders/:id/cancel', admin, async (request) => {
    const { id } = request.params as { id: string };
    const o = await prisma.order.findUnique({ where: { id } });
    if (!o) throw bad('سفارش پیدا نشد', 404);
    if (o.status === 'PAID') throw bad('سفارش پرداخت‌شده را لغو نکنید؛ دسترسی را از صفحه‌ی کاربر بردارید');
    await prisma.order.update({ where: { id }, data: { status: 'CANCELED' } });
    return { ok: true };
  });

  /* ───── کاتالوگ و قیمت‌ها ───── */
  app.get('/catalog', admin, async (request) => {
    const q = (request.query ?? {}) as { q?: string };
    const [clusters, bots, sold] = await Promise.all([
      prisma.cluster.findMany({ orderBy: { sortOrder: 'asc' }, select: { slug: true, name: true, icon: true, color: true, isActive: true, priceMonthly: true, _count: { select: { bots: true } } } }),
      prisma.bot.findMany({
        where: { userId: null, ...(q.q?.trim() ? { OR: [{ name: { contains: q.q.trim(), ...ci } }, { slug: { contains: q.q.trim(), ...ci } }] } : {}) },
        orderBy: [{ clusterId: 'asc' }, { name: 'asc' }], take: 300,
        select: { slug: true, name: true, icon: true, isActive: true, isPremium: true, priceMonthly: true, cluster: { select: { name: true, slug: true } } },
      }),
      prisma.orderItem.groupBy({ by: ['kind', 'refSlug'], where: { order: { status: 'PAID' } }, _count: { _all: true } }),
    ]);
    const soldMap = new Map(sold.map((s) => [`${s.kind}:${s.refSlug}`, s._count._all]));
    return {
      clusters: clusters.map((c) => ({ ...c, botCount: c._count.bots, sold: soldMap.get(`CLUSTER:${c.slug}`) ?? 0 })),
      bots: bots.map((b) => ({ ...b, sold: soldMap.get(`BOT:${b.slug}`) ?? 0 })),
    };
  });

  const priceSchema = z.object({ priceMonthly: z.number().int().min(0).max(500_000_000) });
  app.patch('/catalog/cluster/:slug', admin, async (request) => {
    const { slug } = request.params as { slug: string };
    const { priceMonthly } = priceSchema.parse(request.body);
    return prisma.cluster.update({ where: { slug }, data: { priceMonthly }, select: { slug: true, priceMonthly: true } });
  });
  app.patch('/catalog/bot/:slug', admin, async (request) => {
    const { slug } = request.params as { slug: string };
    const { priceMonthly } = priceSchema.parse(request.body);
    return prisma.bot.update({ where: { slug }, data: { priceMonthly }, select: { slug: true, priceMonthly: true } });
  });
  app.post('/catalog/bulk', admin, async (request) => {
    const b = z.object({ kind: z.enum(['CLUSTER', 'BOT']), priceMonthly: z.number().int().min(0).max(500_000_000), onlyUnpriced: z.boolean().optional() }).parse(request.body);
    const r =
      b.kind === 'CLUSTER'
        ? await prisma.cluster.updateMany({ where: b.onlyUnpriced ? { priceMonthly: 0 } : {}, data: { priceMonthly: b.priceMonthly } })
        : await prisma.bot.updateMany({ where: { userId: null, ...(b.onlyUnpriced ? { priceMonthly: 0 } : {}) }, data: { priceMonthly: b.priceMonthly } });
    return { updated: r.count };
  });

  /* ───── تنظیمات ───── */
  app.get('/settings', admin, async () => ({ settings: await getSettings(prisma, true), months: MONTH_CHOICES }));
  app.put('/settings', admin, async (request) => {
    const b = z.object({ enforcePurchases: z.boolean().optional(), allowFakePayments: z.boolean().optional(), storeName: z.string().min(1).max(60).optional(), announcement: z.string().max(300).optional() }).parse(request.body);
    if (b.allowFakePayments && env.NODE_ENV === 'production' && env.ZARINPAL_MERCHANT_ID) throw bad('با درگاه واقعی فعال، «پرداخت آزمایشی» لازم نیست و روشن نمی‌شود');
    return { settings: await saveSettings(prisma, b) };
  });

  /* ───── سلامت سیستم و فعالیت ───── */
  app.get('/system', admin, async () => {
    const t0 = Date.now();
    let dbOk = true;
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbOk = false;
    }
    const [clusters, bots, templates, brains] = await Promise.all([prisma.cluster.count(), prisma.bot.count(), prisma.bot.count({ where: { userId: null } }), prisma.brain.count()]);
    const mem = process.memoryUsage();
    return {
      db: { ok: dbOk, latencyMs: Date.now() - t0 },
      counts: { clusters, bots, templates, brains },
      config: {
        openai: !!env.OPENAI_API_KEY, gemini: !!env.GEMINI_API_KEY, anthropic: !!env.ANTHROPIC_API_KEY,
        zarinpal: !!env.ZARINPAL_MERCHANT_ID, zarinpalSandbox: env.ZARINPAL_SANDBOX === 'true',
        email: !!env.RESEND_API_KEY, adminEmails: adminEmails().length, frontendUrl: !!env.FRONTEND_URL, publicApiUrl: !!(env.PUBLIC_API_URL || env.RENDER_EXTERNAL_URL),
        corsOpen: env.CORS_ORIGIN.includes('*'),
      },
      runtime: { node: process.version, uptimeSec: Math.round(process.uptime()), rssMb: Math.round(mem.rss / 1048576), env: env.NODE_ENV },
    };
  });

  app.get('/activity', admin, async (request) => {
    const q = (request.query ?? {}) as { take?: string };
    const items = await prisma.activityLog.findMany({ orderBy: { createdAt: 'desc' }, take: clampInt(q.take, 1, 200, 60), include: { user: { select: { name: true, email: true } }, bot: { select: { name: true, icon: true } } } });
    return { items };
  });
}
