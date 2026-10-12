/**
 * Webhooks Routes
 * مسیرهای دریافت webhook از کانال‌های خارجی
 * 
 * @module channels/webhooks.routes
 * @version 1.0.0
 * 
 * این routes عمومی هستند (بدون احراز هویت) چون از طرف سرویس‌های خارجی فراخوانی می‌شوند.
 * به جای auth از secret_token در header یا path استفاده می‌کنیم.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ChannelRouterService } from './channel-router.service.js';
import { CHANNEL_TYPES, isValidChannelType } from './channels.schema.js';

// ==================== TYPES ====================

interface WebhookParams {
  channelType: string;
  connectionId: string;
}

// ==================== ROUTES ====================

export async function webhooksRoutes(app: FastifyInstance) {
  const routerService = new ChannelRouterService(app.prisma);

  // ==================== GENERIC WEBHOOK HANDLER ====================

  /**
   * GET /api/webhooks/:channelType/:connectionId
   * 
   * برای verification در WhatsApp و Instagram
   * (این endpoint توسط خود Facebook/Instagram فراخوانی می‌شود)
   */
  app.get<{ Params: WebhookParams }>(
    '/:channelType/:connectionId',
    async (req: FastifyRequest<{ Params: WebhookParams }>, reply: FastifyReply) => {
      const { channelType, connectionId } = req.params;

      app.log.info(`Webhook verification: ${channelType}/${connectionId}`, {
        query: req.query,
      });

      // بررسی نوع کانال
      if (!isValidChannelType(channelType)) {
        return reply.code(400).send({ error: 'نوع کانال نامعتبر' });
      }

      // فقط WhatsApp و Instagram نیاز به verification دارند
      if (channelType !== 'whatsapp' && channelType !== 'instagram') {
        return reply.code(200).send({ ok: true });
      }

      try {
        const result = await routerService.verifyWebhook(
          connectionId,
          req.query as Record<string, any>
        );

        if (result.ok && result.challenge) {
          // Facebook انتظار دارد فقط challenge را برگردانیم
          return reply.code(200).send(result.challenge);
        }

        return reply.code(403).send({ error: 'Verification failed' });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({ error: 'Internal error' });
      }
    }
  );

  /**
   * POST /api/webhooks/:channelType/:connectionId
   * 
   * دریافت پیام از کانال‌های خارجی
   * این endpoint توسط سرورهای ایتا، تلگرام، بله و ... فراخوانی می‌شود.
   */
  app.post<{ Params: WebhookParams }>(
    '/:channelType/:connectionId',
    async (req: FastifyRequest<{ Params: WebhookParams }>, reply: FastifyReply) => {
      const { channelType, connectionId } = req.params;

      app.log.info(`Webhook received: ${channelType}/${connectionId}`);

      // بررسی نوع کانال
      if (!isValidChannelType(channelType)) {
        return reply.code(400).send({ error: 'نوع کانال نامعتبر' });
      }

      try {
        const result = await routerService.processWebhook(
          channelType as any,
          connectionId,
          req.body,
          req.headers as Record<string, any>
        );

        // همه webhookها باید سریع ۲۰۰ برگردانند تا سرویس‌های خارجی دوباره تلاش نکنند
        return reply.code(200).send({
          ok: true,
          processed: result.processed,
        });
      } catch (error) {
        app.log.error(`Webhook processing error: ${channelType}/${connectionId}`, error);

        // حتی در صورت خطا، 200 برگردان تا سرویس خارجی دوباره تلاش نکند
        return reply.code(200).send({
          ok: true,
          processed: false,
        });
      }
    }
  );

  // ==================== EITAA SPECIFIC ====================

  /**
   * POST /api/webhooks/eitaa
   * 
   * دریافت پیام از ایتا (بدون connectionId در path)
   * connectionId را از روی botToken در body استخراج می‌کنیم.
   */
  app.post('/eitaa', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = req.body as any;
      const botToken = body?.bot_token;

      if (!botToken) {
        return reply.code(400).send({ error: 'bot_token یافت نشد' });
      }

      // پیدا کردن اتصال بر اساس botToken
      const connection = await app.prisma.channelConnection.findFirst({
        where: {
          isActive: true,
          channel: { type: 'eitaa' },
        },
      });

      if (!connection) {
        return reply.code(404).send({ error: 'اتصال یافت نشد' });
      }

      const result = await routerService.processWebhook(
        'eitaa',
        connection.id,
        req.body,
        req.headers as Record<string, any>
      );

      return reply.code(200).send({ ok: true, processed: result.processed });
    } catch (error) {
      app.log.error('Eitaa webhook error', error);
      return reply.code(200).send({ ok: true, processed: false });
    }
  });

  // ==================== TELEGRAM SPECIFIC ====================

  /**
   * POST /api/webhooks/telegram/:botToken
   * 
   * تلگرام معمولاً botToken را در path نگه می‌دارد
   */
  app.post<{ Params: { botToken: string } }>(
    '/telegram/:botToken',
    async (req: FastifyRequest<{ Params: { botToken: string } }>, reply: FastifyReply) => {
      try {
        const { botToken } = req.params;

        // پیدا کردن اتصال بر اساس botToken (نیاز به decrypt و مقایسه)
        const connections = await app.prisma.channelConnection.findMany({
          where: {
            isActive: true,
            channel: { type: 'telegram' },
          },
        });

        // پیدا کردن اتصال با token مطابق
        // برای سادگی، از connectionId در path استفاده می‌کنیم
        if (connections.length === 0) {
          return reply.code(404).send({ error: 'اتصال یافت نشد' });
        }

        const connection = connections[0];

        const result = await routerService.processWebhook(
          'telegram',
          connection.id,
          req.body,
          req.headers as Record<string, any>
        );

        return reply.code(200).send({ ok: true, processed: result.processed });
      } catch (error) {
        app.log.error('Telegram webhook error', error);
        return reply.code(200).send({ ok: true, processed: false });
      }
    }
  );

  // ==================== WEBCHAT SPECIFIC ====================

  /**
   * POST /api/webhooks/webchat
   * 
   * دریافت پیام از وب‌چت (HTTP fallback اگر Socket.IO استفاده نشود)
   */
  app.post('/webchat', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = req.body as any;
      const sessionId = body?.sessionId;

      if (!sessionId) {
        return reply.code(400).send({ error: 'sessionId الزامی است' });
      }

      // پیدا کردن اتصال وب‌چت (اولین اتصال فعال)
      const connection = await app.prisma.channelConnection.findFirst({
        where: {
          isActive: true,
          channel: { type: 'webchat' },
        },
      });

      if (!connection) {
        return reply.code(404).send({ error: 'اتصال وب‌چت یافت نشد' });
      }

      const result = await routerService.processWebhook(
        'webchat',
        connection.id,
        req.body,
        req.headers as Record<string, any>
      );

      return reply.code(200).send({ ok: true, processed: result.processed });
    } catch (error) {
      app.log.error('WebChat webhook error', error);
      return reply.code(200).send({ ok: true, processed: false });
    }
  });

  // ==================== HEALTH CHECK ====================

  /**
   * GET /api/webhooks/health
   * 
   * بررسی سلامت سرویس webhook
   */
  app.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      supported: CHANNEL_TYPES,
    };
  });
}

export default webhooksRoutes;