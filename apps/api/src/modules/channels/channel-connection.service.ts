/**
 * Channel Connection Service
 * سرویس مدیریت اتصال کانال‌ها به ربات‌ها
 * 
 * @module channels/channel-connection.service
 * @version 1.0.0
 */

import { PrismaClient } from '@prisma/client';
import {
  createAdapter,
  isSupportedChannel,
  ChannelType,
  BaseChannelAdapter,
} from './adapters/index.js';
import { encryptJSON, decryptJSON } from '../../lib/crypto.js';

// ==================== TYPES ====================

export interface CreateConnectionInput {
  channelType: ChannelType;
  botId: string;
  channelId?: string;
  channelName?: string;
  credentials: Record<string, string>;
  config?: Record<string, any>;
  webhookBaseUrl?: string;
}

export interface UpdateConnectionInput {
  credentials?: Record<string, string>;
  config?: Record<string, any>;
  isActive?: boolean;
}

export interface ConnectionWithAdapter {
  connection: any;
  adapter: BaseChannelAdapter;
}

// ==================== SERVICE ====================

export class ChannelConnectionService {
  constructor(private prisma: PrismaClient) {}

  // ==================== CREATE ====================

  /**
   * ایجاد اتصال جدید
   */
  async create(input: CreateConnectionInput) {
    if (!isSupportedChannel(input.channelType)) {
      throw new Error(`نوع کانال "${input.channelType}" پشتیبانی نمی‌شود`);
    }

    // بررسی وجود ربات
    const bot = await this.prisma.bot.findUnique({
      where: { id: input.botId },
    });

    if (!bot) {
      throw new Error('ربات یافت نشد');
    }

    // پیدا کردن یا ساختن کانال
    let channel = await this.prisma.channel.findFirst({
      where: { type: input.channelType },
    });

    if (!channel) {
      channel = await this.prisma.channel.create({
        data: {
          name: input.channelName || input.channelType,
          slug: input.channelType,
          type: input.channelType,
          icon: this._getChannelIcon(input.channelType),
        },
      });
    }

    // رمزنگاری credentials
    const encryptedCredentials = encryptJSON(input.credentials);

    // ساخت اتصال
    const connection = await this.prisma.channelConnection.create({
      data: {
        channelId: channel.id,
        botId: input.botId,
        accessToken: encryptedCredentials,
        isActive: false,
        metadata: input.config ? JSON.stringify(input.config) : null,
      },
    });

    // ساخت adapter
    const adapter = createAdapter(input.channelType, {
      connectionId: connection.id,
      credentials: input.credentials,
      config: input.config,
      webhookBaseUrl: input.webhookBaseUrl,
    });

    // تست اتصال
    const isConnected = await adapter.testConnection();

    if (!isConnected) {
      // حذف اتصال در صورت عدم موفقیت
      await this.prisma.channelConnection.delete({
        where: { id: connection.id },
      });
      throw new Error('تست اتصال ناموفق. لطفاً اعتبارنامه‌ها را بررسی کنید');
    }

    // تنظیم webhook
    const webhookResult = await adapter.setupWebhook();

    if (!webhookResult.success) {
      console.warn('⚠️ تنظیم webhook ناموفق بود:', webhookResult.error);
    }

    // فعال کردن اتصال
    const updatedConnection = await this.prisma.channelConnection.update({
      where: { id: connection.id },
      data: {
        isActive: true,
        webhookUrl: webhookResult.webhookUrl,
      },
      include: {
        channel: true,
        bot: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
          },
        },
      },
    });

    // Update channel isConnected
    await this.prisma.channel.update({
      where: { id: channel.id },
      data: { isConnected: true, credentials: encryptedCredentials },
    });

    return updatedConnection;
  }

  // ==================== READ ====================

  /**
   * دریافت اتصال با adapter
   */
  async getWithAdapter(connectionId: string): Promise<ConnectionWithAdapter | null> {
    const connection = await this.prisma.channelConnection.findUnique({
      where: { id: connectionId },
      include: {
        channel: true,
        bot: true,
      },
    });

    if (!connection) return null;

    // رمزگشایی credentials
    let credentials: Record<string, string> = {};
    if (connection.accessToken) {
      try {
        credentials = decryptJSON<Record<string, string>>(connection.accessToken);
      } catch (error) {
        console.error('خطا در رمزگشایی credentials:', error);
        return null;
      }
    }

    const config = connection.metadata
      ? JSON.parse(connection.metadata)
      : {};

    // ساخت adapter
    const adapter = createAdapter(connection.channel.type as ChannelType, {
      connectionId: connection.id,
      credentials,
      config,
    });

    return { connection, adapter };
  }

  /**
   * لیست اتصال‌های یک ربات
   */
  async listByBot(botId: string) {
    return this.prisma.channelConnection.findMany({
      where: { botId },
      include: {
        channel: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * لیست اتصال‌های یک کانال
   */
  async listByChannel(channelId: string) {
    return this.prisma.channelConnection.findMany({
      where: { channelId },
      include: {
        bot: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * دریافت اتصال بر اساس نوع کانال و شناسه خارجی
   */
  async findByExternalId(channelType: ChannelType, externalId: string) {
    const channel = await this.prisma.channel.findFirst({
      where: { type: channelType },
    });

    if (!channel) return null;

    return this.prisma.channelConnection.findFirst({
      where: {
        channelId: channel.id,
        externalId,
        isActive: true,
      },
      include: {
        bot: true,
      },
    });
  }

  // ==================== UPDATE ====================

  /**
   * بروزرسانی اتصال
   */
  async update(connectionId: string, input: UpdateConnectionInput) {
    const connection = await this.prisma.channelConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new Error('اتصال یافت نشد');
    }

    const updateData: any = {};

    if (input.credentials) {
      updateData.accessToken = encryptJSON(input.credentials);
    }

    if (input.config) {
      updateData.metadata = JSON.stringify(input.config);
    }

    if (input.isActive !== undefined) {
      updateData.isActive = input.isActive;
    }

    return this.prisma.channelConnection.update({
      where: { id: connectionId },
      data: updateData,
    });
  }

  /**
   * فعال/غیرفعال کردن اتصال
   */
  async toggleActive(connectionId: string, isActive: boolean) {
    const connectionData = await this.getWithAdapter(connectionId);
    if (!connectionData) {
      throw new Error('اتصال یافت نشد');
    }

    if (isActive) {
      // تنظیم webhook در صورت فعال‌سازی
      await connectionData.adapter.setupWebhook();
    } else {
      // حذف webhook در صورت غیرفعال‌سازی
      await connectionData.adapter.removeWebhook();
    }

    return this.prisma.channelConnection.update({
      where: { id: connectionId },
      data: { isActive },
    });
  }

  // ==================== DELETE ====================

  /**
   * حذف اتصال
   */
  async delete(connectionId: string) {
    const connectionData = await this.getWithAdapter(connectionId);

    if (connectionData) {
      // حذف webhook
      try {
        await connectionData.adapter.removeWebhook();
      } catch (error) {
        console.warn('خطا در حذف webhook:', error);
      }
    }

    await this.prisma.channelConnection.delete({
      where: { id: connectionId },
    });

    return { success: true };
  }

  // ==================== TEST ====================

  /**
   * تست اتصال
   */
  async testConnection(connectionId: string) {
    const connectionData = await this.getWithAdapter(connectionId);

    if (!connectionData) {
      throw new Error('اتصال یافت نشد');
    }

    const success = await connectionData.adapter.testConnection();

    return {
      success,
      message: success ? 'اتصال موفق' : 'تست اتصال ناموفق',
    };
  }

  // ==================== HELPERS ====================

  private _getChannelIcon(type: ChannelType): string {
    const icons: Record<ChannelType, string> = {
      eitaa: '📡',
      telegram: '📱',
      whatsapp: '💬',
      webchat: '🌐',
      bale: '🐋',
      rubika: '🎨',
      soroush: '🌺',
      instagram: '📷',
    };
    return icons[type] || '💬';
  }
}

export default ChannelConnectionService;