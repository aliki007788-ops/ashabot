/**
 * Channels Routes
 * @version 3.0.0 - with preHandler auth
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ChannelConnectionService } from './channel-connection.service.js';
import { ChannelRouterService } from './channel-router.service.js';
import {
  createConnectionSchema,
  updateConnectionSchema,
  sendChannelMessageSchema,
  listConnectionsQuerySchema,
  botIdParamSchema,
  connectionIdParamSchema,
  broadcastSchema,
} from './channels.schema.js';
import {
  getAdaptersInfo,
  getSupportedChannels,
  isSupportedChannel,
} from './adapters/index.js';

export async function channelsRoutes(app: FastifyInstance) {
  const connectionService = new ChannelConnectionService(app.prisma);
  const routerService = new ChannelRouterService(app.prisma);

  const auth = { preHandler: [app.authenticate] };

  // ==================== PUBLIC ====================

  app.get('/types', async () => {
    return {
      channels: getAdaptersInfo(),
      supported: getSupportedChannels(),
    };
  });

  // ==================== PROTECTED ====================

  app.post('/connections', auth, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (req.user as any)?.sub;
      if (!userId) return reply.code(401).send({ error: 'احراز هویت لازم است' });

      const input = createConnectionSchema.parse(req.body);

      if (!isSupportedChannel(input.channelType)) {
        return reply.code(400).send({ error: `نوع کانال "${input.channelType}" پشتیبانی نمی‌شود` });
      }

      const bot = await app.prisma.bot.findFirst({
        where: { id: input.botId },
      });

      if (!bot) return reply.code(404).send({ error: 'ربات یافت نشد یا دسترسی ندارید' });

      const connection = await connectionService.create(input);
      return reply.code(201).send({ success: true, connection, message: 'اتصال با موفقیت ایجاد شد' });
    } catch (error) {
      app.log.error(error);
      if (error instanceof Error) return reply.code(400).send({ error: error.message });
      return reply.code(500).send({ error: 'خطای سرور' });
    }
  });

  app.get('/connections', auth, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (req.user as any)?.sub;
      if (!userId) return reply.code(401).send({ error: 'احراز هویت لازم است' });

      const query = listConnectionsQuerySchema.parse(req.query);

      if (query.botId) {
        const bot = await app.prisma.bot.findFirst({
          where: { id: query.botId },
        });
        if (!bot) return reply.code(404).send({ error: 'ربات یافت نشد' });

        const connections = await connectionService.listByBot(query.botId);
        return { connections, total: connections.length };
      }

      const bots = await app.prisma.bot.findMany({
        where: {},
        select: { id: true },
      });
      const botIds = bots.map((b) => b.id);

      const connections = await app.prisma.channelConnection.findMany({
        where: {
          botId: { in: botIds },
          ...(query.isActive !== undefined && { isActive: query.isActive }),
        },
        include: {
          channel: true,
          bot: { select: { id: true, name: true, slug: true, icon: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      });

      return { connections, total: connections.length, page: query.page, limit: query.limit };
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({ error: 'خطای سرور' });
    }
  });

  app.get('/connections/:connectionId', auth, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (req.user as any)?.sub;
      if (!userId) return reply.code(401).send({ error: 'احراز هویت لازم است' });

      const { connectionId } = connectionIdParamSchema.parse(req.params);

      const connection = await app.prisma.channelConnection.findFirst({
        where: { id: connectionId },
        include: {
          channel: true,
          bot: { select: { id: true, name: true, slug: true, icon: true } },
        },
      });

      if (!connection) return reply.code(404).send({ error: 'اتصال یافت نشد' });
      return { connection };
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({ error: 'خطای سرور' });
    }
  });

  app.patch('/connections/:connectionId', auth, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (req.user as any)?.sub;
      if (!userId) return reply.code(401).send({ error: 'احراز هویت لازم است' });

      const { connectionId } = connectionIdParamSchema.parse(req.params);

      const existing = await app.prisma.channelConnection.findFirst({
        where: { id: connectionId },
      });
      if (!existing) return reply.code(404).send({ error: 'اتصال یافت نشد' });

      const input = updateConnectionSchema.parse(req.body);
      const connection = await connectionService.update(connectionId, input);
      return { success: true, connection, message: 'اتصال بروزرسانی شد' };
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({ error: 'خطای سرور' });
    }
  });

  app.post('/connections/:connectionId/toggle', auth, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (req.user as any)?.sub;
      if (!userId) return reply.code(401).send({ error: 'احراز هویت لازم است' });

      const { connectionId } = connectionIdParamSchema.parse(req.params);
      const { isActive } = req.body as { isActive: boolean };

      const existing = await app.prisma.channelConnection.findFirst({
        where: { id: connectionId },
      });
      if (!existing) return reply.code(404).send({ error: 'اتصال یافت نشد' });

      const connection = await connectionService.toggleActive(connectionId, isActive);
      return { success: true, connection, message: isActive ? 'اتصال فعال شد' : 'اتصال غیرفعال شد' };
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({ error: 'خطای سرور' });
    }
  });

  app.post('/connections/:connectionId/test', auth, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (req.user as any)?.sub;
      if (!userId) return reply.code(401).send({ error: 'احراز هویت لازم است' });

      const { connectionId } = connectionIdParamSchema.parse(req.params);

      const existing = await app.prisma.channelConnection.findFirst({
        where: { id: connectionId },
      });
      if (!existing) return reply.code(404).send({ error: 'اتصال یافت نشد' });

      const result = await connectionService.testConnection(connectionId);
      return result;
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({ error: 'خطای سرور' });
    }
  });

  app.delete('/connections/:connectionId', auth, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (req.user as any)?.sub;
      if (!userId) return reply.code(401).send({ error: 'احراز هویت لازم است' });

      const { connectionId } = connectionIdParamSchema.parse(req.params);

      const existing = await app.prisma.channelConnection.findFirst({
        where: { id: connectionId },
      });
      if (!existing) return reply.code(404).send({ error: 'اتصال یافت نشد' });

      await connectionService.delete(connectionId);
      return { success: true, message: 'اتصال حذف شد' };
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({ error: 'خطای سرور' });
    }
  });

  app.post('/send', auth, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (req.user as any)?.sub;
      if (!userId) return reply.code(401).send({ error: 'احراز هویت لازم است' });

      const input = sendChannelMessageSchema.parse(req.body);

      const existing = await app.prisma.channelConnection.findFirst({
        where: { id: input.connectionId },
      });
      if (!existing) return reply.code(404).send({ error: 'اتصال یافت نشد' });

      const connectionData = await connectionService.getWithAdapter(input.connectionId);
      if (!connectionData) return reply.code(404).send({ error: 'اتصال یافت نشد' });

      const result = await connectionData.adapter.sendMessage({
        chatId: input.chatId,
        text: input.text,
        parseMode: input.parseMode,
        replyToMessageId: input.replyToMessageId,
        buttons: input.buttons,
      });

      return result;
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({ error: 'خطای سرور' });
    }
  });

  app.post('/broadcast', auth, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (req.user as any)?.sub;
      if (!userId) return reply.code(401).send({ error: 'احراز هویت لازم است' });

      const input = broadcastSchema.parse(req.body);

      const bot = await app.prisma.bot.findFirst({
        where: { id: input.botId },
      });
      if (!bot) return reply.code(404).send({ error: 'ربات یافت نشد' });

      const result = await routerService.broadcastToBot(input.botId, input.text);
      return { success: true, ...result, message: `${result.sent} ارسال، ${result.failed} ناموفق` };
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({ error: 'خطای سرور' });
    }
  });

  app.get('/stats', auth, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (req.user as any)?.sub;
      if (!userId) return reply.code(401).send({ error: 'احراز هویت لازم است' });

      const bots = await app.prisma.bot.findMany({
        where: {},
        select: { id: true },
      });
      const botIds = bots.map((b) => b.id);

      const [totalConnections, activeConnections] = await Promise.all([
        app.prisma.channelConnection.count({ where: { botId: { in: botIds } } }),
        app.prisma.channelConnection.count({ where: { botId: { in: botIds }, isActive: true } }),
      ]);

      return {
        totalConnections,
        activeConnections,
        inactiveConnections: totalConnections - activeConnections,
      };
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({ error: 'خطای سرور' });
    }
  });

  app.get('/bot/:botId', auth, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (req.user as any)?.sub;
      if (!userId) return reply.code(401).send({ error: 'احراز هویت لازم است' });

      const { botId } = botIdParamSchema.parse(req.params);

      const bot = await app.prisma.bot.findFirst({
        where: { id: botId },
      });
      if (!bot) return reply.code(404).send({ error: 'ربات یافت نشد' });

      const connections = await connectionService.listByBot(botId);
      return { connections, total: connections.length };
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({ error: 'خطای سرور' });
    }
  });
}

export default channelsRoutes;