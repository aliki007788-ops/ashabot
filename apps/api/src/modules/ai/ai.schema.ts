import { z } from 'zod';

export const chatSchema = z.object({
  botId: z.string().min(1),
  sessionId: z.string().min(1).max(120),
  message: z.string().min(1).max(8000),
  channelId: z.string().optional(),
});

export const listConversationsSchema = z.object({
  botId: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
