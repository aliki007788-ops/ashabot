/**
 * WhatsApp Channel Adapter
 * آداپتر کانال واتساپ (از طریق WhatsApp Business API)
 * 
 * @module channels/adapters/whatsapp
 * @version 1.0.0
 * 
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api
 */

import {
  BaseChannelAdapter,
  IncomingMessage,
  OutgoingMessage,
  SendResult,
  WebhookSetupResult,
} from './base.adapter.js';

// ==================== TYPES ====================

interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: 'whatsapp';
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: { name: string };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: string;
          text?: { body: string };
          button?: { text: string };
          interactive?: {
            type: string;
            button_reply?: { id: string; title: string };
          };
        }>;
      };
      field: string;
    }>;
  }>;
}

interface WhatsAppSendResponse {
  messaging_product: string;
  contacts?: Array<{ input: string; wa_id: string }>;
  messages?: Array<{ id: string; message_status: string }>;
  error?: {
    message: string;
    type: string;
    code: number;
  };
}

// ==================== ADAPTER ====================

export class WhatsAppAdapter extends BaseChannelAdapter {
  public readonly channelType = 'whatsapp';
  public readonly icon = '💬';

  private readonly apiBase = 'https://graph.facebook.com/v18.0';

  // ==================== SEND MESSAGE ====================

  async sendMessage(message: OutgoingMessage): Promise<SendResult> {
    try {
      const accessToken = this.requireCredential('accessToken');
      const phoneNumberId = this.requireCredential('appId');

      const url = `${this.apiBase}/${phoneNumberId}/messages`;

      const payload: Record<string, any> = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: message.chatId,
        type: 'text',
        text: {
          preview_url: false,
          body: message.text,
        },
      };

      // دکمه‌های interactive
      if (message.buttons && message.buttons.length > 0) {
        const flatButtons = message.buttons.flat();

        if (flatButtons.length <= 3) {
          payload.type = 'interactive';
          payload.interactive = {
            type: 'button',
            body: { text: message.text },
            action: {
              buttons: flatButtons.slice(0, 3).map((btn, idx) => ({
                type: 'reply',
                reply: {
                  id: btn.callbackData || `btn_${idx}`,
                  title: btn.text.substring(0, 20),
                },
              })),
            },
          };
          delete payload.text;
        }
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as WhatsAppSendResponse;

      if (data.error) {
        return {
          success: false,
          error: data.error.message,
        };
      }

      this.safeLog('پیام ارسال شد', { chatId: message.chatId });

      return {
        success: true,
        messageId: data.messages?.[0]?.id,
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
      // در واتساپ، webhook باید از طریق Facebook Developer Console تنظیم شود
      // اینجا فقط URL را برمی‌گردانیم
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
    // حذف webhook در WhatsApp از طریق Facebook Console انجام می‌شود
    this.safeLog('حذف Webhook باید از طریق Facebook Console انجام شود');
    return true;
  }

  // ==================== TEST CONNECTION ====================

  async testConnection(): Promise<boolean> {
    try {
      const accessToken = this.requireCredential('accessToken');
      const phoneNumberId = this.requireCredential('appId');

      const url = `${this.apiBase}/${phoneNumberId}?access_token=${accessToken}`;

      const response = await fetch(url, {
        method: 'GET',
      });

      const data = (await response.json()) as { error?: { message: string } };

      if (data.error) {
        this.safeLog('تست اتصال ناموفق', { error: data.error.message });
        return false;
      }

      this.safeLog('تست اتصال موفق');
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
      const phoneNumberId = this.requireCredential('appId');

      const url = `${this.apiBase}/${phoneNumberId}?access_token=${accessToken}`;

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
      const payload = body as WhatsAppWebhookPayload;

      if (payload.object !== 'whatsapp_business_account') {
        return null;
      }

      const change = payload.entry?.[0]?.changes?.[0]?.value;
      if (!change?.messages?.[0]) {
        return null;
      }

      const message = change.messages[0];
      const contact = change.contacts?.[0];

      let text = '';
      if (message.text) {
        text = message.text.body;
      } else if (message.button) {
        text = message.button.text;
      } else if (message.interactive?.button_reply) {
        text = message.interactive.button_reply.title;
      }

      if (!text) {
        return null;
      }

      return {
        externalUserId: message.from,
        userName: contact?.profile?.name || message.from,
        text,
        chatId: message.from,
        chatType: 'private',
        raw: body,
        metadata: {
          messageId: message.id,
          timestamp: message.timestamp,
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

  // ==================== SEND TEMPLATE MESSAGE ====================

  async sendTemplate(
    chatId: string,
    templateName: string,
    languageCode: string = 'fa',
    parameters: string[] = []
  ): Promise<SendResult> {
    try {
      const accessToken = this.requireCredential('accessToken');
      const phoneNumberId = this.requireCredential('appId');

      const url = `${this.apiBase}/${phoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        to: chatId,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components: parameters.length
            ? [
                {
                  type: 'body',
                  parameters: parameters.map((p) => ({ type: 'text', text: p })),
                },
              ]
            : undefined,
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as WhatsAppSendResponse;

      if (data.error) {
        return { success: false, error: data.error.message };
      }

      return {
        success: true,
        messageId: data.messages?.[0]?.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطای ناشناخته';
      return { success: false, error: errorMessage };
    }
  }

  // ==================== MARK AS READ ====================

  async markAsRead(messageId: string): Promise<boolean> {
    try {
      const accessToken = this.requireCredential('accessToken');
      const phoneNumberId = this.requireCredential('appId');

      const url = `${this.apiBase}/${phoneNumberId}/messages`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        }),
      });

      const data = (await response.json()) as { success?: boolean };
      return data.success === true;
    } catch (error) {
      return false;
    }
  }
}

export default WhatsAppAdapter;