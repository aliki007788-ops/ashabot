import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../../env.js';

/**
 * درگاه پرداخت زرین‌پال (API v4). مبلغ‌ها در دیتابیس «تومان» است و به ریال تبدیل می‌شود.
 * متغیرها: ZARINPAL_MERCHANT_ID ، ZARINPAL_SANDBOX=true (برای تست)، PUBLIC_API_URL ، FRONTEND_URL
 */
const host = () => (env.ZARINPAL_SANDBOX === 'true' ? 'https://sandbox.zarinpal.com' : 'https://payment.zarinpal.com');
const publicApi = () => (env.PUBLIC_API_URL || env.RENDER_EXTERNAL_URL || `http://localhost:${env.API_PORT}`).replace(/\/$/, '');
const frontend = () => (env.FRONTEND_URL || env.CORS_ORIGIN.split(',')[0] || 'http://localhost:3000').replace(/\/$/, '');

export async function paymentsRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get('/', auth, async (request) => {
    const items = await app.prisma.payment.findMany({
      where: { userId: request.user.sub },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const paid = items.filter((p) => p.status === 'PAID').reduce((a, p) => a + p.amount, 0);
    return { items, totalPaid: paid, configured: !!env.ZARINPAL_MERCHANT_ID };
  });

  // ایجاد لینک پرداخت دستی
  app.post('/', auth, async (request) => {
    const input = z.object({
      amount: z.number().int().min(1000).max(500_000_000),
      description: z.string().min(1).max(200),
    }).parse(request.body);
    const p = await app.prisma.payment.create({
      data: { ...input, userId: request.user.sub, purpose: 'manual' },
    });
    return { ...p, url: `${publicApi()}/api/payments/pay/${p.id}` };
  });

  // شروع پرداخت: ریدایرکت به درگاه (عمومی؛ لینک برای مشتری ارسال می‌شود)
  app.get('/pay/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const p = await app.prisma.payment.findUnique({ where: { id } });
    if (!p) return reply.code(404).send({ error: 'پرداخت یافت نشد' });
    if (p.status === 'PAID') return reply.redirect(`${frontend()}/pay/result?status=ok&id=${p.id}`);
    if (!env.ZARINPAL_MERCHANT_ID) {
      return reply.code(503).send({ error: 'درگاه پرداخت تنظیم نشده است (ZARINPAL_MERCHANT_ID)' });
    }
    const res = await fetch(`${host()}/pg/v4/payment/request.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        merchant_id: env.ZARINPAL_MERCHANT_ID,
        amount: p.amount * 10,
        currency: 'IRR',
        description: p.description,
        callback_url: `${publicApi()}/api/payments/callback?pid=${p.id}`,
      }),
    });
    const json: any = await res.json().catch(() => ({}));
    const authority = json?.data?.authority;
    if (!authority) {
      app.log.warn({ json }, 'zarinpal request failed');
      return reply.code(502).send({ error: 'ساخت تراکنش در درگاه ناموفق بود' });
    }
    await app.prisma.payment.update({ where: { id: p.id }, data: { authority } });
    return reply.redirect(`${host()}/pg/StartPay/${authority}`);
  });

  // بازگشت از درگاه + تأیید (verify)
  app.get('/callback', async (request, reply) => {
    const q = z.object({ pid: z.string(), Authority: z.string().optional(), Status: z.string().optional() }).parse(request.query);
    const p = await app.prisma.payment.findUnique({ where: { id: q.pid } });
    if (!p || !q.Authority || p.authority !== q.Authority) {
      return reply.redirect(`${frontend()}/pay/result?status=fail`);
    }
    if (p.status === 'PAID') return reply.redirect(`${frontend()}/pay/result?status=ok&id=${p.id}`);
    if (q.Status !== 'OK') {
      await app.prisma.payment.update({ where: { id: p.id }, data: { status: 'FAILED' } });
      return reply.redirect(`${frontend()}/pay/result?status=fail&id=${p.id}`);
    }
    const res = await fetch(`${host()}/pg/v4/payment/verify.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ merchant_id: env.ZARINPAL_MERCHANT_ID, amount: p.amount * 10, authority: q.Authority }),
    });
    const json: any = await res.json().catch(() => ({}));
    const code = json?.data?.code;
    if (code === 100 || code === 101) {
      await app.prisma.payment.update({
        where: { id: p.id },
        data: { status: 'PAID', refId: String(json.data.ref_id ?? ''), paidAt: new Date() },
      });
      app.io?.emit('payment:paid', { paymentId: p.id, amount: p.amount });
      return reply.redirect(`${frontend()}/pay/result?status=ok&id=${p.id}`);
    }
    await app.prisma.payment.update({ where: { id: p.id }, data: { status: 'FAILED' } });
    return reply.redirect(`${frontend()}/pay/result?status=fail&id=${p.id}`);
  });
}
