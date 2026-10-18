/**
 * Channel Router Service
 * سرویس مسیریابی پیام‌های کانال‌ها به ربات‌های مربوطه
 * 
 * @module channels/channel-router.service
 * @version 1.0.0
 * 
 * این سرویس پیام‌های دریافتی از کانال‌ها را به ربات مناسب مسیر می‌دهد
 * و پاسخ ربات را به کانال برمی‌گرداند.
 */

import { PrismaClient } from '@prisma/client';
import { ChannelConnectionService } from './channel-connection.service.js';
import { BaseChannelAdapter, ChannelType } from './adapters/index.js';
import type { IncomingMessage } from './adapters/base.adapter.js';

// ==================== TYPES ====================

export interface ProcessedMessage {
  /** شناسه پیام */
  messageId: string;
  /** پاسخ ربات */
  response: string;
  /** آیا پردازش موفق بود */
  success: boolean;
  /** پیام خطا در صورت وجود */
  error?: string;
}

export interface RouterContext {
  connectionId: string;
  channelType: ChannelType;
  incomingMessage: IncomingMessage;
}

export interface WebhookProcessingResult {
  /** آیا پیام پردازش شد */
  processed: boolean;
  /** پیام‌های پاسخ داده شده */
  responses: ProcessedMessage[];
  /** پیام خطا */
  error?: string;
}

// ==================== SERVICE ====================

export class ChannelRouterService {
  private connectionService: ChannelConnectionService;

  constructor(private prisma: PrismaClient) {
    this.connectionService = new ChannelConnectionService(prisma);
  }

  // ==================== MAIN HANDLER ====================

  /**
   * پردازش webhook دریافتی از کانال
   */
  async processWebhook(
    channelType: ChannelType,
    connectionId: string,
    body: any,
    headers: Record<string, any>
  ): Promise<WebhookProcessingResult> {
    try {
      // دریافت اتصال و adapter
      const connectionData = await this.connectionService.getWithAdapter(connectionId);

      if (!connectionData) {
        return {
          processed: false,
          responses: [],
          error: 'اتصال یافت نشد',
        };
      }

      const { connection, adapter } = connectionData;

      if (!connection.isActive) {
        return {
          processed: false,
          responses: [],
          error: 'اتصال غیرفعال است',
        };
      }

      // بررسی وجود ربات
      if (!connection.botId) {
        return {
          processed: false,
          responses: [],
          error: 'ربات به این اتصال متصل نیست',
        };
      }

      // پارس پیام
      const incomingMessage = adapter.parseWebhook(body, headers);

      if (!incomingMessage) {
        // پیام قابل پردازش نیست (مثلاً callback query)
        return {
          processed: false,
          responses: [],
        };
      }

      // پردازش پیام با AI
      const response = await this._processWithAI(
        connection.botId,
        connectionId,
        incomingMessage
      );

      // ارسال پاسخ به کانال
      if (response.response) {
        const sendResult = await adapter.sendMessage({
          chatId: incomingMessage.chatId,
          text: response.response,
          parseMode: 'HTML',
        });

        response.messageId = sendResult.messageId || '';
        response.success = sendResult.success;
        if (!sendResult.success) {
          response.error = sendResult.error;
        }
      }

      // لاگ فعالیت
      await this._logActivity(
        connection.botId,
        connectionId,
        incomingMessage,
        response
      );

      return {
        processed: true,
        responses: [response],
      };
    } catch (error) {
      console.error('[ChannelRouter] خطا در پردازش:', error);
      return {
        processed: false,
        responses: [],
        error: error instanceof Error ? error.message : 'خطای ناشناخته',
      };
    }
  }

  // ==================== AI PROCESSING ====================

  /**
   * پردازش پیام با AI (از طریق سرویس AI موجود)
   */
  private async _processWithAI(
    botId: string,
    connectionId: string,
    incomingMessage: IncomingMessage
  ): Promise<ProcessedMessage> {
    try {
      // دریافت ربات
      const bot = await this.prisma.bot.findUnique({
        where: { id: botId },
        include: {
          brains: {
            include: {
              brain: true,
            },
          },
        },
      });

      if (!bot) {
        return {
          messageId: '',
          response: '',
          success: false,
          error: 'ربات یافت نشد',
        };
      }

      // پیدا کردن یا ساختن مکالمه
      const sessionId = `channel_${connectionId}_${incomingMessage.externalUserId}`;

      let conversation = await this.prisma.conversation.findUnique({
        where: { sessionId },
      });

      if (!conversation) {
        conversation = await this.prisma.conversation.create({
          data: {
            botId,
            sessionId,
            title: `${incomingMessage.userName || 'کاربر'} در ${incomingMessage.chatType}`,
            channelId: (
              await this.prisma.channel.findFirst({
                where: { type: 'eitaa' },
              })
            )?.id,
          },
        });
      }

      // ذخیره پیام کاربر
      await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'user',
          content: incomingMessage.text,
        },
      });

      // دریافت پیام‌های قبلی برای context
      const previousMessages = await this.prisma.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'asc' },
        take: 20,
      });

      // ساخت context برای AI
      const messages = previousMessages.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      }));

      // ارسال به AI
      const aiResponse = await this._callAI(bot, messages);

      // ذخیره پاسخ
      await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'assistant',
          content: aiResponse,
          model: bot.model,
        },
      });

      // بروزرسانی conversation
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });

      return {
        messageId: '',
        response: aiResponse,
        success: true,
      };
    } catch (error) {
      console.error('[ChannelRouter] خطا در AI:', error);
      return {
        messageId: '',
        response: 'متأسفانه در پردازش پیام شما خطایی رخ داد. لطفاً دوباره تلاش کنید.',
        success: false,
        error: error instanceof Error ? error.message : 'خطای ناشناخته',
      };
    }
  }

  /**
   * فراخوانی سرویس AI
   */
  private async _callAI(
    bot: any,
    messages: Array<{ role: string; content: string }>
  ): Promise<string> {
    try {
      const apiKey = process.env.OPENAI_API_KEY;

      if (!apiKey) {
        throw new Error('OPENAI_API_KEY تنظیم نشده است');
      }

      // ساخت system prompt
      const systemPrompt = bot.systemPrompt || 'شما یک دستیار هوشمند هستید.';

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: bot.model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages,
          ],
          temperature: bot.temperature || 0.7,
          max_tokens: bot.maxTokens || 1024,
        }),
      });

      if (!response.ok) {
        throw new Error(`خطای OpenAI: ${response.status}`);
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
      };

      return data.choices?.[0]?.message?.content || 'پاسخی دریافت نشد';
    } catch (error) {
      console.error('[ChannelRouter] خطا در فراخوانی AI:', error);
      throw error;
    }
  }

  // ==================== ACTIVITY LOG ====================

  /**
   * ثبت فعالیت
   */
  private async _logActivity(
    botId: string,
    connectionId: string,
    incomingMessage: IncomingMessage,
    response: ProcessedMessage
  ): Promise<void> {
    try {
      await this.prisma.activityLog.create({
        data: {
          type: 'channel_message',
          message: `پیام از ${incomingMessage.userName || 'کاربر'} در ${incomingMessage.chatType}`,
          botId,
          metadata: JSON.stringify({
            connectionId,
            chatId: incomingMessage.chatId,
            userId: incomingMessage.externalUserId,
            text: incomingMessage.text.substring(0, 200),
            responseSuccess: response.success,
          }),
        },
      });
    } catch (error) {
      console.warn('[ChannelRouter] خطا در ثبت فعالیت:', error);
    }
  }

  // ==================== VERIFY WEBHOOK ====================

  /**
   * تأیید webhook (برای WhatsApp و Instagram)
   */
  async verifyWebhook(
    connectionId: string,
    query: Record<string, any>
  ): Promise<{ ok: boolean; challenge?: string }> {
    try {
      const connectionData = await this.connectionService.getWithAdapter(connectionId);

      if (!connectionData) {
        return { ok: false };
      }

      const { adapter } = connectionData;

      // بررسی وجود متد verifyWebhook
      if (typeof (adapter as any).verifyWebhook === 'function') {
        return (adapter as any).verifyWebhook(query);
      }

      return { ok: false };
    } catch (error) {
      console.error('[ChannelRouter] خطا در verify webhook:', error);
      return { ok: false };
    }
  }

  // ==================== BROADCAST ====================

  /**
   * ارسال پیام به همه اتصال‌های یک ربات
   */
  async broadcastToBot(
    botId: string,
    text: string
  ): Promise<{ sent: number; failed: number }> {
    const connections = await this.connectionService.listByBot(botId);

    let sent = 0;
    let failed = 0;

    for (const connection of connections) {
      if (!connection.isActive) continue;

      try {
        const connectionData = await this.connectionService.getWithAdapter(
          connection.id
        );

        if (!connectionData) {
          failed++;
          continue;
        }

        // ارسال پیام
        const result = await connectionData.adapter.sendMessage({
          chatId: connection.externalId || '',
          text,
          parseMode: 'HTML',
        });

        if (result.success) {
          sent++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
      }
    }

    return { sent, failed };
  }

  // ==================== STATS ====================

  /**
   * دریافت آمار پردازش
   */
  async getStats(botId?: string): Promise<{
    totalConnections: number;
    activeConnections: number;
    messagesProcessed: number;
  }> {
    const where = botId ? { botId } : {};

    const [totalConnections, activeConnections, messagesProcessed] =
      await Promise.all([
        this.prisma.channelConnection.count({ where }),
        this.prisma.channelConnection.count({
          where: { ...where, isActive: true },
        }),
        this.prisma.activityLog.count({
          where: {
            ...(botId ? { botId } : {}),
            type: 'channel_message',
          },
        }),
      ]);

    return {
      totalConnections,
      activeConnections,
      messagesProcessed,
    };
  }
}

export default ChannelRouterService;