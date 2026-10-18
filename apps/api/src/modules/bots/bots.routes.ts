import type { FastifyInstance } from 'fastify';
import { BotsService } from './bots.service.js';
import { createBotSchema, updateBotSchema, listBotsSchema } from './bots.schema.js';

export async function botsRoutes(app: FastifyInstance) {
  const service = new BotsService(app);

  // ربات‌های دارای مالک را فقط خود مالک می‌تواند تغییر دهد
  async function assertOwner(id: string, userId: string) {
    const bot = await app.prisma.bot.findUnique({ where: { id }, select: { userId: true } });
    if (!bot) throw Object.assign(new Error('Bot not found'), { statusCode: 404 });
    if (bot.userId && bot.userId !== userId) {
      throw Object.assign(new Error('Access denied'), { statusCode: 403 });
    }
  }

  app.get('/', async (request) => {
    const query = listBotsSchema.parse(request.query);
    return service.list({
      q: query.q,
      clusterId: query.clusterId,
      isActive:
        query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined,
      page: query.page,
      limit: query.limit,
    });
  });

  app.get('/:id', async (request) => {
    const { id } = request.params as { id: string };
    return service.getById(id);
  });

  app.post('/', { preHandler: [app.authenticate] }, async (request) => {
    const input = createBotSchema.parse(request.body);
    return service.create(input, request.user.sub);
  });

  app.patch('/:id', { preHandler: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    await assertOwner(id, request.user.sub);
    const input = updateBotSchema.parse(request.body);
    return service.update(id, input);
  });

  app.post('/:id/toggle', { preHandler: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    await assertOwner(id, request.user.sub);
    return service.toggle(id);
  });

  app.delete('/:id', { preHandler: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    await assertOwner(id, request.user.sub);
    return service.remove(id);
  });
}
