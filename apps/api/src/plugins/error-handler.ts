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
      return reply.code((error as any).statusCode).send({ error: error.message });
    }
    logger.error({ err: error, url: request.url }, 'Unhandled error');
    reply.code(500).send({ error: 'Internal server error' });
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.code(404).send({ error: 'Route not found' });
  });
});
