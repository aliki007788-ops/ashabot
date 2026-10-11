import type { FastifyInstance } from 'fastify';
import { BotsService } from './bots.service.js';
import { createBotSchema, updateBotSchema, listBotsSchema } from './bots.schema.js';

export async function botsRoutes(app: FastifyInstance) {
  const service = new BotsService(app);

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
    const input = updateBotSchema.parse(request.body);
    return service.update(id, input);
  });

  app.post('/:id/toggle', { preHandler: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    return service.toggle(id);
  });

  app.delete('/:id', { preHandler: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    return service.remove(id);
  });
}
