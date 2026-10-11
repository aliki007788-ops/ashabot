/**
 * SMS Channel Adapter
 * آداپتور کانال پیامک (Kavenegar / TSMS)
 *
 * @module channels/adapters/sms
 * @version 1.0.0
 */

import {
  BaseChannelAdapter,
  IncomingMessage,
  OutgoingMessage,
  SendResult,
  WebhookSetupResult,
} from './base.adapter.js';

export class SmsAdapter extends BaseChannelAdapter {
  public readonly channelType = 'sms';
  public readonly icon = '📱';

  private getProvider(): string {
    return this.config.provider || 'kavenegar';
  }

  async sendMessage(message: OutgoingMessage): Promise<SendResult> {
    try {
      const apiKey = this.requireCredential('apiKey');
      const sender = this.config.sender || '10008663';
      const provider = this.getProvider();

      if (provider === 'kavenegar') {
        return await this._sendKavenegar(apiKey, sender, message);
      } else if (provider === 'tsms') {
        return await this._sendTsms(apiKey, sender, message);
      }

      return { success: false, error: `پروایدر ${provider} پشتیبانی نمی‌شود` };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'خطای ناشناخته';
      return { success: false, error: msg };
    }
  }

  private async _sendKavenegar(
    apiKey: string,
    sender: string,
    message: OutgoingMessage,
  ): Promise<SendResult> {
    const url = `https://api.kavenegar.com/v1/${apiKey}/sms/send.json`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        receptor: message.chatId,
        sender,
        message: message.text,
      }).toString(),
    });

    const data = (await response.json()) as any;

    if (data.return?.status !== 200) {
      return { success: false, error: data.return?.message || 'خطای Kavenegar' };
    }

    this.safeLog('پیامک ارسال شد', { to: message.chatId });
    return {
      success: true,
      messageId: String(data.entries?.[0]?.messageid || ''),
    };
  }

  private async _sendTsms(
    apiKey: string,
    sender: string,
    message: OutgoingMessage,
  ): Promise<SendResult> {
    const url = 'https://api.tsms.ir/json/send';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        lineNumber: sender,
        destination: message.chatId,
        message: message.text,
      }),
    });

    const data = (await response.json()) as any;

    if (data.status !== 1) {
      return { success: false, error: data.message || 'خطای TSMS' };
    }

    return { success: true };
  }

  async setupWebhook(): Promise<WebhookSetupResult> {
    const webhookUrl = this.getWebhookUrl();
    this.safeLog('Webhook URL برای SMS', { webhookUrl });
    return { success: true, webhookUrl };
  }

  async removeWebhook(): Promise<boolean> {
    return true;
  }

  async testConnection(): Promise<boolean> {
    try {
      const apiKey = this.requireCredential('apiKey');
      const provider = this.getProvider();

      if (provider === 'kavenegar') {
        const response = await fetch(
          `https://api.kavenegar.com/v1/${apiKey}/account/info.json`,
        );
        return response.ok;
      }

      return true;
    } catch {
      return false;
    }
  }

  parseWebhook(body: any, headers: Record<string, any>): IncomingMessage | null {
    try {
      const { from, message, to } = body;

      if (!from || !message) return null;

      return {
        externalUserId: from,
        userName: from,
        text: message,
        chatId: from,
        chatType: 'private',
        raw: body,
        metadata: { to },
      };
    } catch {
      return null;
    }
  }
}

export default SmsAdapter;