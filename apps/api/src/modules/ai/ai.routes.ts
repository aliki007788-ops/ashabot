import type { FastifyInstance } from 'fastify';
import { AiService } from './ai.service.js';
import { ConversationService } from './conversation.service.js';
import { chatSchema, listConversationsSchema } from './ai.schema.js';
import { z } from 'zod';
import { canUse, deny } from '../../lib/access.js';

// Schema برای WebChat (بدون userId)
const webchatSchema = z.object({
  botId: z.string().min(1),
  sessionId: z.string().min(1),
  message: z.string().min(1).max(4096),
});

export async function aiRoutes(app: FastifyInstance) {
  const service = new AiService(app);
  const conversations = new ConversationService(app);

  // ==================== PUBLIC ENDPOINT (WebChat) ====================
  // بدون احراز هویت - برای ویجت چت شناور روی سایت‌های مشتری

  app.post('/webchat', async (request, reply) => {
    try {
      const input = webchatSchema.parse(request.body);

      app.log.info(`[WebChat] پیام از botId=${input.botId}, sessionId=${input.sessionId}`);

      // بررسی وجود ربات
      const bot = await app.prisma.bot.findUnique({
        where: { id: input.botId },
      });

      if (!bot) {
        app.log.warn(`[WebChat] ربات یافت نشد: ${input.botId}`);
        return reply.code(404).send({ error: 'ربات یافت نشد' });
      }

      if (!bot.isActive) {
        return reply.code(403).send({ error: 'ربات غیرفعال است' });
      }

      // ارسال به AI
      const response = await service.chat({
        botId: input.botId,
        sessionId: input.sessionId,
        message: input.message,
        userId: null, // بدون کاربر لاگین
        source: 'webchat',
      });

      return response;
    } catch (err: any) {
      app.log.error({ err }, '[WebChat] خطا:');

      if (err.name === 'ZodError') {
        return reply.code(400).send({
          error: 'داده‌های ورودی نامعتبر',
          issues: err.issues,
        });
      }

      return reply.code(500).send({
        error: err.message || 'خطای سرور',
      });
    }
  });

  // ==================== PROTECTED ENDPOINTS ====================

  async function guard(request: any, botId: string): Promise<void> {
    const bot = await app.prisma.bot.findUnique({ where: { id: botId }, select: { slug: true } });
    if (!bot) return;
    const access = await canUse(app.prisma, request.user, { botSlug: bot.slug });
    if (!access.ok) throw deny(access.reason ?? 'دسترسی ندارید');
  }

  app.post('/chat', { preHandler: [app.authenticate] }, async (request) => {
    const input = chatSchema.parse(request.body);
    await guard(request, input.botId);
    return service.chat({
      ...input,
      userId: request.user.sub,
    } as any);
  });

  app.post('/chat/stream', { preHandler: [app.authenticate] }, async (request, reply) => {
    const input = chatSchema.parse(request.body);
    await guard(request, input.botId);

    const origin = request.headers.origin;
    if (origin) {
      reply.raw.setHeader('Access-Control-Allow-Origin', origin);
      reply.raw.setHeader('Access-Control-Allow-Credentials', 'true');
      reply.raw.setHeader('Vary', 'Origin');
    }
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');

    try {
      for await (const chunk of service.chatStream({
        ...input,
        userId: request.user.sub,
      } as any)) {
        reply.raw.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      reply.raw.write('data: [DONE]\n\n');
    } catch (err: any) {
      reply.raw.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    } finally {
      reply.raw.end();
    }
  });

  app.get('/conversations', { preHandler: [app.authenticate] }, async (request) => {
    const { botId, limit } = listConversationsSchema.parse(request.query);
    // فقط مالک ربات (یا مدیر) همه‌ی گفتگوها را می‌بیند؛ بقیه فقط گفتگوهای خودشان
    const bot = await app.prisma.bot.findUnique({ where: { id: botId }, select: { userId: true } });
    const full = request.user.role === 'ADMIN' || (!!bot?.userId && bot.userId === request.user.sub);
    const items = await app.prisma.conversation.findMany({
      where: { botId, ...(full ? {} : { userId: request.user.sub }) },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: { _count: { select: { messages: true } } },
    });
    return { items };
  });

  app.get('/conversations/:id', { preHandler: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const conversation = await conversations.getDetail(id);
    if (!conversation) {
      throw Object.assign(new Error('Conversation not found'), { statusCode: 404 });
    }
    if (request.user.role !== 'ADMIN' && conversation.userId !== request.user.sub) {
      const owner = await app.prisma.bot.findUnique({ where: { id: conversation.botId }, select: { userId: true } });
      if (!owner?.userId || owner.userId !== request.user.sub) throw Object.assign(new Error('Conversation not found'), { statusCode: 404 });
    }
    return conversation;
  });
}