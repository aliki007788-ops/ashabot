import type { FastifyInstance } from 'fastify';

export async function clustersRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    const clusters = await app.prisma.cluster.findMany({
      include: { _count: { select: { bots: true } } },
      orderBy: { sortOrder: 'asc' },
    });
    return { items: clusters };
  });

  app.get('/:id', async (request) => {
    const { id } = request.params as { id: string };
    const cluster = await app.prisma.cluster.findUnique({
      where: { id },
      include: { bots: { orderBy: { createdAt: 'desc' } } },
    });
    if (!cluster) throw Object.assign(new Error('Cluster not found'), { statusCode: 404 });
    return cluster;
  });
}
