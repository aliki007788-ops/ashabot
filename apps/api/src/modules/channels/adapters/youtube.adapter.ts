/**
 * YouTube Channel Adapter
 * آداپتور کانال یوتیوب (Live Chat + Comments)
 *
 * @module channels/adapters/youtube
 * @version 1.0.0
 */

import {
  BaseChannelAdapter,
  IncomingMessage,
  OutgoingMessage,
  SendResult,
  WebhookSetupResult,
} from './base.adapter.js';

export class YouTubeAdapter extends BaseChannelAdapter {
  public readonly channelType = 'youtube';
  public readonly icon = '▶️';

  private readonly apiBase = 'https://www.googleapis.com/youtube/v3';

  async sendMessage(message: OutgoingMessage): Promise<SendResult> {
    try {
      const accessToken = this.requireCredential('accessToken');

      // YouTube Live Chat API — chatId = liveChatId
      const url = `${this.apiBase}/liveChat/messages?part=snippet`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snippet: {
            liveChatId: message.chatId,
            type: 'textMessageEvent',
            textMessageDetails: {
              messageText: message.text.slice(0, 200),
            },
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      const data = (await response.json()) as any;
      this.safeLog('پیام یوتیوب ارسال شد', { to: message.chatId });

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
      const accessToken = this.requireCredential('accessToken');
      const webhookUrl = this.getWebhookUrl();

      // YouTube Push Notifications (PubSubHubbub)
      const url = 'https://pubsubhubbub.appspot.com/subscribe';

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          'hub.mode': 'subscribe',
          'hub.topic': `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${this.config.channelId}`,
          'hub.callback': webhookUrl,
          'hub.verify': 'async',
        }).toString(),
      });

      if (!response.ok) {
        return { success: false, error: 'خطا در ثبت webhook' };
      }

      return { success: true, webhookUrl };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'خطای ناشناخته';
      return { success: false, error: msg };
    }
  }

  async removeWebhook(): Promise<boolean> {
    try {
      const url = 'https://pubsubhubbub.appspot.com/unsubscribe';
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          'hub.mode': 'unsubscribe',
          'hub.topic': `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${this.config.channelId}`,
          'hub.callback': this.getWebhookUrl(),
        }).toString(),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const apiKey = this.requireCredential('apiKey');
      const response = await fetch(
        `${this.apiBase}/channels?part=snippet&mine=true&key=${apiKey}`,
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  parseWebhook(body: any, headers: Record<string, any>): IncomingMessage | null {
    try {
      // XML parse (PubSubHubbub) — body معمولاً XML هست
      const xmlString = typeof body === 'string' ? body : body?.toString?.() || '';

      // استخراج ساده (بهتره با xml2js پارس بشه)
      const authorMatch = xmlString.match(/<name>(.*?)<\/name>/);
      const titleMatch = xmlString.match(/<title>(.*?)<\/title>/);
      const videoIdMatch = xmlString.match(/<yt:videoId>(.*?)<\/yt:videoId>/);

      if (!videoIdMatch) return null;

      return {
        externalUserId: authorMatch?.[1] || 'youtube-user',
        userName: authorMatch?.[1] || 'کاربر یوتیوب',
        text: titleMatch?.[1] || 'ویدیو جدید',
        chatId: videoIdMatch[1],
        chatType: 'channel',
        raw: body,
      };
    } catch {
      return null;
    }
  }
}

export default YouTubeAdapter;