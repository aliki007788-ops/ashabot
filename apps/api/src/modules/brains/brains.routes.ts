import type { FastifyInstance } from 'fastify';

export async function brainsRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    const brains = await app.prisma.brain.findMany({
      include: { _count: { select: { bots: true } } },
      orderBy: [{ isCentral: 'desc' }, { name: 'asc' }],
    });
    return { items: brains };
  });

  app.get('/:id', async (request) => {
    const { id } = request.params as { id: string };
    const brain = await app.prisma.brain.findUnique({
      where: { id },
      include: { bots: { include: { bot: true } } },
    });
    if (!brain) throw Object.assign(new Error('Brain not found'), { statusCode: 404 });
    return brain;
  });
}
