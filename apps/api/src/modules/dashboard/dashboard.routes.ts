import type { FastifyInstance } from 'fastify';

export async function dashboardRoutes(app: FastifyInstance) {
  const prisma = app.prisma;

  app.get('/stats', { preHandler: [app.authenticate] }, async (request) => {
    // مدیر آمار کل پلتفرم را می‌بیند؛ کاربر عادی فقط آمار خودش را
    const isAdmin = request.user.role === 'ADMIN';
    const me = request.user.sub;
    const cw = isAdmin ? {} : { OR: [{ userId: me }, { bot: { userId: me } }] };
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      clusters,
      brains,
      bots,
      premiumBots,
      regularBots,
      botBrains,
      conversations,
      conversationsToday,
      messages,
      messagesToday,
      users,
      organizations,
      plans,
      subscriptions,
      apiKeys,
      channelsTotal,
      channelsActive,
      channelsConnected,
      channelsIranian,
      recentActivities,
      clustersWithBots,
      allChannels,
    ] = await Promise.all([
      prisma.cluster.count(),
      prisma.brain.count(),
      prisma.bot.count(),
      prisma.bot.count({ where: { isPremium: true } }),
      prisma.bot.count({ where: { isPremium: false } }),
      prisma.botBrain.count(),
      prisma.conversation.count({ where: cw }),
      prisma.conversation.count({ where: { ...cw, createdAt: { gte: today } } }),
      prisma.message.count({ where: { conversation: cw } }),
      prisma.message.count({ where: { conversation: cw, createdAt: { gte: today } } }),
      isAdmin ? prisma.user.count() : Promise.resolve(1),
      isAdmin ? prisma.organization.count() : Promise.resolve(0),
      isAdmin ? prisma.plan.count() : Promise.resolve(0),
      isAdmin ? prisma.subscription.count() : Promise.resolve(0),
      isAdmin ? prisma.apiKey.count() : Promise.resolve(0),
      // Channels stats
      prisma.channel.count(),
      prisma.channel.count({ where: { isActive: true } }),
      prisma.channel.count({ where: { isConnected: true } }),
      prisma.channel.count({
        where: { type: { in: ['EITAA', 'BALE', 'RUBIKA', 'SOROUSH', 'GAP'] } },
      }),
      prisma.activityLog.findMany({
        where: isAdmin ? {} : { userId: me },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          bot: { select: { id: true, name: true, icon: true } },
          user: { select: { id: true, name: true } },
        },
      }),
      prisma.cluster.findMany({
        orderBy: { sortOrder: 'asc' },
        include: {
          _count: { select: { bots: true } },
          bots: {
            select: { id: true, isActive: true, isPremium: true },
          },
        },
      }),
      prisma.channel.findMany({
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          icon: true,
          isActive: true,
          isConnected: true,
        },
      }),
    ]);

    const clusterStats = clustersWithBots.map((c) => {
      const activeBots = c.bots.filter((b) => b.isActive).length;
      const premiumInCluster = c.bots.filter((b) => b.isPremium).length;
      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        icon: c.icon,
        color: c.color,
        sortOrder: c.sortOrder,
        totalBots: c._count.bots,
        activeBots,
        premiumBots: premiumInCluster,
      };
    });

    return {
      totals: {
        clusters,
        brains,
        bots,
        premiumBots,
        regularBots,
        botBrains,
        conversations,
        conversationsToday,
        messages,
        messagesToday,
        users,
        organizations,
        plans,
        subscriptions,
        apiKeys,
        channelsTotal,
        channelsActive,
        channelsConnected,
        channelsIranian,
      },
      clusters: clusterStats,
      channels: allChannels.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        type: c.type,
        icon: c.icon,
        isActive: c.isActive,
        isConnected: c.isConnected,
      })),
      recentActivities: recentActivities.map((a) => ({
        id: a.id,
        type: a.type,
        message: a.message,
        createdAt: a.createdAt,
        bot: a.bot ? { id: a.bot.id, name: a.bot.name, icon: a.bot.icon } : null,
        user: a.user ? { id: a.user.id, name: a.user.name } : null,
      })),
    };
  });
}