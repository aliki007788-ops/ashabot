import type { FastifyInstance } from 'fastify';

const IRANIAN_TYPES = ['EITAA', 'BALE', 'RUBIKA', 'SOROUSH', 'GAP'];
const FOREIGN_TYPES = [
  'TELEGRAM', 'INSTAGRAM', 'WHATSAPP', 'EMAIL', 'SMS',
  'TWITTER', 'LINKEDIN', 'YOUTUBE', 'FACEBOOK', 'WEB_CHAT',
];

export async function channelsListRoutes(app: FastifyInstance) {
  const prisma = app.prisma;

  // ============ لیست همه کانال‌ها ============
  app.get('/list', async () => {
    const channels = await prisma.channel.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            botChannels: true,
            connections: true,
            conversations: true,
          },
        },
      },
    });

    return {
      items: channels.map((c) => {
        const isIranian = IRANIAN_TYPES.includes(c.type);
        const isForeign = FOREIGN_TYPES.includes(c.type);
        return {
          id: c.id,
          name: c.name,
          slug: c.slug,
          type: c.type,
          icon: c.icon,
          isActive: c.isActive,
          isConnected: c.isConnected,
          category: isIranian ? 'IRANIAN' : isForeign ? 'FOREIGN' : 'OTHER',
          botCount: c._count.botChannels,
          connectionCount: c._count.connections,
          conversationCount: c._count.conversations,
          updatedAt: c.updatedAt,
        };
      }),
    };
  });

  // ============ آمار کل ============
  app.get('/summary', async () => {
    const [
      total, active, inactive, connected,
      iranian, foreign, totalBotChannels,
    ] = await Promise.all([
      prisma.channel.count(),
      prisma.channel.count({ where: { isActive: true } }),
      prisma.channel.count({ where: { isActive: false } }),
      prisma.channel.count({ where: { isConnected: true } }),
      prisma.channel.count({ where: { type: { in: IRANIAN_TYPES } } }),
      prisma.channel.count({ where: { type: { in: FOREIGN_TYPES } } }),
      prisma.botChannel.count(),
    ]);

    return {
      total, active, inactive, connected,
      disconnected: total - connected,
      iranian, foreign,
      totalBotChannels,
    };
  });

  // ============ فعال/غیرفعال کردن کانال (admin) ============
  app.post(
    '/:id/toggle-active',
    { preHandler: [app.authenticate] },
    async (request) => {
      const { id } = request.params as { id: string };

      const user = request.user as any;
      if (user.role !== 'ADMIN') {
        throw new Error('Only admins can toggle channels');
      }

      const channel = await prisma.channel.findUnique({ where: { id } });
      if (!channel) throw new Error('Channel not found');

      const updated = await prisma.channel.update({
        where: { id },
        data: { isActive: !channel.isActive },
      });

      // لاگ فعالیت
      await prisma.activityLog.create({
        data: {
          type: 'CHANNEL_TOGGLE',
          message: `کانال ${updated.name} ${updated.isActive ? 'فعال' : 'غیرفعال'} شد`,
          userId: user.sub,
          metadata: JSON.stringify({
            channelId: updated.id,
            channelName: updated.name,
            isActive: updated.isActive,
          }),
        },
      });

      return {
        id: updated.id,
        name: updated.name,
        isActive: updated.isActive,
        message: updated.isActive ? 'کانال فعال شد' : 'کانال غیرفعال شد',
      };
    },
  );

  // ============ تغییر وضعیت اتصال (admin) ============
  app.post(
    '/:id/toggle-connection',
    { preHandler: [app.authenticate] },
    async (request) => {
      const { id } = request.params as { id: string };

      const user = request.user as any;
      if (user.role !== 'ADMIN') {
        throw new Error('Only admins can toggle connections');
      }

      const channel = await prisma.channel.findUnique({ where: { id } });
      if (!channel) throw new Error('Channel not found');

      if (!channel.isActive) {
        throw new Error('Cannot connect an inactive channel');
      }

      const updated = await prisma.channel.update({
        where: { id },
        data: { isConnected: !channel.isConnected },
      });

      await prisma.activityLog.create({
        data: {
          type: 'CHANNEL_CONNECTION',
          message: `اتصال کانال ${updated.name} ${updated.isConnected ? 'برقرار' : 'قطع'} شد`,
          userId: user.sub,
          metadata: JSON.stringify({
            channelId: updated.id,
            isConnected: updated.isConnected,
          }),
        },
      });

      return {
        id: updated.id,
        name: updated.name,
        isConnected: updated.isConnected,
        message: updated.isConnected ? 'کانال متصل شد' : 'اتصال قطع شد',
      };
    },
  );

  // ============ فعال/غیرفعال کردن اتصال ربات-کانال ============
  app.post(
    '/:channelId/bots/:botId/toggle',
    { preHandler: [app.authenticate] },
    async (request) => {
      const { channelId, botId } = request.params as {
        channelId: string;
        botId: string;
      };

      const user = request.user as any;
      if (user.role !== 'ADMIN') {
        throw new Error('Only admins can toggle bot-channel');
      }

      const channel = await prisma.channel.findUnique({ where: { id: channelId } });
      if (!channel) throw new Error('Channel not found');
      if (!channel.isActive) throw new Error('Channel is inactive');

      const existing = await prisma.botChannel.findUnique({
        where: { botId_channelId: { botId, channelId } },
      });

      if (existing) {
        const updated = await prisma.botChannel.update({
          where: { botId_channelId: { botId, channelId } },
          data: { isActive: !existing.isActive },
        });
        return { isActive: updated.isActive };
      } else {
        const created = await prisma.botChannel.create({
          data: { botId, channelId, isActive: true },
        });
        return { isActive: created.isActive };
      }
    },
  );
}