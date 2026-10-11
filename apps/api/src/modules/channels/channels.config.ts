import type { FastifyInstance } from 'fastify';
import { createAdapter, getAdapterInfo, isSupportedChannel } from './adapters/index.js';

export async function channelsConfigRoutes(app: FastifyInstance) {
  const prisma = app.prisma;

  // ============ دریافت پیکربندی یک کانال ============
  app.get('/:slug/config', { preHandler: [app.authenticate] }, async (request) => {
    const { slug } = request.params as { slug: string };

    const channel = await prisma.channel.findUnique({ where: { slug } });
    if (!channel) throw new Error('Channel not found');

    if (!isSupportedChannel(channel.slug)) {
      throw new Error(`Channel ${channel.slug} not supported by adapters`);
    }

    const info = getAdapterInfo(channel.slug as any);

    // خواندن credentials ذخیره شده (بدون نمایش مقادیر حساس)
    const storedCredentials = channel.credentials
      ? JSON.parse(channel.credentials)
      : {};

    // فقط وجود یا عدم وجود هر فیلد رو نشون بده
    const fieldsStatus: Record<string, boolean> = {};
    if (info) {
      for (const field of info.fields) {
        fieldsStatus[field.key] = !!storedCredentials[field.key];
      }
    }

    return {
      id: channel.id,
      name: channel.name,
      slug: channel.slug,
      type: channel.type,
      icon: channel.icon,
      isActive: channel.isActive,
      isConnected: channel.isConnected,
      webhookSecret: channel.webhookSecret ? '***' : null,
      fieldsStatus,
      info,
    };
  });

  // ============ ذخیره پیکربندی (credentials) ============
  app.post(
    '/:slug/config',
    { preHandler: [app.authenticate] },
    async (request) => {
      const { slug } = request.params as { slug: string };
      const body = request.body as {
        credentials: Record<string, string>;
        config?: Record<string, any>;
      };

      const user = request.user as any;
      if (user.role !== 'ADMIN') {
        throw new Error('Only admins can configure channels');
      }

      const channel = await prisma.channel.findUnique({ where: { slug } });
      if (!channel) throw new Error('Channel not found');

      // ذخیره credentials
      const updated = await prisma.channel.update({
        where: { slug },
        data: {
          credentials: JSON.stringify(body.credentials),
          config: body.config ? JSON.stringify(body.config) : channel.config,
        },
      });

      // لاگ
      await prisma.activityLog.create({
        data: {
          type: 'CHANNEL_CONFIG',
          message: `پیکربندی کانال ${updated.name} به‌روز شد`,
          userId: user.sub,
          metadata: JSON.stringify({ channelSlug: slug }),
        },
      });

      return {
        success: true,
        message: 'پیکربندی ذخیره شد',
        id: updated.id,
      };
    },
  );

  // ============ تست اتصال ============
  app.post(
    '/:slug/test',
    { preHandler: [app.authenticate] },
    async (request) => {
      const { slug } = request.params as { slug: string };

      const user = request.user as any;
      if (user.role !== 'ADMIN') {
        throw new Error('Only admins can test channels');
      }

      const channel = await prisma.channel.findUnique({ where: { slug } });
      if (!channel) throw new Error('Channel not found');

      if (!channel.credentials) {
        return {
          success: false,
          error: 'اطلاعات اتصال ذخیره نشده — ابتدا Bot Token را وارد کنید',
        };
      }

      if (!isSupportedChannel(channel.slug)) {
        return {
          success: false,
          error: `کانال ${slug} پشتیبانی نمی‌شود`,
        };
      }

      try {
        const credentials = JSON.parse(channel.credentials);
        const config = channel.config ? JSON.parse(channel.config) : {};

        const adapter = createAdapter(channel.slug as any, {
          connectionId: channel.id,
          credentials,
          config,
          webhookBaseUrl: process.env.API_BASE_URL || 'http://localhost:4000',
        });

        const connected = await adapter.testConnection();

        if (connected) {
          await prisma.channel.update({
            where: { slug },
            data: { isConnected: true },
          });

          return {
            success: true,
            message: 'اتصال موفق! ✅',
          };
        } else {
          return {
            success: false,
            error: 'اتصال ناموفق — لطفاً توکن را بررسی کنید',
          };
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'خطای ناشناخته';
        return { success: false, error: msg };
      }
    },
  );

  // ============ ثبت Webhook ============
  app.post(
    '/:slug/setup-webhook',
    { preHandler: [app.authenticate] },
    async (request) => {
      const { slug } = request.params as { slug: string };

      const user = request.user as any;
      if (user.role !== 'ADMIN') throw new Error('Only admins');

      const channel = await prisma.channel.findUnique({ where: { slug } });
      if (!channel) throw new Error('Channel not found');
      if (!channel.credentials) throw new Error('ابتدا پیکربندی کنید');

      if (!isSupportedChannel(channel.slug)) {
        throw new Error(`Channel ${slug} not supported`);
      }

      const credentials = JSON.parse(channel.credentials);
      const config = channel.config ? JSON.parse(channel.config) : {};

      const adapter = createAdapter(channel.slug as any, {
        connectionId: channel.id,
        credentials,
        config,
        webhookBaseUrl: process.env.API_BASE_URL || 'http://localhost:4000',
      });

      const result = await adapter.setupWebhook();

      if (result.success) {
        await prisma.channel.update({
          where: { slug },
          data: {
            webhookSecret: result.webhookUrl || null,
          },
        });
      }

      return result;
    },
  );

  // ============ حذف Webhook ============
  app.post(
    '/:slug/remove-webhook',
    { preHandler: [app.authenticate] },
    async (request) => {
      const { slug } = request.params as { slug: string };

      const user = request.user as any;
      if (user.role !== 'ADMIN') throw new Error('Only admins');

      const channel = await prisma.channel.findUnique({ where: { slug } });
      if (!channel) throw new Error('Channel not found');
      if (!channel.credentials) throw new Error('ابتدا پیکربندی کنید');

      if (!isSupportedChannel(channel.slug)) {
        throw new Error(`Channel ${slug} not supported`);
      }

      const credentials = JSON.parse(channel.credentials);
      const config = channel.config ? JSON.parse(channel.config) : {};

      const adapter = createAdapter(channel.slug as any, {
        connectionId: channel.id,
        credentials,
        config,
      });

      const success = await adapter.removeWebhook();

      if (success) {
        await prisma.channel.update({
          where: { slug },
          data: { webhookSecret: null },
        });
      }

      return { success, message: success ? 'Webhook حذف شد' : 'خطا در حذف webhook' };
    },
  );

  // ============ پاک کردن credentials ============
  app.delete(
    '/:slug/config',
    { preHandler: [app.authenticate] },
    async (request) => {
      const { slug } = request.params as { slug: string };

      const user = request.user as any;
      if (user.role !== 'ADMIN') throw new Error('Only admins');

      const channel = await prisma.channel.findUnique({ where: { slug } });
      if (!channel) throw new Error('Channel not found');

      await prisma.channel.update({
        where: { slug },
        data: {
          credentials: null,
          config: null,
          isConnected: false,
          webhookSecret: null,
        },
      });

      return { success: true, message: 'پیکربندی پاک شد' };
    },
  );
}