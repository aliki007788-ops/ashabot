/**
 * Base Channel Adapter
 * کلاس پایه برای همه adapterهای کانال‌ها
 * 
 * @module channels/adapters/base
 * @version 1.0.0
 */

// ==================== TYPES ====================

export interface IncomingMessage {
  /** شناسه کاربر فرستنده در پلتفرم خارجی */
  externalUserId: string;
  /** نام کاربر */
  userName?: string;
  /** متن پیام */
  text: string;
  /** شناسه چت/کانال */
  chatId: string;
  /** نوع چت: private | group | channel */
  chatType: 'private' | 'group' | 'channel';
  /** داده خام دریافتی */
  raw?: any;
  /** متادیتای اضافی */
  metadata?: Record<string, any>;
}

export interface OutgoingMessage {
  /** شناسه چت مقصد */
  chatId: string;
  /** متن پیام */
  text: string;
  /** دکمه‌های inline */
  buttons?: Array<Array<{ text: string; url?: string; callbackData?: string }>>;
  /** دکمه‌های reply keyboard */
  keyboard?: string[][];
  /** پاسخ به پیام */
  replyToMessageId?: string;
  /** مارک‌داون: HTML | Markdown | MarkdownV2 */
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  /** متادیتای اضافی */
  metadata?: Record<string, any>;
}

export interface SendResult {
  /** آیا ارسال موفق بود */
  success: boolean;
  /** شناسه پیام ارسال‌شده */
  messageId?: string;
  /** پیام خطا */
  error?: string;
}

export interface WebhookSetupResult {
  /** آیا webhook تنظیم شد */
  success: boolean;
  /** URL وب‌هوک */
  webhookUrl?: string;
  /** پیام خطا */
  error?: string;
}

export interface ChannelCredentials {
  /** توکن ربات */
  botToken?: string;
  /** توکن دسترسی */
  accessToken?: string;
  /** شناسه اپ */
  appId?: string;
  /** کلید API */
  apiKey?: string;
  /** رمز امنیتی */
  secret?: string;
  /** مقادیر اضافی */
  [key: string]: string | undefined;
}

export interface ChannelAdapterConfig {
  /** شناسه اتصال در دیتابیس */
  connectionId: string;
  /** اعتبارنامه‌ها */
  credentials: ChannelCredentials;
  /** کانفیگ اضافه */
  config?: Record<string, any>;
  /** base URL برای webhook */
  webhookBaseUrl?: string;
}

// ==================== ABSTRACT ADAPTER ====================

export abstract class BaseChannelAdapter {
  /** نام کانال (مثلاً telegram, eitaa, ...) */
  public abstract readonly channelType: string;

  /** آیکون کانال */
  public abstract readonly icon: string;

  /** شناسه اتصال */
  protected connectionId: string;

  /** اعتبارنامه‌ها */
  protected credentials: ChannelCredentials;

  /** کانفیگ */
  protected config: Record<string, any>;

  /** Base URL برای webhook */
  protected webhookBaseUrl: string;

  constructor(adapterConfig: ChannelAdapterConfig) {
    this.connectionId = adapterConfig.connectionId;
    this.credentials = adapterConfig.credentials;
    this.config = adapterConfig.config || {};
    this.webhookBaseUrl = adapterConfig.webhookBaseUrl || process.env.API_BASE_URL || 'http://localhost:4000';
  }

  // ==================== ABSTRACT METHODS ====================

  /**
   * ارسال پیام از ربات به کاربر
   */
  abstract sendMessage(message: OutgoingMessage): Promise<SendResult>;

  /**
   * تنظیم webhook
   */
  abstract setupWebhook(): Promise<WebhookSetupResult>;

  /**
   * حذف webhook
   */
  abstract removeWebhook(): Promise<boolean>;

  /**
   * تست اتصال
   */
  abstract testConnection(): Promise<boolean>;

  // ==================== OPTIONAL METHODS ====================

  /**
   * پارس کردن پیام دریافتی از webhook
   * در هر adapter قابل override است
   */
  parseWebhook(body: any, headers: Record<string, any>): IncomingMessage | null {
    throw new Error(`parseWebhook باید در ${this.channelType} adapter پیاده‌سازی شود`);
  }

  /**
   * گرفتن اطلاعات ربات از پلتفرم
   */
  async getBotInfo(): Promise<Record<string, any> | null> {
    return null;
  }

  /**
   * حذف پیام
   */
  async deleteMessage(chatId: string, messageId: string): Promise<boolean> {
    return false;
  }

  /**
   * ویرایش پیام
   */
  async editMessage(
    chatId: string,
    messageId: string,
    text: string
  ): Promise<boolean> {
    return false;
  }

  // ==================== HELPERS ====================

  /**
   * ساخت URL وب‌هوک
   */
  protected getWebhookUrl(): string {
    return `${this.webhookBaseUrl}/api/webhooks/${this.channelType}/${this.connectionId}`;
  }

  /**
   * بررسی وجود اعتبارنامه لازم
   */
  protected requireCredential(key: keyof ChannelCredentials): string {
    const value = this.credentials[key];
    if (!value) {
      throw new Error(`اعتبارنامه ${String(key)} برای ${this.channelType} تنظیم نشده است`);
    }
    return value;
  }

  /**
   * لاگ امن (بدون نمایش اعتبارنامه)
   */
  protected safeLog(message: string, data?: Record<string, any>): void {
    const safeData = data ? { ...data } : undefined;
    if (safeData) {
      // حذف اعتبارنامه‌ها از لاگ
      ['botToken', 'accessToken', 'apiKey', 'secret'].forEach((key) => {
        if (safeData[key]) {
          safeData[key] = '***';
        }
      });
    }
    console.log(`[${this.channelType}:${this.connectionId}]`, message, safeData || '');
  }
}

// ==================== EXPORT ====================

export default BaseChannelAdapter;