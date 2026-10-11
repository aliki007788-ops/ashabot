/**
 * Facebook Messenger Channel Adapter
 * آداپتور کانال فیسبوک مسنجر
 *
 * @module channels/adapters/facebook
 * @version 1.0.0
 */

import {
  BaseChannelAdapter,
  IncomingMessage,
  OutgoingMessage,
  SendResult,
  WebhookSetupResult,
} from './base.adapter.js';

export class FacebookAdapter extends BaseChannelAdapter {
  public readonly channelType = 'facebook';
  public readonly icon = '👤';

  private readonly apiBase = 'https://graph.facebook.com/v18.0';

  async sendMessage(message: OutgoingMessage): Promise<SendResult> {
    try {
      const accessToken = this.requireCredential('accessToken');
      const pageId = this.requireCredential('appId');

      const url = `${this.apiBase}/${pageId}/messages?access_token=${accessToken}`;

      const payload: Record<string, any> = {
        recipient: { id: message.chatId },
        message: { text: message.text },
        messaging_type: 'RESPONSE',
      };

      if (message.buttons && message.buttons.length > 0) {
        payload.message.attachment = {
          type: 'template',
          payload: {
            template_type: 'button',
            text: message.text,
            buttons: message.buttons[0].map((b) => ({
              type: b.url ? 'web_url' : 'postback',
              title: b.text,
              url: b.url,
              payload: b.callbackData,
            })),
          },
        };
        delete payload.message.text;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      const data = (await response.json()) as any;
      this.safeLog('پیام FB ارسال شد', { to: message.chatId });

      return {
        success: true,
        messageId: data.message_id || '',
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'خطای ناشناخته';
      return { success: false, error: msg };
    }
  }

  async setupWebhook(): Promise<WebhookSetupResult> {
    try {
      const accessToken = this.requireCredential('accessToken');
      const pageId = this.requireCredential('appId');
      const webhookUrl = this.getWebhookUrl();
      const verifyToken = this.credentials.secret || 'asha-verify-token';

      // 1. Webhook subscription
      const url = `${this.apiBase}/${pageId}/subscribed_apps`;

      const response = await fetch(
        `${url}?access_token=${accessToken}&subscribed_fields=messages,messaging_postbacks`,
        { method: 'POST' },
      );

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      this.safeLog('FB Webhook ثبت شد', { webhookUrl });
      return { success: true, webhookUrl };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'خطای ناشناخته';
      return { success: false, error: msg };
    }
  }

  async removeWebhook(): Promise<boolean> {
    try {
      const accessToken = this.requireCredential('accessToken');
      const pageId = this.requireCredential('appId');
      const response = await fetch(
        `${this.apiBase}/${pageId}/subscribed_apps?access_token=${accessToken}`,
        { method: 'DELETE' },
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const accessToken = this.requireCredential('accessToken');
      const pageId = this.requireCredential('appId');
      const response = await fetch(
        `${this.apiBase}/${pageId}?fields=name&access_token=${accessToken}`,
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  parseWebhook(body: any, headers: Record<string, any>): IncomingMessage | null {
    try {
      const entry = body.entry?.[0];
      const messaging = entry?.messaging?.[0];

      if (!messaging) return null;

      const senderId = messaging.sender?.id;
      const text = messaging.message?.text;

      if (!senderId) return null;

      return {
        externalUserId: senderId,
        userName: senderId,
        text: text || '',
        chatId: senderId,
        chatType: 'private',
        raw: body,
      };
    } catch {
      return null;
    }
  }
}

export default FacebookAdapter;