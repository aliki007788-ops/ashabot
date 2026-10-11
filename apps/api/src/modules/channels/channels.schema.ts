/**
 * Channels Schema
 * Zod schemas برای اعتبارسنجی داده‌های کانال‌ها
 * 
 * @module channels/channels.schema
 * @version 1.1.0
 */

import { z } from 'zod';

// ==================== CONSTANTS ====================

export const CHANNEL_TYPES = [
  'eitaa',
  'telegram',
  'whatsapp',
  'webchat',
  'bale',
  'rubika',
  'soroush',
  'instagram',
] as const;

export const CHANNEL_TYPE_LABELS: Record<string, string> = {
  eitaa: 'ایتا',
  telegram: 'تلگرام',
  whatsapp: 'واتساپ',
  webchat: 'وب‌چت',
  bale: 'بله',
  rubika: 'روبیکا',
  soroush: 'سروش پلاس',
  instagram: 'اینستاگرام',
};

// ==================== BASE SCHEMAS ====================

/**
 * Schema برای credentials
 * اجازه می‌دهد خالی باشد (برای webchat)
 */
export const credentialsSchema = z
  .record(z.string(), z.string())
  .optional()
  .default({});

/**
 * Schema برای config (JSON object)
 */
export const configSchema = z.record(z.string(), z.any()).optional();

/**
 * Schema برای نوع کانال
 */
export const channelTypeSchema = z.enum(CHANNEL_TYPES, {
  errorMap: () => ({ message: 'نوع کانال نامعتبر است' }),
});

// ==================== CREATE SCHEMA ====================

export const createConnectionSchema = z.object({
  channelType: channelTypeSchema,

  botId: z.string().min(1, 'شناسه ربات الزامی است'),

  channelName: z
    .string()
    .min(2, 'نام کانال حداقل ۲ کاراکتر')
    .max(100, 'نام کانال حداکثر ۱۰۰ کاراکتر')
    .optional(),

  credentials: credentialsSchema,

  config: configSchema,

  webhookBaseUrl: z.string().url('URL نامعتبر').optional(),

  isActive: z.boolean().optional().default(false),
});

export type CreateConnectionInput = z.infer<typeof createConnectionSchema>;

// ==================== UPDATE SCHEMA ====================

export const updateConnectionSchema = z.object({
  credentials: credentialsSchema,

  config: configSchema,

  isActive: z.boolean().optional(),

  metadata: z.record(z.string(), z.any()).optional(),
});

export type UpdateConnectionInput = z.infer<typeof updateConnectionSchema>;

// ==================== BOT CONNECT SCHEMA ====================

export const connectBotToChannelSchema = z.object({
  botId: z.string().min(1, 'شناسه ربات الزامی است'),

  channelId: z.string().min(1, 'شناسه کانال الزامی است'),

  credentials: credentialsSchema,

  config: configSchema,
});

export type ConnectBotToChannelInput = z.infer<
  typeof connectBotToChannelSchema
>;

// ==================== SEND MESSAGE SCHEMA ====================

export const sendChannelMessageSchema = z.object({
  connectionId: z.string().min(1, 'شناسه اتصال الزامی است'),

  chatId: z.string().min(1, 'شناسه چت الزامی است'),

  text: z
    .string()
    .min(1, 'متن پیام نمی‌تواند خالی باشد')
    .max(4096, 'متن پیام حداکثر ۴۰۹۶ کاراکتر'),

  parseMode: z
    .enum(['HTML', 'Markdown', 'MarkdownV2'])
    .optional()
    .default('HTML'),

  replyToMessageId: z.string().optional(),

  buttons: z
    .array(
      z.array(
        z.object({
          text: z.string().min(1).max(64),
          url: z.string().url().optional(),
          callbackData: z.string().max(64).optional(),
        })
      )
    )
    .optional(),
});

export type SendChannelMessageInput = z.infer<
  typeof sendChannelMessageSchema
>;

// ==================== CHANNEL FILTERS ====================

export const listConnectionsQuerySchema = z.object({
  botId: z.string().optional(),

  channelId: z.string().optional(),

  channelType: channelTypeSchema.optional(),

  isActive: z
    .union([z.string(), z.boolean()])
    .transform((val) => (typeof val === 'string' ? val === 'true' : val))
    .optional(),

  page: z
    .union([z.string(), z.number()])
    .transform((val) => parseInt(String(val), 10))
    .refine((val) => val > 0, 'شماره صفحه باید مثبت باشد')
    .optional()
    .default(1),

  limit: z
    .union([z.string(), z.number()])
    .transform((val) => parseInt(String(val), 10))
    .refine((val) => val > 0 && val <= 100, 'حداکثر ۱۰۰ مورد در هر صفحه')
    .optional()
    .default(20),
});

export type ListConnectionsQuery = z.infer<typeof listConnectionsQuerySchema>;

// ==================== BOT ID SCHEMA ====================

export const botIdParamSchema = z.object({
  botId: z.string().min(1, 'شناسه ربات الزامی است'),
});

export const connectionIdParamSchema = z.object({
  connectionId: z.string().min(1, 'شناسه اتصال الزامی است'),
});

export const channelIdParamSchema = z.object({
  channelId: z.string().min(1, 'شناسه کانال الزامی است'),
});

// ==================== BROADCAST SCHEMA ====================

export const broadcastSchema = z.object({
  botId: z.string().min(1, 'شناسه ربات الزامی است'),

  text: z
    .string()
    .min(1, 'متن پیام نمی‌تواند خالی باشد')
    .max(4096, 'متن پیام حداکثر ۴۰۹۶ کاراکتر'),

  parseMode: z
    .enum(['HTML', 'Markdown', 'MarkdownV2'])
    .optional()
    .default('HTML'),
});

export type BroadcastInput = z.infer<typeof broadcastSchema>;

// ==================== RESPONSE SCHEMAS ====================

export const connectionResponseSchema = z.object({
  id: z.string(),
  channelId: z.string(),
  botId: z.string(),
  externalId: z.string().nullable(),
  webhookUrl: z.string().nullable(),
  isActive: z.boolean(),
  metadata: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  channel: z
    .object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      type: z.string(),
      icon: z.string(),
      isConnected: z.boolean(),
    })
    .optional(),
  bot: z
    .object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      icon: z.string(),
    })
    .optional(),
});

// ==================== HELPER FUNCTIONS ====================

/**
 * دریافت برچسب فارسی نوع کانال
 */
export function getChannelLabel(type: string): string {
  return CHANNEL_TYPE_LABELS[type] || type;
}

/**
 * بررسی اینکه نوع کانال پشتیبانی می‌شود
 */
export function isValidChannelType(type: string): boolean {
  return (CHANNEL_TYPES as readonly string[]).includes(type);
}

// ==================== EXPORTS ====================

export default {
  CHANNEL_TYPES,
  CHANNEL_TYPE_LABELS,
  credentialsSchema,
  configSchema,
  channelTypeSchema,
  createConnectionSchema,
  updateConnectionSchema,
  connectBotToChannelSchema,
  sendChannelMessageSchema,
  listConnectionsQuerySchema,
  botIdParamSchema,
  connectionIdParamSchema,
  channelIdParamSchema,
  broadcastSchema,
  connectionResponseSchema,
  getChannelLabel,
  isValidChannelType,
};