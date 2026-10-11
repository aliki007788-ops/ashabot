/**
 * LinkedIn Channel Adapter
 * آداپتور کانال لینکدین
 *
 * @module channels/adapters/linkedin
 * @version 1.0.0
 */

import {
  BaseChannelAdapter,
  IncomingMessage,
  OutgoingMessage,
  SendResult,
  WebhookSetupResult,
} from './base.adapter.js';

export class LinkedInAdapter extends BaseChannelAdapter {
  public readonly channelType = 'linkedin';
  public readonly icon = '💼';

  private readonly apiBase = 'https://api.linkedin.com/v2';

  async sendMessage(message: OutgoingMessage): Promise<SendResult> {
    try {
      const accessToken = this.requireCredential('accessToken');

      // LinkedIn Messaging API
      const url = `${this.apiBase}/messages`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify({
          recipients: [`urn:li:person:${message.chatId}`],
          subject: message.metadata?.subject || 'پیام از آشا',
          body: message.text,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      const data = (await response.json()) as any;
      this.safeLog('پیام لینکدین ارسال شد', { to: message.chatId });

      return {
        success: true,
        messageId: data.id || '',
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'خطای ناشناخته';
      return { success: false, error: msg };
    }
  }

  async setupWebhook(): Promise<WebhookSetupResult> {
    try {
      const webhookUrl = this.getWebhookUrl();
      const accessToken = this.requireCredential('accessToken');

      // LinkedIn webhook registration
      const url = `${this.apiBase}/webhooks`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhook: webhookUrl,
          events: ['message.created'],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      return { success: true, webhookUrl };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'خطای ناشناخته';
      return { success: false, error: msg };
    }
  }

  async removeWebhook(): Promise<boolean> {
    try {
      const accessToken = this.requireCredential('accessToken');
      const url = `${this.apiBase}/webhooks`;
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
      const response = await fetch(`${this.apiBase}/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  parseWebhook(body: any, headers: Record<string, any>): IncomingMessage | null {
    try {
      const { eventType, message } = body;

      if (eventType !== 'message.created' || !message) return null;

      return {
        externalUserId: message.sender || '',
        userName: message.senderName || '',
        text: message.body || '',
        chatId: message.sender || '',
        chatType: 'private',
        raw: body,
      };
    } catch {
      return null;
    }
  }
}

export default LinkedInAdapter;