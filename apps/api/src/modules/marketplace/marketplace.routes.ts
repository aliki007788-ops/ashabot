import type { FastifyInstance } from 'fastify';
import { ci } from '../../lib/dbmode.js';
import { z } from 'zod';

/** فروشگاه قالب‌ها: ربات‌های پرمیوم/قالب را برای کاربر نصب (کپی) می‌کند */
export async function marketplaceRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get('/', async (request) => {
    const q = z.object({ q: z.string().optional(), cluster: z.string().optional(), premium: z.string().optional() }).parse(request.query);
    const items = await app.prisma.bot.findMany({
      where: {
        userId: null,
        isActive: true,
        ...(q.cluster ? { cluster: { slug: q.cluster } } : {}),
        ...(q.premium === 'true' ? { isPremium: true } : {}),
        ...(q.q ? { OR: [
          { name: { contains: q.q, ...ci } },
          { description: { contains: q.q, ...ci } },
        ] } : {}),
      },
      select: {
        id: true, name: true, slug: true, icon: true, description: true, isPremium: true, tools: true,
        cluster: { select: { name: true, slug: true, icon: true, color: true } },
      },
      orderBy: [{ isPremium: 'desc' }, { createdAt: 'desc' }],
      take: 300,
    });
    return { items };
  });

  app.post('/:id/install', auth, async (request) => {
    const { id } = request.params as { id: string };
    const src = await app.prisma.bot.findUnique({ where: { id }, include: { brains: true } });
    if (!src || src.userId) throw Object.assign(new Error('قالب یافت نشد'), { statusCode: 404 });
    const slug = `${src.slug}-${request.user.sub.slice(-6)}-${Date.now().toString(36)}`;
    const bot = await app.prisma.bot.create({
      data: {
        name: src.name,
        slug,
        description: src.description,
        icon: src.icon,
        systemPrompt: src.systemPrompt,
        temperature: src.temperature,
        maxTokens: src.maxTokens,
        model: src.model,
        isPremium: false,
        isTemplate: false,
        tools: src.tools,
        config: src.config,
        clusterId: src.clusterId,
        userId: request.user.sub,
        brains: { create: src.brains.map((b) => ({ brainId: b.brainId })) },
      },
    });
    return bot;
  });
}
