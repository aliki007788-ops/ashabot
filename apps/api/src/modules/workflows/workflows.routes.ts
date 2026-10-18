import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { isSafeWebhookUrl } from '../../lib/guardrails.js';

const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('reply'), text: z.string().min(1).max(2000) }),
  z.object({ type: z.literal('tag'), tag: z.string().min(1).max(40) }),
  z.object({ type: z.literal('set_stage'), stage: z.string().min(1).max(30) }),
  z.object({ type: z.literal('handoff'), reason: z.string().max(200).optional() }),
  z.object({ type: z.literal('webhook'), url: z.string().url() }),
]);

const wfSchema = z.object({
  name: z.string().min(1).max(120),
  botId: z.string().optional().nullable(),
  triggerType: z.enum(['KEYWORD', 'NEW_MESSAGE', 'NEW_LEAD', 'HANDOFF']),
  triggerValue: z.string().max(500).optional().nullable(),
  actions: z.array(actionSchema).min(1).max(10),
  isActive: z.boolean().optional(),
});

export async function workflowsRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  async function own(id: string, userId: string) {
    const w = await app.prisma.workflow.findUnique({ where: { id } });
    if (!w || w.userId !== userId) throw Object.assign(new Error('اتوماسیون یافت نشد'), { statusCode: 404 });
    return w;
  }
  function check(input: z.infer<typeof wfSchema>) {
    for (const a of input.actions)
      if (a.type === 'webhook' && !isSafeWebhookUrl(a.url))
        throw Object.assign(new Error('آدرس webhook باید https و عمومی باشد'), { statusCode: 400 });
  }

  app.get('/', auth, async (request) => {
    const items = await app.prisma.workflow.findMany({ where: { userId: request.user.sub }, orderBy: { createdAt: 'desc' } });
    return { items: items.map((w) => ({ ...w, actions: JSON.parse(w.actions || '[]') })) };
  });

  app.post('/', auth, async (request) => {
    const input = wfSchema.parse(request.body);
    check(input);
    return app.prisma.workflow.create({
      data: { ...input, actions: JSON.stringify(input.actions), userId: request.user.sub, botId: input.botId || null } as any,
    });
  });

  app.patch('/:id', auth, async (request) => {
    const { id } = request.params as { id: string };
    await own(id, request.user.sub);
    const input = wfSchema.partial().parse(request.body);
    if (input.actions) check(input as any);
    const { actions, ...rest } = input;
    return app.prisma.workflow.update({
      where: { id },
      data: { ...rest, ...(actions ? { actions: JSON.stringify(actions) } : {}) },
    });
  });

  app.delete('/:id', auth, async (request) => {
    const { id } = request.params as { id: string };
    await own(id, request.user.sub);
    await app.prisma.workflow.delete({ where: { id } });
    return { ok: true };
  });
}
