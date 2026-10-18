import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import { logger } from '../lib/logger.js';

export default fp(async (app) => {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: 'Validation failed',
        issues: error.flatten().fieldErrors,
      });
    }
    if ((error as any).statusCode && (error as any).statusCode < 500) {
      return reply.code((error as any).statusCode).send({ error: (error as any).message });
    }
    logger.error({ err: error, url: request.url }, 'Unhandled error');
    const msg = String((error as any)?.message || '');
    if (/API_KEY is required/i.test(msg)) {
      return reply.code(503).send({
        error: 'کلید هوش مصنوعی تنظیم نشده است. در فایل apps/api/.env مقدار OPENAI_API_KEY (یا GEMINI_API_KEY / ANTHROPIC_API_KEY) را بگذارید و API را دوباره اجرا کنید.',
      });
    }
    if (/incorrect api key|invalid api key|api key not valid|401|unauthorized|permission/i.test(msg)) {
      return reply.code(502).send({ error: 'کلید هوش مصنوعی نامعتبر است یا اجازه دسترسی ندارد.' });
    }
    if (/quota|rate limit|429|insufficient/i.test(msg)) {
      return reply.code(502).send({ error: 'اعتبار یا سهمیه کلید هوش مصنوعی تمام شده است.' });
    }
    if (/fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|network/i.test(msg)) {
      return reply.code(502).send({ error: 'اتصال به سرویس هوش مصنوعی برقرار نشد (اینترنت/فیلترشکن را بررسی کنید).' });
    }
    reply.code(500).send({ error: 'Internal server error' });
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.code(404).send({ error: 'Route not found' });
  });
});