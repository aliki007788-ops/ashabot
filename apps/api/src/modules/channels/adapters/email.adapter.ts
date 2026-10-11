/**
 * Email Channel Adapter
 * آداپتور کانال ایمیل (SMTP/IMAP)
 *
 * @module channels/adapters/email
 * @version 1.0.0
 */

import {
  BaseChannelAdapter,
  IncomingMessage,
  OutgoingMessage,
  SendResult,
  WebhookSetupResult,
} from './base.adapter.js';

export class EmailAdapter extends BaseChannelAdapter {
  public readonly channelType = 'email';
  public readonly icon = '📧';

  async sendMessage(message: OutgoingMessage): Promise<SendResult> {
    try {
      const apiKey = this.requireCredential('apiKey');
      const fromEmail = this.config.fromEmail || 'noreply@asha.ai';

      // استفاده از Resend / SendGrid API
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: message.chatId, // chatId = email address
          subject: message.metadata?.subject || 'پیام از آشا',
          html: message.text.replace(/\n/g, '<br>'),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      const data = (await response.json()) as { id: string };
      this.safeLog('ایمیل ارسال شد', { to: message.chatId });

      return { success: true, messageId: data.id };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'خطای ناشناخته';
      return { success: false, error: msg };
    }
  }

  async setupWebhook(): Promise<WebhookSetupResult> {
    // ایمیل webhook نداره معمولاً — از polling یا inbound parse استفاده میشه
    const webhookUrl = this.getWebhookUrl();
    this.safeLog('Webhook URL برای inbound parse', { webhookUrl });
    return { success: true, webhookUrl };
  }

  async removeWebhook(): Promise<boolean> {
    return true;
  }

  async testConnection(): Promise<boolean> {
    try {
      const apiKey = this.requireCredential('apiKey');
      const response = await fetch('https://api.resend.com/domains', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  parseWebhook(body: any, headers: Record<string, any>): IncomingMessage | null {
    try {
      // inbound email webhook
      const { from, subject, text, html } = body;

      if (!from) return null;

      return {
        externalUserId: from,
        userName: from,
        text: text || html?.replace(/<[^>]*>/g, '') || subject || '',
        chatId: from,
        chatType: 'private',
        raw: body,
        metadata: { subject },
      };
    } catch {
      return null;
    }
  }
}

export default EmailAdapter;