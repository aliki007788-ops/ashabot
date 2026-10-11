import type { FastifyInstance } from 'fastify';

export async function botStatsRoutes(app: FastifyInstance) {
  const prisma = app.prisma;

  // ========== آمار زنده ربات ==========
  app.get('/:id/stats', async (request) => {
    const { id } = request.params as { id: string };

    const bot = await prisma.bot.findUnique({ where: { id } });
    if (!bot) throw new Error('Bot not found');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      messagesToday,
      conversationsTotal,
      conversationsToday,
      tokensToday,
      costToday,
      lastRun,
      recentMessages,
    ] = await Promise.all([
      prisma.message.count({
        where: {
          conversation: { botId: id },
          createdAt: { gte: today },
        },
      }),
      prisma.conversation.count({ where: { botId: id } }),
      prisma.conversation.count({
        where: { botId: id, createdAt: { gte: today } },
      }),
      prisma.message.aggregate({
        where: {
          conversation: { botId: id },
          createdAt: { gte: today },
        },
        _sum: { tokensIn: true, tokensOut: true },
      }),
      prisma.message.aggregate({
        where: {
          conversation: { botId: id },
          createdAt: { gte: today },
        },
        _sum: { costUsd: true },
      }),
      prisma.botRun.findFirst({
        where: { botId: id },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.message.findMany({
        where: { conversation: { botId: id } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          conversation: {
            select: { id: true, sessionId: true, title: true },
          },
        },
      }),
    ]);

    const tokensIn = tokensToday._sum.tokensIn || 0;
    const tokensOut = tokensToday._sum.tokensOut || 0;

    return {
      botId: id,
      messagesToday,
      conversationsTotal,
      conversationsToday,
      tokensToday: tokensIn + tokensOut,
      tokensIn,
      tokensOut,
      costToday: costToday._sum.costUsd || 0,
      runStatus: lastRun?.status || (bot.isActive ? 'IDLE' : 'DISABLED'),
      lastRunAt: lastRun?.createdAt || null,
      lastTask: lastRun?.taskType || null,
      recentMessages: recentMessages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content.slice(0, 100),
        createdAt: m.createdAt,
        conversationId: m.conversation.id,
      })),
    };
  });

  // ========== تاریخچه مکالمات ==========
  app.get('/:id/conversations', async (request) => {
    const { id } = request.params as { id: string };
    const query = request.query as { limit?: string };

    const conversations = await prisma.conversation.findMany({
      where: { botId: id },
      orderBy: { updatedAt: 'desc' },
      take: parseInt(query.limit || '20'),
      include: {
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, createdAt: true },
        },
      },
    });

    return {
      items: conversations.map((c) => ({
        id: c.id,
        sessionId: c.sessionId,
        title: c.title || 'بدون عنوان',
        messageCount: c._count.messages,
        lastMessage: c.messages[0]?.content.slice(0, 80) || '',
        lastMessageAt: c.messages[0]?.createdAt || c.createdAt,
        createdAt: c.createdAt,
      })),
    };
  });

  // ========== خروجی‌های ربات ==========
  app.get('/:id/outputs', async (request) => {
    const { id } = request.params as { id: string };
    const query = request.query as { limit?: string };

    const outputs = await prisma.clusterOutput.findMany({
      where: { botId: id },
      orderBy: { createdAt: 'desc' },
      take: parseInt(query.limit || '20'),
    });

    return { items: outputs };
  });
}