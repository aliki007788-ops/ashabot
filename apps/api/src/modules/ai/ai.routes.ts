import type { FastifyInstance } from 'fastify';
import { AiService } from './ai.service.js';
import { ConversationService } from './conversation.service.js';
import { chatSchema, listConversationsSchema } from './ai.schema.js';
import { z } from 'zod';

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
      app.log.error('[WebChat] خطا:', err);

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

  app.post('/chat', { preHandler: [app.authenticate] }, async (request) => {
    const input = chatSchema.parse(request.body);
    return service.chat({
      ...input,
      userId: request.user.sub,
    });
  });

  app.post('/chat/stream', { preHandler: [app.authenticate] }, async (request, reply) => {
    const input = chatSchema.parse(request.body);

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');

    try {
      for await (const chunk of service.chatStream({
        ...input,
        userId: request.user.sub,
      })) {
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
    const items = await conversations.listByBot(botId, limit);
    return { items };
  });

  app.get('/conversations/:id', { preHandler: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const conversation = await conversations.getDetail(id);
    if (!conversation) {
      throw Object.assign(new Error('Conversation not found'), { statusCode: 404 });
    }
    return conversation;
  });
}