import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ConversationService } from '../ai/conversation.service.js';

/** صندوق گفتگوی زنده: تحویل از ربات به اپراتور و برگشت */
export async function inboxRoutes(app: FastifyInstance) {
  const convs = new ConversationService(app);
  const auth = { preHandler: [app.authenticate] };

  // فقط گفتگوهای رباتِ خودِ کاربر (یا ربات‌های بدون مالک/قالب برای ادمین‌ها)
  async function ownedConversation(id: string, userId: string) {
    const c = await app.prisma.conversation.findUnique({
      where: { id },
      include: { bot: { select: { id: true, name: true, icon: true, userId: true } } },
    });
    if (!c || (c.bot.userId && c.bot.userId !== userId)) {
      throw Object.assign(new Error('گفتگو یافت نشد'), { statusCode: 404 });
    }
    return c;
  }

  app.get('/', auth, async (request) => {
    const { status } = z.object({ status: z.string().optional() }).parse(request.query);
    const userId = request.user.sub;
    const items = await app.prisma.conversation.findMany({
      where: {
        bot: { OR: [{ userId }, { userId: null }] },
        ...(status === 'HUMAN' ? { status: 'HUMAN' } : status === 'CLOSED' ? { status: 'CLOSED' } : status === 'BOT' ? { status: 'BOT' } : {}),
      },
      orderBy: [{ needsHuman: 'desc' }, { updatedAt: 'desc' }],
      take: 100,
      include: {
        bot: { select: { id: true, name: true, icon: true } },
        _count: { select: { messages: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { content: true, role: true, createdAt: true } },
      },
    });
    const waiting = await app.prisma.conversation.count({
      where: { needsHuman: true, bot: { OR: [{ userId }, { userId: null }] } },
    });
    return { items, waiting };
  });

  app.get('/:id', auth, async (request) => {
    const { id } = request.params as { id: string };
    await ownedConversation(id, request.user.sub);
    return convs.getDetail(id);
  });

  // اپراتور پیام می‌دهد (و گفتگو در حالت HUMAN می‌ماند)
  app.post('/:id/reply', auth, async (request) => {
    const { id } = request.params as { id: string };
    const { message } = z.object({ message: z.string().min(1).max(4000) }).parse(request.body);
    const c = await ownedConversation(id, request.user.sub);
    await app.prisma.conversation.update({
      where: { id },
      data: { status: 'HUMAN', needsHuman: false, assignedToId: request.user.sub },
    });
    const msg = await convs.addMessage(id, 'HUMAN', message, { model: 'human', provider: 'human' });
    app.io?.emit('message:new', {
      conversationId: id, botId: c.botId, role: 'assistant', content: message, createdAt: new Date().toISOString(),
    });
    return msg;
  });

  // برگرداندن گفتگو به ربات
  app.post('/:id/resume-bot', auth, async (request) => {
    const { id } = request.params as { id: string };
    await ownedConversation(id, request.user.sub);
    return app.prisma.conversation.update({
      where: { id },
      data: { status: 'BOT', needsHuman: false, handoffReason: null, assignedToId: null },
    });
  });

  app.post('/:id/close', auth, async (request) => {
    const { id } = request.params as { id: string };
    await ownedConversation(id, request.user.sub);
    return app.prisma.conversation.update({
      where: { id },
      data: { status: 'CLOSED', needsHuman: false },
    });
  });

  // نظرسنجی پیام‌های جدید برای ویجت وب‌چت (بدون احراز هویت، با sessionId)
  app.get('/poll/:sessionId', async (request) => {
    const { sessionId } = request.params as { sessionId: string };
    const { after } = z.object({ after: z.string().optional() }).parse(request.query);
    const c = await app.prisma.conversation.findUnique({ where: { sessionId } });
    if (!c) return { items: [], status: 'BOT' };
    const items = await app.prisma.message.findMany({
      where: {
        conversationId: c.id,
        role: { in: ['HUMAN', 'ASSISTANT'] },
        ...(after ? { createdAt: { gt: new Date(after) } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
      select: { id: true, role: true, content: true, createdAt: true },
    });
    return { items, status: c.status };
  });
}
