import type { PrismaClient } from '@prisma/client';
import { env } from '../env.js';

/* ───────────── مدیر (ADMIN) ───────────── */
export const adminEmails = (): string[] =>
  (env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export const isAdminEmail = (email: string): boolean => adminEmails().includes(email.toLowerCase());

/** اگر ایمیل در ADMIN_EMAILS باشد نقش کاربر ADMIN می‌شود (ایمن: فقط ارتقا). */
export async function ensureAdminRole<T extends { id: string; email: string; role: string }>(prisma: PrismaClient, user: T): Promise<T> {
  if (user.role !== 'ADMIN' && isAdminEmail(user.email)) {
    await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
    return { ...user, role: 'ADMIN' } as T;
  }
  return user;
}

/* ───────────── تنظیمات پلتفرم ───────────── */
export interface PlatformSettings {
  /** اگر روشن باشد خوشه/ربات قیمت‌دار فقط با خرید (یا اشتراک فعال) قابل استفاده است */
  enforcePurchases: boolean;
  /** پرداخت دستی/آزمایشی: سفارش بدون درگاه هم فعال شود؟ (فقط برای تست؛ پیش‌فرض خاموش) */
  allowFakePayments: boolean;
  /** نام فروشگاه برای صورتحساب */
  storeName: string;
  /** پیام اطلاع‌رسانی بالای پنل کاربر (اختیاری) */
  announcement: string;
}

export const DEFAULT_SETTINGS: PlatformSettings = {
  enforcePurchases: false,
  allowFakePayments: false,
  storeName: 'آشا',
  announcement: '',
};

let cache: { at: number; value: PlatformSettings } | null = null;

export async function getSettings(prisma: PrismaClient, fresh = false): Promise<PlatformSettings> {
  if (!fresh && cache && Date.now() - cache.at < 15_000) return cache.value;
  const rows = await prisma.appSetting.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const value: PlatformSettings = {
    enforcePurchases: map.enforcePurchases === 'true',
    allowFakePayments: map.allowFakePayments === 'true',
    storeName: map.storeName || DEFAULT_SETTINGS.storeName,
    announcement: map.announcement ?? '',
  };
  cache = { at: Date.now(), value };
  return value;
}

export async function saveSettings(prisma: PrismaClient, patch: Partial<PlatformSettings>): Promise<PlatformSettings> {
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    const value = typeof v === 'boolean' ? String(v) : String(v).slice(0, 500);
    await prisma.appSetting.upsert({ where: { key: k }, create: { key: k, value }, update: { value } });
  }
  return getSettings(prisma, true);
}

/* ───────────── دسترسی (خرید) ───────────── */
export interface Actor {
  sub: string;
  role: string;
}

export interface AccessResult {
  ok: boolean;
  reason?: string;
  clusterSlug?: string;
}

async function hasEntitlement(prisma: PrismaClient, userId: string, kind: 'CLUSTER' | 'BOT', refSlug: string): Promise<boolean> {
  const e = await prisma.entitlement.findFirst({ where: { userId, kind, refSlug, expiresAt: { gt: new Date() } }, select: { id: true } });
  return !!e;
}

/**
 * آیا کاربر می‌تواند از این خوشه (و در صورت وجود، این ربات) استفاده کند؟
 * قانون: ادمین همیشه؛ اگر اعمال خرید خاموش باشد همه؛ خوشه‌ی رایگان (قیمت ۰) همه؛
 * وگرنه باید اشتراک فعال برای خوشه یا همان ربات داشته باشد.
 */
export async function canUse(prisma: PrismaClient, actor: Actor, target: { clusterSlug?: string; botSlug?: string }): Promise<AccessResult> {
  if (actor.role === 'ADMIN') return { ok: true };
  const settings = await getSettings(prisma);
  if (!settings.enforcePurchases) return { ok: true };

  let clusterSlug = target.clusterSlug;
  let botSlug = target.botSlug;
  let bot: { slug: string; priceMonthly: number; userId: string | null; cluster: { slug: string; priceMonthly: number } | null } | null = null;
  if (botSlug) {
    bot = await prisma.bot.findUnique({ where: { slug: botSlug }, select: { slug: true, priceMonthly: true, userId: true, cluster: { select: { slug: true, priceMonthly: true } } } });
    if (bot) {
      if (bot.userId === actor.sub) return { ok: true }; // نسخه‌ی شخصی کاربر (نصب‌شده)
      clusterSlug = clusterSlug ?? bot.cluster?.slug;
    }
  }
  const cluster = clusterSlug ? await prisma.cluster.findUnique({ where: { slug: clusterSlug }, select: { slug: true, priceMonthly: true } }) : null;
  const clusterPaid = !!cluster && cluster.priceMonthly > 0;
  const botPaid = !!bot && bot.priceMonthly > 0;
  if (!clusterPaid && !botPaid) return { ok: true };

  if (cluster && clusterPaid && (await hasEntitlement(prisma, actor.sub, 'CLUSTER', cluster.slug))) return { ok: true };
  if (bot && botPaid && (await hasEntitlement(prisma, actor.sub, 'BOT', bot.slug))) return { ok: true };
  // ربات رایگان داخل خوشه‌ی پولی هم باید خوشه را داشته باشد
  return { ok: false, reason: 'برای استفاده از این بخش باید آن را از «فروشگاه» تهیه کنید.', clusterSlug: cluster?.slug };
}

export function deny(reason: string): Error {
  return Object.assign(new Error(reason), { statusCode: 402 });
}
