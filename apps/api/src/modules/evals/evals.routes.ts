import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AiService } from '../ai/ai.service.js';

const caseSchema = z.object({
  botId: z.string(),
  input: z.string().min(1).max(2000),
  mustContain: z.string().max(500).optional(),
  mustNotContain: z.string().max(500).optional(),
});

/** تست کیفیت ربات: چند پرسش با انتظار (شامل/نباید شامل) و اجرای دسته‌ای */
export async function evalsRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };
  const ai = new AiService(app);

  async function ownBot(botId: string, userId: string) {
    const bot = await app.prisma.bot.findUnique({ where: { id: botId } });
    if (!bot || bot.userId !== userId) throw Object.assign(new Error('ربات یافت نشد'), { statusCode: 404 });
    return bot;
  }

  app.get('/:botId', auth, async (request) => {
    const { botId } = request.params as { botId: string };
    await ownBot(botId, request.user.sub);
    return { items: await app.prisma.evalCase.findMany({ where: { botId }, orderBy: { createdAt: 'asc' } }) };
  });

  app.post('/', auth, async (request) => {
    const input = caseSchema.parse(request.body);
    await ownBot(input.botId, request.user.sub);
    return app.prisma.evalCase.create({ data: { ...input, userId: request.user.sub } });
  });

  app.delete('/case/:id', auth, async (request) => {
    const { id } = request.params as { id: string };
    const c = await app.prisma.evalCase.findUnique({ where: { id } });
    if (!c || c.userId !== request.user.sub) throw Object.assign(new Error('یافت نشد'), { statusCode: 404 });
    await app.prisma.evalCase.delete({ where: { id } });
    return { ok: true };
  });

  app.post('/:botId/run', auth, async (request) => {
    const { botId } = request.params as { botId: string };
    await ownBot(botId, request.user.sub);
    const cases = await app.prisma.evalCase.findMany({ where: { botId }, take: 25 });
    const results = [];
    for (const c of cases) {
      const sessionId = `eval-${c.id}-${Date.now()}`;
      let output = '';
      let error: string | undefined;
      try {
        const r: any = await ai.chat({ botId, sessionId, message: c.input, userId: request.user.sub });
        output = r.message || '';
      } catch (e: any) {
        error = e.message;
      }
      const lower = output.toLowerCase();
      const okContain = !c.mustContain || lower.includes(c.mustContain.toLowerCase());
      const okNot = !c.mustNotContain || !lower.includes(c.mustNotContain.toLowerCase());
      results.push({ id: c.id, input: c.input, output, error, passed: !error && okContain && okNot, okContain, okNot });
      await app.prisma.conversation.deleteMany({ where: { sessionId } }).catch(() => {});
    }
    const passed = results.filter((r) => r.passed).length;
    return { total: results.length, passed, results };
  });
}
