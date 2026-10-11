import { z } from 'zod';

export const createBotSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().max(8).default('🤖'),
  systemPrompt: z.string().min(10).max(8000),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().min(64).max(8000).default(1024),
  model: z.string().default('gpt-4o-mini'),
  clusterId: z.string().optional().nullable(),
  brainIds: z.array(z.string()).optional(),
});

export const updateBotSchema = createBotSchema.partial();

export const listBotsSchema = z.object({
  q: z.string().optional(),
  clusterId: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
});
