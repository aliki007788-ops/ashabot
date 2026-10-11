/**
 * Twitter/X Channel Adapter
 * آداپتور کانال توییتر / X
 *
 * @module channels/adapters/twitter
 * @version 1.0.0
 */

import {
  BaseChannelAdapter,
  IncomingMessage,
  OutgoingMessage,
  SendResult,
  WebhookSetupResult,
} from './base.adapter.js';

export class TwitterAdapter extends BaseChannelAdapter {
  public readonly channelType = 'twitter';
  public readonly icon = '🐦';

  private readonly apiBase = 'https://api.twitter.com/2';

  async sendMessage(message: OutgoingMessage): Promise<SendResult> {
    try {
      const accessToken = this.requireCredential('accessToken');

      // Twitter DM API — chatId = user_id یا conversation_id
      const url = `${this.apiBase}/dm_conversations/with/${message.chatId}/messages`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: message.text.slice(0, 10000),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      const data = (await response.json()) as any;
      this.safeLog('DM ارسال شد', { to: message.chatId });

      return {
        success: true,
        messageId: data.data?.dm_event_id || '',
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'خطای ناشناخته';
      return { success: false, error: msg };
    }
  }

  async setupWebhook(): Promise<WebhookSetupResult> {
    try {
      const accessToken = this.requireCredential('accessToken');
      const webhookUrl = this.getWebhookUrl();

      // Twitter Account Activity API
      const url = `${this.apiBase}/account_activity/all/webhooks.json`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: webhookUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      this.safeLog('Webhook ثبت شد', { webhookUrl });
      return { success: true, webhookUrl };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'خطای ناشناخته';
      return { success: false, error: msg };
    }
  }

  async removeWebhook(): Promise<boolean> {
    try {
      const accessToken = this.requireCredential('accessToken');
      const url = `${this.apiBase}/account_activity/all/webhooks.json`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const accessToken = this.requireCredential('accessToken');
      const url = `${this.apiBase}/users/me`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  parseWebhook(body: any, headers: Record<string, any>): IncomingMessage | null {
    try {
      const { for_user_id, direct_message_events, users } = body;

      if (!direct_message_events || !direct_message_events[0]) return null;

      const event = direct_message_events[0];
      const senderId = event.message_create?.sender_id;
      const text = event.message_create?.message_data?.text;

      if (!text || !senderId) return null;

      // پیدا کردن user info
      const userInfo = users?.[senderId];

      return {
        externalUserId: senderId,
        userName: userInfo?.name || senderId,
        text,
        chatId: senderId,
        chatType: 'private',
        raw: body,
      };
    } catch {
      return null;
    }
  }
}

export default TwitterAdapter;