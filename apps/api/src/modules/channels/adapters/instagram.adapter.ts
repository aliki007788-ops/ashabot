/**
 * Instagram Channel Adapter
 * آداپتر کانال اینستاگرام (از طریق Instagram Graph API)
 * 
 * @module channels/adapters/instagram
 * @version 1.0.0
 * 
 * @see https://developers.facebook.com/docs/instagram-api
 * 
 * نکته: Instagram از طریق Facebook Graph API کار می‌کند
 * برای Direct Messages نیاز به Instagram Business Account دارد
 */

import {
  BaseChannelAdapter,
  IncomingMessage,
  OutgoingMessage,
  SendResult,
  WebhookSetupResult,
} from './base.adapter.js';

// ==================== TYPES ====================

interface InstagramWebhookPayload {
  object: 'instagram';
  entry: Array<{
    id: string;
    time: number;
    messaging?: Array<{
      sender: { id: string };
      recipient: { id: string };
      timestamp: number;
      message?: {
        mid: string;
        text?: string;
        attachments?: Array<{
          type: string;
          payload: { url: string };
        }>;
        is_echo?: boolean;
      };
    }>;
  }>;
}

interface InstagramSendResponse {
  recipient_id: string;
  message_id: string;
  error?: {
    message: string;
    type: string;
    code: number;
  };
}

// ==================== ADAPTER ====================

export class InstagramAdapter extends BaseChannelAdapter {
  public readonly channelType = 'instagram';
  public readonly icon = '📷';

  private readonly apiBase = 'https://graph.facebook.com/v18.0';

  // ==================== SEND MESSAGE ====================

  async sendMessage(message: OutgoingMessage): Promise<SendResult> {
    try {
      const accessToken = this.requireCredential('accessToken');
      const pageId = this.requireCredential('appId');

      const url = `${this.apiBase}/${pageId}/messages?access_token=${accessToken}`;

      const payload: Record<string, any> = {
        recipient: { id: message.chatId },
        message: { text: message.text },
      };

      // دکمه‌های quick reply
      if (message.buttons && message.buttons.length > 0) {
        const flatButtons = message.buttons.flat().slice(0, 13);

        payload.message.quick_replies = flatButtons.map((btn, idx) => ({
          content_type: 'text',
          title: btn.text.substring(0, 20),
          payload: btn.callbackData || `btn_${idx}`,
        }));
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as InstagramSendResponse;

      if (data.error) {
        return {
          success: false,
          error: data.error.message,
        };
      }

      this.safeLog('پیام ارسال شد', { chatId: message.chatId });

      return {
        success: true,
        messageId: data.message_id,
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
      // در اینستاگرام، webhook باید از طریق Facebook Developer Console تنظیم شود
      // و callback URL باید در Instagram App تنظیم باشد

      const webhookUrl = this.getWebhookUrl();

      this.safeLog('Webhook URL برای تنظیم در Facebook Console', { webhookUrl });

      return {
        success: true,
        webhookUrl,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطای ناشناخته';
      return { success: false, error: errorMessage };
    }
  }

  // ==================== REMOVE WEBHOOK ====================

  async removeWebhook(): Promise<boolean> {
    // در Instagram، حذف webhook از طریق Facebook Console انجام می‌شود
    this.safeLog('حذف Webhook باید از طریق Facebook Console انجام شود');
    return true;
  }

  // ==================== TEST CONNECTION ====================

  async testConnection(): Promise<boolean> {
    try {
      const accessToken = this.requireCredential('accessToken');
      const pageId = this.requireCredential('appId');

      const url = `${this.apiBase}/${pageId}?fields=id,username,name&access_token=${accessToken}`;

      const response = await fetch(url);

      const data = (await response.json()) as {
        id?: string;
        username?: string;
        error?: { message: string };
      };

      if (data.error) {
        this.safeLog('تست اتصال ناموفق', { error: data.error.message });
        return false;
      }

      this.safeLog('تست اتصال موفق', {
        pageId: data.id,
        username: data.username,
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
      const accessToken = this.requireCredential('accessToken');
      const pageId = this.requireCredential('appId');

      const url = `${this.apiBase}/${pageId}?fields=id,username,name,profile_picture_url&access_token=${accessToken}`;

      const response = await fetch(url);
      const data = (await response.json()) as Record<string, any>;

      return data.error ? null : data;
    } catch (error) {
      return null;
    }
  }

  // ==================== PARSE WEBHOOK ====================

  parseWebhook(body: any, headers: Record<string, any>): IncomingMessage | null {
    try {
      const payload = body as InstagramWebhookPayload;

      if (payload.object !== 'instagram') {
        return null;
      }

      const messaging = payload.entry?.[0]?.messaging?.[0];
      if (!messaging?.message?.text) {
        return null;
      }

      // نادیده گرفتن پیام‌های خود ربات (echo)
      if (messaging.message.is_echo) {
        return null;
      }

      return {
        externalUserId: messaging.sender.id,
        userName: messaging.sender.id, // Instagram نام کاربر را برنمی‌گرداند
        text: messaging.message.text,
        chatId: messaging.sender.id,
        chatType: 'private',
        raw: body,
        metadata: {
          messageId: messaging.message.mid,
          timestamp: messaging.timestamp,
        },
      };
    } catch (error) {
      this.safeLog('خطا در پارس webhook', {
        error: error instanceof Error ? error.message : 'نامشخص',
      });
      return null;
    }
  }

  // ==================== VERIFY WEBHOOK (GET) ====================

  verifyWebhook(query: Record<string, any>): { ok: boolean; challenge?: string } {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    const verifyToken = this.credentials.secret;

    if (mode === 'subscribe' && token === verifyToken) {
      this.safeLog('Webhook verification موفق');
      return { ok: true, challenge: String(challenge) };
    }

    this.safeLog('Webhook verification ناموفق');
    return { ok: false };
  }

  // ==================== SEND ATTACHMENT ====================

  async sendAttachment(
    chatId: string,
    url: string,
    type: 'image' | 'video' | 'audio' | 'file' = 'image'
  ): Promise<SendResult> {
    try {
      const accessToken = this.requireCredential('accessToken');
      const pageId = this.requireCredential('appId');

      const apiUrl = `${this.apiBase}/${pageId}/messages?access_token=${accessToken}`;

      const payload: Record<string, any> = {
        recipient: { id: chatId },
        message: {
          attachment: {
            type,
            payload: { url, is_reusable: true },
          },
        },
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as InstagramSendResponse;

      if (data.error) {
        return { success: false, error: data.error.message };
      }

      return {
        success: true,
        messageId: data.message_id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'خطای ناشناخته',
      };
    }
  }

  // ==================== SEND ICE BREAKERS ====================

  async setupIceBreakers(questions: string[]): Promise<boolean> {
    try {
      const accessToken = this.requireCredential('accessToken');
      const pageId = this.requireCredential('appId');

      const url = `${this.apiBase}/${pageId}/messenger_profile?access_token=${accessToken}`;

      const payload = {
        ice_breakers: questions.slice(0, 4).map((q) => ({
          question: q.substring(0, 80),
          payload: q.toLowerCase().replace(/\s+/g, '_'),
        })),
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { result?: string };
      return data.result === 'success';
    } catch (error) {
      return false;
    }
  }

  // ==================== GET USER PROFILE ====================

  async getUserProfile(userId: string): Promise<Record<string, any> | null> {
    try {
      const accessToken = this.requireCredential('accessToken');

      const url = `${this.apiBase}/${userId}?fields=name,username,profile_pic&access_token=${accessToken}`;

      const response = await fetch(url);
      const data = (await response.json()) as Record<string, any>;

      return data.error ? null : data;
    } catch (error) {
      return null;
    }
  }
}

export default InstagramAdapter;