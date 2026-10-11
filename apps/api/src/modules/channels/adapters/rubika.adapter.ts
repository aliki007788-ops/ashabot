/**
 * Rubika Channel Adapter
 * آداپتر کانال روبیکا (پیام‌رسان ایرانی)
 * 
 * @module channels/adapters/rubika
 * @version 1.0.0
 * 
 * @see https://rubika.ir
 * 
 * نکته: API روبیکا از ساختار bot API استفاده می‌کند
 * مستندات کامل: https://rubika.ir/bots/docs
 */

import {
  BaseChannelAdapter,
  IncomingMessage,
  OutgoingMessage,
  SendResult,
  WebhookSetupResult,
} from './base.adapter.js';

// ==================== TYPES ====================

interface RubikaApiResponse<T = any> {
  status: 'OK' | 'ERROR' | 'INVALID_INPUT' | 'TOO_REQUESTS';
  data?: T;
  message?: string;
  error?: string;
}

interface RubikaUpdate {
  update_id: string;
  type: 'NewMessage' | 'EditedMessage' | 'RemovedMessage' | 'StartedBot';
  chat_id: string;
  sender_id: string;
  message_id: string;
  text?: string;
  timestamp: number;
  sender_type?: 'User' | 'Bot';
  sender?: {
    user_id: string;
    first_name?: string;
    last_name?: string;
    username?: string;
  };
}

// ==================== ADAPTER ====================

export class RubikaAdapter extends BaseChannelAdapter {
  public readonly channelType = 'rubika';
  public readonly icon = '🎨';

  private readonly apiBase = 'https://botapi.rubika.ir/v3';

  // ==================== SEND MESSAGE ====================

  async sendMessage(message: OutgoingMessage): Promise<SendResult> {
    try {
      const botToken = this.requireCredential('botToken');
      const url = `${this.apiBase}/${botToken}/sendMessage`;

      const payload: Record<string, any> = {
        chat_id: message.chatId,
        text: message.text,
      };

      if (message.replyToMessageId) {
        payload.reply_to_message_id = message.replyToMessageId;
      }

      // دکمه‌های inline
      if (message.buttons && message.buttons.length > 0) {
        payload.chat_keypad = JSON.stringify({
          rows: message.buttons.map((row, rowIdx) => ({
            buttons: row.map((btn, btnIdx) => ({
              id: btn.callbackData || `btn_${rowIdx}_${btnIdx}`,
              type: btn.url ? 'Link' : 'Simple',
              button_text: btn.text,
              button_link: btn.url,
            })),
          })),
        });

        payload.chat_keypad_type = 'New';
        payload.chat_keypad_resize_keyboard = true;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as RubikaApiResponse<{
        message_id: string;
      }>;

      if (data.status !== 'OK') {
        return {
          success: false,
          error: data.message || data.error || 'خطای روبیکا',
        };
      }

      this.safeLog('پیام ارسال شد', { chatId: message.chatId });

      return {
        success: true,
        messageId: data.data?.message_id,
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

      // روبیکا از endpoint updateBotEndpoints استفاده می‌کند
      const url = `${this.apiBase}/${botToken}/updateBotEndpoints`;

      const payload = {
        url: webhookUrl,
        type: 'ReceiveUpdate',
        update_type: 'Webhook',
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as RubikaApiResponse;

      if (data.status !== 'OK') {
        return {
          success: false,
          error: data.message || 'خطا در تنظیم webhook',
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

      // غیرفعال کردن webhook
      const url = `${this.apiBase}/${botToken}/updateBotEndpoints`;

      const payload = {
        url: '',
        type: 'ReceiveUpdate',
        update_type: 'Webhook',
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as RubikaApiResponse;

      if (data.status !== 'OK') {
        this.safeLog('خطا در حذف webhook', { error: data.message });
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
      const url = `${this.apiBase}/${botToken}/getMe`;

      const response = await fetch(url);
      const data = (await response.json()) as RubikaApiResponse<{
        bot: {
          bot_id: string;
          bot_title: string;
          username: string;
        };
      }>;

      if (data.status !== 'OK') {
        this.safeLog('تست اتصال ناموفق', { error: data.message });
        return false;
      }

      this.safeLog('تست اتصال موفق', {
        botId: data.data?.bot.bot_id,
        botTitle: data.data?.bot.bot_title,
        username: data.data?.bot.username,
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
      const url = `${this.apiBase}/${botToken}/getMe`;

      const response = await fetch(url);
      const data = (await response.json()) as RubikaApiResponse;

      return data.status === 'OK' ? data.data || null : null;
    } catch (error) {
      return null;
    }
  }

  // ==================== PARSE WEBHOOK ====================

  parseWebhook(body: any, headers: Record<string, any>): IncomingMessage | null {
    try {
      const update = body as RubikaUpdate;

      // فقط پیام‌های جدید
      if (update.type !== 'NewMessage' || !update.text) {
        return null;
      }

      // نادیده گرفتن پیام‌های خود ربات
      if (update.sender_type === 'Bot') {
        return null;
      }

      return {
        externalUserId: update.sender_id,
        userName: update.sender
          ? [update.sender.first_name, update.sender.last_name]
              .filter(Boolean)
              .join(' ')
          : undefined,
        text: update.text,
        chatId: update.chat_id,
        chatType: 'private', // روبیکا معمولاً private است
        raw: update,
        metadata: {
          messageId: update.message_id,
          updateId: update.update_id,
        },
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
      const url = `${this.apiBase}/${botToken}/editMessageText`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text,
        }),
      });

      const data = (await response.json()) as RubikaApiResponse;
      return data.status === 'OK';
    } catch (error) {
      return false;
    }
  }

  // ==================== DELETE MESSAGE ====================

  async deleteMessage(chatId: string, messageId: string): Promise<boolean> {
    try {
      const botToken = this.requireCredential('botToken');
      const url = `${this.apiBase}/${botToken}/deleteMessage`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
        }),
      });

      const data = (await response.json()) as RubikaApiResponse;
      return data.status === 'OK';
    } catch (error) {
      return false;
    }
  }

  // ==================== SEND FILE ====================

  async sendFile(
    chatId: string,
    fileUrl: string,
    type: 'Image' | 'File' | 'Video' | 'Voice' = 'File'
  ): Promise<SendResult> {
    try {
      const botToken = this.requireCredential('botToken');
      const url = `${this.apiBase}/${botToken}/sendFile`;

      const payload = {
        chat_id: chatId,
        file_url: fileUrl,
        type,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as RubikaApiResponse<{
        message_id: string;
      }>;

      if (data.status !== 'OK') {
        return { success: false, error: data.message };
      }

      return {
        success: true,
        messageId: data.data?.message_id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'خطای ناشناخته',
      };
    }
  }
}

export default RubikaAdapter;