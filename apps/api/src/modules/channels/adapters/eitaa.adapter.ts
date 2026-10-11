/**
 * Eitaa Channel Adapter
 * آداپتر کانال ایتا (پیام‌رسان ایرانی)
 * 
 * @module channels/adapters/eitaa
 * @version 1.0.0
 * 
 * @see https://eitaa.com/api
 */

import {
  BaseChannelAdapter,
  IncomingMessage,
  OutgoingMessage,
  SendResult,
  WebhookSetupResult,
} from './base.adapter.js';

// ==================== TYPES ====================

interface EitaaApiResponse<T = any> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

interface EitaaUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
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

// ==================== ADAPTER ====================

export class EitaaAdapter extends BaseChannelAdapter {
  public readonly channelType = 'eitaa';
  public readonly icon = '📡';

  private readonly apiBase = 'https://eitaa.com/api';

  // ==================== SEND MESSAGE ====================

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

      if (message.keyboard && message.keyboard.length > 0) {
        payload.reply_markup = JSON.stringify({
          keyboard: message.keyboard.map((row) =>
            row.map((btn) => ({ text: btn }))
          ),
          resize_keyboard: true,
        });
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as EitaaApiResponse<{ message_id: number }>;

      if (!data.ok) {
        return {
          success: false,
          error: data.description || `خطای ایتا: ${data.error_code}`,
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

  // ==================== SETUP WEBHOOK ====================

  async setupWebhook(): Promise<WebhookSetupResult> {
    try {
      const botToken = this.requireCredential('botToken');
      const webhookUrl = this.getWebhookUrl();
      const secretToken = this.credentials.secret;

      const url = `${this.apiBase}/bot${botToken}/setWebhook`;

      const payload: Record<string, any> = {
        url: webhookUrl,
      };

      if (secretToken) {
        payload.secret_token = secretToken;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as EitaaApiResponse;

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

  // ==================== REMOVE WEBHOOK ====================

  async removeWebhook(): Promise<boolean> {
    try {
      const botToken = this.requireCredential('botToken');
      const url = `${this.apiBase}/bot${botToken}/deleteWebhook`;

      const response = await fetch(url, { method: 'POST' });
      const data = (await response.json()) as EitaaApiResponse;

      if (!data.ok) {
        this.safeLog('خطا در حذف webhook', { error: data.description });
        return false;
      }

      this.safeLog('Webhook حذف شد');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطای ناشناخته';
      this.safeLog('خطا در حذف webhook', { error: errorMessage });
      return false;
    }
  }

  // ==================== TEST CONNECTION ====================

  async testConnection(): Promise<boolean> {
    try {
      const botToken = this.requireCredential('botToken');
      const url = `${this.apiBase}/bot${botToken}/getMe`;

      const response = await fetch(url);
      const data = (await response.json()) as EitaaApiResponse<{
        id: number;
        first_name: string;
        username: string;
      }>;

      if (!data.ok) {
        this.safeLog('تست اتصال ناموفق', { error: data.description });
        return false;
      }

      this.safeLog('تست اتصال موفق', {
        botId: data.result?.id,
        botName: data.result?.first_name,
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطای ناشناخته';
      this.safeLog('خطا در تست اتصال', { error: errorMessage });
      return false;
    }
  }

  // ==================== GET BOT INFO ====================

  async getBotInfo(): Promise<Record<string, any> | null> {
    try {
      const botToken = this.requireCredential('botToken');
      const url = `${this.apiBase}/bot${botToken}/getMe`;

      const response = await fetch(url);
      const data = (await response.json()) as EitaaApiResponse;

      return data.ok ? data.result || null : null;
    } catch (error) {
      return null;
    }
  }

  // ==================== PARSE WEBHOOK ====================

  parseWebhook(body: any, headers: Record<string, any>): IncomingMessage | null {
    try {
      // بررسی secret token برای امنیت
      const secretToken = this.credentials.secret;
      if (secretToken) {
        const headerSecret =
          headers['x-eitaa-bot-api-secret-token'] ||
          headers['x-telegram-bot-api-secret-token'];

        if (headerSecret !== secretToken) {
          this.safeLog('secret token نامعتبر');
          return null;
        }
      }

      const update = body as EitaaUpdate;

      if (!update.message || !update.message.text) {
        return null;
      }

      const message = update.message;

      return {
        externalUserId: String(message.from.id),
        userName: [message.from.first_name, message.from.last_name]
          .filter(Boolean)
          .join(' '),
        text: message.text,
        chatId: String(message.chat.id),
        chatType: this._mapChatType(message.chat.type),
        raw: update,
      };
    } catch (error) {
      this.safeLog('خطا در پارس webhook', {
        error: error instanceof Error ? error.message : 'نامشخص',
      });
      return null;
    }
  }

  // ==================== EDIT MESSAGE ====================

  async editMessage(
    chatId: string,
    messageId: string,
    text: string
  ): Promise<boolean> {
    try {
      const botToken = this.requireCredential('botToken');
      const url = `${this.apiBase}/bot${botToken}/editMessageText`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: Number(messageId),
          text,
        }),
      });

      const data = (await response.json()) as EitaaApiResponse;
      return data.ok;
    } catch (error) {
      return false;
    }
  }

  // ==================== DELETE MESSAGE ====================

  async deleteMessage(chatId: string, messageId: string): Promise<boolean> {
    try {
      const botToken = this.requireCredential('botToken');
      const url = `${this.apiBase}/bot${botToken}/deleteMessage`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: Number(messageId),
        }),
      });

      const data = (await response.json()) as EitaaApiResponse;
      return data.ok;
    } catch (error) {
      return false;
    }
  }

  // ==================== HELPERS ====================

  private _mapChatType(
    type: string
  ): 'private' | 'group' | 'channel' {
    switch (type) {
      case 'private':
        return 'private';
      case 'group':
      case 'supergroup':
        return 'group';
      case 'channel':
        return 'channel';
      default:
        return 'private';
    }
  }
}

export default EitaaAdapter;