/**
 * Gap Channel Adapter
 * آداپتور کانال گپ (پیام‌رسان ایرانی)
 *
 * @module channels/adapters/gap
 * @version 1.0.0
 */

import {
  BaseChannelAdapter,
  IncomingMessage,
  OutgoingMessage,
  SendResult,
  WebhookSetupResult,
} from './base.adapter.js';

interface GapApiResponse<T = any> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

interface GapUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number | string;
      first_name?: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number | string;
      type: 'private' | 'group' | 'channel' | 'supergroup';
      title?: string;
    };
    date: number;
    text?: string;
  };
}

export class GapAdapter extends BaseChannelAdapter {
  public readonly channelType = 'gap';
  public readonly icon = '🟡';

  private readonly apiBase = 'https://api.gap.im';

  async sendMessage(message: OutgoingMessage): Promise<SendResult> {
    try {
      const botToken = this.requireCredential('botToken');
      const url = `${this.apiBase}/bot${botToken}/sendMessage`;

      const payload: Record<string, any> = {
        chat_id: message.chatId,
        text: message.text,
      };

      if (message.parseMode) {
        payload.parse_mode = message.parseMode;
      }

      if (message.replyToMessageId) {
        payload.reply_to_message_id = message.replyToMessageId;
      }

      if (message.buttons && message.buttons.length > 0) {
        payload.reply_markup = JSON.stringify({
          inline_keyboard: message.buttons,
        });
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as GapApiResponse<{ message_id: number }>;

      if (!data.ok) {
        return {
          success: false,
          error: data.description || `خطای گپ: ${data.error_code}`,
        };
      }

      this.safeLog('پیام ارسال شد', { chatId: message.chatId });

      return {
        success: true,
        messageId: String(data.result?.message_id),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطای ناشناخته';
      this.safeLog('خطا در ارسال پیام', { error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  async setupWebhook(): Promise<WebhookSetupResult> {
    try {
      const botToken = this.requireCredential('botToken');
      const webhookUrl = this.getWebhookUrl();

      const url = `${this.apiBase}/bot${botToken}/setWebhook`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
      });

      const data = (await response.json()) as GapApiResponse;

      if (!data.ok) {
        return {
          success: false,
          error: data.description || 'خطا در تنظیم webhook',
        };
      }

      this.safeLog('Webhook با موفقیت تنظیم شد', { webhookUrl });
      return { success: true, webhookUrl };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطای ناشناخته';
      this.safeLog('خطا در تنظیم webhook', { error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  async removeWebhook(): Promise<boolean> {
    try {
      const botToken = this.requireCredential('botToken');
      const url = `${this.apiBase}/bot${botToken}/deleteWebhook`;

      const response = await fetch(url, { method: 'POST' });
      const data = (await response.json()) as GapApiResponse;

      return data.ok;
    } catch {
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const botToken = this.requireCredential('botToken');
      const url = `${this.apiBase}/bot${botToken}/getMe`;

      const response = await fetch(url);
      const data = (await response.json()) as GapApiResponse;

      this.safeLog('تست اتصال', { success: data.ok });
      return data.ok;
    } catch {
      return false;
    }
  }

  parseWebhook(body: any, headers: Record<string, any>): IncomingMessage | null {
    try {
      const update = body as GapUpdate;

      if (!update.message || !update.message.text) return null;

      const message = update.message;

      return {
        externalUserId: String(message.from.id),
        userName: [message.from.first_name, message.from.last_name]
          .filter(Boolean)
          .join(' '),
        text: message.text,
        chatId: String(message.chat.id),
        chatType: message.chat.type === 'private' ? 'private' : message.chat.type === 'channel' ? 'channel' : 'group',
        raw: update,
      };
    } catch {
      return null;
    }
  }
}

export default GapAdapter;