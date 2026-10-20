import type { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

export const MONTH_CHOICES = [1, 3, 6, 12] as const;
/** تخفیف خرید بلندمدت (درصد) */
export const DISCOUNT: Record<number, number> = { 1: 0, 3: 5, 6: 10, 12: 20 };

export const priceFor = (monthly: number, months: number): number => Math.round((monthly * months * (100 - (DISCOUNT[months] ?? 0))) / 100);

export const newOrderCode = (): string => 'A' + Date.now().toString(36).toUpperCase().slice(-5) + crypto.randomBytes(2).toString('hex').toUpperCase();

export function addMonths(from: Date, months: number): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * پس از پرداخت موفق: سفارش «PAID» و برای هر آیتم دسترسی ساخته/تمدید می‌شود.
 * ایدمپوتنت است: اگر سفارش قبلاً PAID شده باشد دوباره دسترسی نمی‌سازد.
 */
export async function fulfillOrder(prisma: PrismaClient, orderId: string, refId?: string): Promise<{ ok: boolean; already?: boolean }> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) return { ok: false };
    if (order.status === 'PAID') return { ok: true, already: true };
    const now = new Date();
    for (const it of order.items) {
      const active = await tx.entitlement.findFirst({
        where: { userId: order.userId, kind: it.kind, refSlug: it.refSlug, expiresAt: { gt: now } },
        orderBy: { expiresAt: 'desc' },
      });
      if (active) {
        await tx.entitlement.update({ where: { id: active.id }, data: { expiresAt: addMonths(active.expiresAt, it.months), orderId: order.id } });
      } else {
        await tx.entitlement.create({
          data: { userId: order.userId, kind: it.kind, refSlug: it.refSlug, orderId: order.id, source: 'PURCHASE', startsAt: now, expiresAt: addMonths(now, it.months) },
        });
      }
    }
    await tx.order.update({ where: { id: order.id }, data: { status: 'PAID', paidAt: now, refId: refId ?? order.refId } });
    return { ok: true };
  });
}
