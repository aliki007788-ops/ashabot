/**
 * Channel Adapters Registry
 * ثبت و مدیریت همه adapterهای کانال
 *
 * @module channels/adapters
 * @version 1.0.0
 */

import { BaseChannelAdapter, ChannelAdapterConfig } from './base.adapter.js';
import { EitaaAdapter } from './eitaa.adapter.js';
import { TelegramAdapter } from './telegram.adapter.js';
import { WhatsAppAdapter } from './whatsapp.adapter.js';
import { WebChatAdapter } from './webchat.adapter.js';
import { BaleAdapter } from './bale.adapter.js';
import { RubikaAdapter } from './rubika.adapter.js';
import { SoroushAdapter } from './soroush.adapter.js';
import { InstagramAdapter } from './instagram.adapter.js';
import { GapAdapter } from './gap.adapter.js';
import { EmailAdapter } from './email.adapter.js';
import { SmsAdapter } from './sms.adapter.js';
import { TwitterAdapter } from './twitter.adapter.js';
import { LinkedInAdapter } from './linkedin.adapter.js';
import { YouTubeAdapter } from './youtube.adapter.js';
import { FacebookAdapter } from './facebook.adapter.js';

// ==================== TYPES ====================

export type ChannelType =
  | 'eitaa'
  | 'telegram'
  | 'whatsapp'
  | 'webchat'
  | 'bale'
  | 'rubika'
  | 'soroush'
  | 'instagram'
  | 'gap'
  | 'email'
  | 'sms'
  | 'twitter'
  | 'linkedin'
  | 'youtube'
  | 'facebook';

export type ChannelCategory = 'IRANIAN' | 'FOREIGN' | 'INTERNAL';

export interface AdapterInfo {
  type: ChannelType;
  name: string;
  icon: string;
  description: string;
  category: ChannelCategory;
  fields: Array<{
    key: string;
    label: string;
    type: 'text' | 'password' | 'url';
    required: boolean;
    placeholder?: string;
    help?: string;
  }>;
  docs?: string;
}

// ==================== ADAPTER MAP ====================

const ADAPTER_MAP: Record<
  ChannelType,
  new (config: ChannelAdapterConfig) => BaseChannelAdapter
> = {
  eitaa: EitaaAdapter,
  telegram: TelegramAdapter,
  whatsapp: WhatsAppAdapter,
  webchat: WebChatAdapter,
  bale: BaleAdapter,
  rubika: RubikaAdapter,
  soroush: SoroushAdapter,
  instagram: InstagramAdapter,
  gap: GapAdapter,
  email: EmailAdapter,
  sms: SmsAdapter,
  twitter: TwitterAdapter,
  linkedin: LinkedInAdapter,
  youtube: YouTubeAdapter,
  facebook: FacebookAdapter,
};

// ==================== ADAPTER INFO ====================

const ADAPTER_INFO: AdapterInfo[] = [
  // ============ کانال‌های ایرانی ============
  {
    type: 'eitaa',
    name: 'ایتا',
    icon: '📡',
    description: 'پیام‌رسان ایرانی ایتا',
    category: 'IRANIAN',
    fields: [
      {
        key: 'botToken',
        label: 'توکن ربات',
        type: 'password',
        required: true,
        placeholder: 'مثال: 123456:ABC-DEF...',
        help: 'توکن را از @botfather در ایتا دریافت کنید',
      },
      {
        key: 'secret',
        label: 'Secret Token (اختیاری)',
        type: 'password',
        required: false,
        help: 'برای امنیت webhook',
      },
    ],
    docs: 'https://eitaa.com/api',
  },
  {
    type: 'bale',
    name: 'بله',
    icon: '🔵',
    description: 'پیام‌رسان ایرانی بله',
    category: 'IRANIAN',
    fields: [
      {
        key: 'botToken',
        label: 'توکن ربات',
        type: 'password',
        required: true,
        placeholder: '123456:ABC...',
        help: 'از @botfather در بله دریافت کنید',
      },
    ],
    docs: 'https://docs.bale.ai',
  },
  {
    type: 'rubika',
    name: 'روبیکا',
    icon: '🟣',
    description: 'پیام‌رسان ایرانی روبیکا',
    category: 'IRANIAN',
    fields: [
      {
        key: 'botToken',
        label: 'توکن ربات',
        type: 'password',
        required: true,
        placeholder: 'ABC123...',
        help: 'از پنل ربات‌های روبیکا دریافت کنید',
      },
    ],
    docs: 'https://rubika.ir/bots/docs',
  },
  {
    type: 'soroush',
    name: 'سروش پلاس',
    icon: '🔴',
    description: 'پیام‌رسان ایرانی سروش پلاس',
    category: 'IRANIAN',
    fields: [
      {
        key: 'botToken',
        label: 'توکن ربات',
        type: 'password',
        required: true,
        placeholder: '123456:ABC...',
        help: 'از @botfather در سروش پلاس دریافت کنید',
      },
      {
        key: 'secret',
        label: 'Secret Token (اختیاری)',
        type: 'password',
        required: false,
      },
    ],
    docs: 'https://splus.ir',
  },
  {
    type: 'gap',
    name: 'گپ',
    icon: '🟡',
    description: 'پیام‌رسان ایرانی گپ',
    category: 'IRANIAN',
    fields: [
      {
        key: 'botToken',
        label: 'توکن ربات',
        type: 'password',
        required: true,
        placeholder: 'ABC123...',
        help: 'از پنل ربات‌های گپ دریافت کنید',
      },
    ],
    docs: 'https://gap.im',
  },

  // ============ کانال‌های خارجی ============
  {
    type: 'telegram',
    name: 'تلگرام',
    icon: '✈️',
    description: 'پیام‌رسان تلگرام',
    category: 'FOREIGN',
    fields: [
      {
        key: 'botToken',
        label: 'Bot Token',
        type: 'password',
        required: true,
        placeholder: '123456789:ABC...',
        help: 'از @BotFather دریافت کنید',
      },
      {
        key: 'secret',
        label: 'Secret Token (اختیاری)',
        type: 'password',
        required: false,
        help: 'برای امنیت webhook',
      },
    ],
    docs: 'https://core.telegram.org/bots/api',
  },
  {
    type: 'whatsapp',
    name: 'واتساپ',
    icon: '💬',
    description: 'WhatsApp Business API',
    category: 'FOREIGN',
    fields: [
      {
        key: 'accessToken',
        label: 'Access Token',
        type: 'password',
        required: true,
        help: 'از Facebook Developer Console',
      },
      {
        key: 'appId',
        label: 'Phone Number ID',
        type: 'text',
        required: true,
        placeholder: '1234567890',
        help: 'Phone Number ID از Meta Business',
      },
      {
        key: 'secret',
        label: 'Verify Token',
        type: 'password',
        required: false,
        help: 'برای webhook verification',
      },
    ],
    docs: 'https://developers.facebook.com/docs/whatsapp/cloud-api',
  },
  {
    type: 'instagram',
    name: 'اینستاگرام',
    icon: '📷',
    description: 'Instagram Business API',
    category: 'FOREIGN',
    fields: [
      {
        key: 'accessToken',
        label: 'Access Token',
        type: 'password',
        required: true,
        help: 'از Facebook Developer Console',
      },
      {
        key: 'appId',
        label: 'Page ID',
        type: 'text',
        required: true,
        placeholder: '1234567890',
        help: 'Instagram Business Account ID',
      },
      {
        key: 'secret',
        label: 'Verify Token',
        type: 'password',
        required: false,
      },
    ],
    docs: 'https://developers.facebook.com/docs/instagram-api',
  },
  {
    type: 'twitter',
    name: 'توییتر / X',
    icon: '🐦',
    description: 'Twitter / X DM API',
    category: 'FOREIGN',
    fields: [
      {
        key: 'accessToken',
        label: 'Access Token',
        type: 'password',
        required: true,
        help: 'از Twitter Developer Portal',
      },
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: false,
      },
    ],
    docs: 'https://developer.twitter.com',
  },
  {
    type: 'linkedin',
    name: 'لینکدین',
    icon: '💼',
    description: 'LinkedIn Messaging API',
    category: 'FOREIGN',
    fields: [
      {
        key: 'accessToken',
        label: 'Access Token',
        type: 'password',
        required: true,
        help: 'از LinkedIn Developer Portal',
      },
    ],
    docs: 'https://developer.linkedin.com',
  },
  {
    type: 'youtube',
    name: 'یوتیوب',
    icon: '▶️',
    description: 'YouTube Live Chat + Comments',
    category: 'FOREIGN',
    fields: [
      {
        key: 'accessToken',
        label: 'OAuth Access Token',
        type: 'password',
        required: true,
      },
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: false,
      },
      {
        key: 'channelId',
        label: 'Channel ID',
        type: 'text',
        required: true,
        placeholder: 'UC...',
      },
    ],
    docs: 'https://developers.google.com/youtube',
  },
  {
    type: 'facebook',
    name: 'فیسبوک',
    icon: '👤',
    description: 'Facebook Messenger API',
    category: 'FOREIGN',
    fields: [
      {
        key: 'accessToken',
        label: 'Page Access Token',
        type: 'password',
        required: true,
      },
      {
        key: 'appId',
        label: 'Page ID',
        type: 'text',
        required: true,
        placeholder: '1234567890',
      },
      {
        key: 'secret',
        label: 'Verify Token',
        type: 'password',
        required: false,
      },
    ],
    docs: 'https://developers.facebook.com/docs/messenger-platform',
  },
  {
    type: 'email',
    name: 'ایمیل',
    icon: '📧',
    description: 'ارسال و دریافت ایمیل',
    category: 'FOREIGN',
    fields: [
      {
        key: 'apiKey',
        label: 'Resend API Key',
        type: 'password',
        required: true,
        placeholder: 're_...',
        help: 'از resend.com دریافت کنید',
      },
      {
        key: 'fromEmail',
        label: 'ایمیل فرستنده',
        type: 'text',
        required: true,
        placeholder: 'noreply@yourdomain.com',
      },
    ],
    docs: 'https://resend.com/docs',
  },
  {
    type: 'sms',
    name: 'پیامک',
    icon: '📱',
    description: 'ارسال پیامک (Kavenegar / TSMS)',
    category: 'FOREIGN',
    fields: [
      {
        key: 'provider',
        label: 'پروایدر',
        type: 'text',
        required: true,
        placeholder: 'kavenegar',
        help: 'kavenegar یا tsms',
      },
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
      },
      {
        key: 'sender',
        label: 'شماره فرستنده',
        type: 'text',
        required: true,
        placeholder: '10008663',
      },
    ],
    docs: 'https://kavenegar.com/rest.html',
  },

  // ============ کانال داخلی ============
  {
    type: 'webchat',
    name: 'وب‌چت',
    icon: '🌐',
    description: 'چت داخلی روی وب‌سایت',
    category: 'INTERNAL',
    fields: [],
    docs: '#',
  },
];

// ==================== FACTORY ====================

/**
 * ساخت adapter بر اساس نوع و کانفیگ
 */
export function createAdapter(
  type: ChannelType,
  config: ChannelAdapterConfig,
): BaseChannelAdapter {
  const AdapterClass = ADAPTER_MAP[type];

  if (!AdapterClass) {
    throw new Error(`نوع کانال "${type}" پشتیبانی نمی‌شود`);
  }

  return new AdapterClass(config);
}

/**
 * دریافت اطلاعات همه adapterها
 */
export function getAdaptersInfo(): AdapterInfo[] {
  return ADAPTER_INFO;
}

/**
 * دریافت اطلاعات یک adapter خاص
 */
export function getAdapterInfo(type: ChannelType): AdapterInfo | null {
  return ADAPTER_INFO.find((info) => info.type === type) || null;
}

/**
 * بررسی پشتیبانی از یک کانال
 */
export function isSupportedChannel(type: string): type is ChannelType {
  return type in ADAPTER_MAP;
}

/**
 * دریافت لیست همه کانال‌های پشتیبانی‌شده
 */
export function getSupportedChannels(): ChannelType[] {
  return Object.keys(ADAPTER_MAP) as ChannelType[];
}

/**
 * دریافت کانال‌ها بر اساس دسته‌بندی
 */
export function getChannelsByCategory(category: ChannelCategory): AdapterInfo[] {
  return ADAPTER_INFO.filter((info) => info.category === category);
}

// ==================== EXPORTS ====================

export {
  BaseChannelAdapter,
  EitaaAdapter,
  TelegramAdapter,
  WhatsAppAdapter,
  WebChatAdapter,
  BaleAdapter,
  RubikaAdapter,
  SoroushAdapter,
  InstagramAdapter,
  GapAdapter,
  EmailAdapter,
  SmsAdapter,
  TwitterAdapter,
  LinkedInAdapter,
  YouTubeAdapter,
  FacebookAdapter,
};

export type { ChannelAdapterConfig };

// ==================== DEFAULT EXPORT ====================

export default {
  createAdapter,
  getAdaptersInfo,
  getAdapterInfo,
  isSupportedChannel,
  getSupportedChannels,
  getChannelsByCategory,
};