import type { PrismaClient } from '@prisma/client';
import { defaultLanding, type LandingContent } from './landing-defaults.js';
import { getSettings } from './access.js';

const hasFa = (s: string) => /[؀-ۿ]/.test(s);

export function mergeContent(base: LandingContent, overrideJson: string | null | undefined): LandingContent {
  let o: Record<string, unknown> = {};
  try {
    o = JSON.parse(overrideJson || '{}') as Record<string, unknown>;
  } catch {
    o = {};
  }
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(o)) {
    if (!(k in base)) continue;
    if (typeof v === 'string' && v.trim()) out[k] = v;
    else if (Array.isArray(v) && v.length) out[k] = v;
  }
  return out as unknown as LandingContent;
}

/** ربات‌های عمومی خوشه، با اولویت نام فارسی و پرکاربردتر */
export async function clusterBots(prisma: PrismaClient, clusterId: string) {
  const bots = await prisma.bot.findMany({
    where: { clusterId, userId: null, isActive: true },
    select: { slug: true, name: true, description: true, systemPrompt: true, model: true, temperature: true, isPremium: true },
    take: 60,
  });
  return bots.sort((a, b) => Number(hasFa(b.name)) - Number(hasFa(a.name)) || Number(a.isPremium) - Number(b.isPremium) || a.name.localeCompare(b.name));
}

export async function loadLanding(prisma: PrismaClient, slug: string, opts: { includeInactive?: boolean } = {}) {
  const cluster = await prisma.cluster.findUnique({ where: { slug } });
  if (!cluster) return null;
  const [row, settings] = await Promise.all([prisma.landing.findUnique({ where: { slug } }), getSettings(prisma)]);
  const active = cluster.isActive && (row?.isActive ?? true) && settings.landingsEnabled;
  if (!active && !opts.includeInactive) return null;
  const content = mergeContent(defaultLanding(slug, cluster.name), row?.content);
  const bots = await clusterBots(prisma, cluster.id);
  const featured =
    content.featured?.length
      ? content.featured
      : bots.slice(0, 2).map((b) => ({ name: b.name, desc: (b.description ?? '').slice(0, 160) }));
  const trialEnabled = settings.trialEnabled && (row?.trialEnabled ?? true);
  const demoEnabled = settings.demoEnabled && (row?.demoEnabled ?? true) && bots.length > 0;
  return {
    cluster: { slug: cluster.slug, name: cluster.name, icon: cluster.icon, color: cluster.color, priceMonthly: cluster.priceMonthly, botCount: bots.length },
    active,
    content: { ...content, featured },
    moreBots: Math.max(0, bots.length - featured.length),
    trial: { enabled: trialEnabled && cluster.priceMonthly > 0, days: row?.trialDays ?? settings.trialDays },
    demo: { enabled: demoEnabled },
    supportLink: settings.supportLink,
    storeName: settings.storeName,
    row,
  };
}
