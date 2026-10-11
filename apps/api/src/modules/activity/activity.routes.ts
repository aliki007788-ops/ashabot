import type { FastifyInstance } from 'fastify';

export async function activityRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const { limit = '30' } = request.query as { limit?: string };
    const activities = await app.prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit), 100),
      include: { bot: { select: { id: true, name: true, icon: true } } },
    });
    return { items: activities };
  });
}
