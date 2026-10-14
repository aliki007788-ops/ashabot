import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { env } from './env.js';
import { logger } from './lib/logger.js';
import prismaPlugin from './plugins/prisma.js';
import redisPlugin from './plugins/redis.js';
import authPlugin from './plugins/auth.js';
import errorHandler from './plugins/error-handler.js';
import socketPlugin from './plugins/socket.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { aiRoutes } from './modules/ai/ai.routes.js';
import { botsRoutes } from './modules/bots/bots.routes.js';
import { botStatsRoutes } from './modules/bots/bots.stats.js';
import { clustersRoutes } from './modules/clusters/clusters.routes.js';
import { clusterStatsRoutes } from './modules/clusters/clusters.stats.js';
import { brainsRoutes } from './modules/brains/brains.routes.js';
import { channelsRoutes } from './modules/channels/channels.routes.js';
import { channelsListRoutes } from './modules/channels/channels.list.js';
import { channelsConfigRoutes } from './modules/channels/channels.config.js';
import { webhooksRoutes } from './modules/channels/webhooks.routes.js';
import { activityRoutes } from './modules/activity/activity.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { knowledgeRoutes } from './modules/knowledge/knowledge.routes.js';
import { inboxRoutes } from './modules/inbox/inbox.routes.js';
import { crmRoutes } from './modules/crm/crm.routes.js';
import { bookingsRoutes } from './modules/bookings/bookings.routes.js';
import { paymentsRoutes } from './modules/payments/payments.routes.js';
import { workflowsRoutes } from './modules/workflows/workflows.routes.js';
import { marketplaceRoutes } from './modules/marketplace/marketplace.routes.js';
import { evalsRoutes } from './modules/evals/evals.routes.js';
import { TOOL_NAMES } from './modules/tools/tools.registry.js';
import { WebChatAdapter } from './modules/channels/adapters/webchat.adapter.js';
import { adminImportRoutes } from './modules/admin/import.routes.js';

export async function buildApp() {
  const app = Fastify({
    loggerInstance: logger,
    trustProxy: true,
  });

  // ==================== CORE PLUGINS ====================
  await app.register(helmet, { contentSecurityPolicy: false });

  // ==================== CORS ====================
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:4000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:4000',
  ];

  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin || origin === 'null') {
        return callback(null, true);
      }

      if (env.NODE_ENV === 'development' || !env.NODE_ENV) {
        return callback(null, true);
      }

      const configured = env.CORS_ORIGIN.split(',').map((s) => s.trim().replace(/\/$/, ''));
      if (
        configured.includes('*') ||
        allowedOrigins.includes(origin) ||
        configured.includes(origin.replace(/\/$/, ''))
      ) {
        return callback(null, true);
      }

      app.log.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['Content-Length', 'X-Request-Id'],
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  await app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
  });

  // ==================== INFRA PLUGINS ====================
  await app.register(errorHandler);
  await app.register(prismaPlugin);
  await app.register(redisPlugin);
  await app.register(authPlugin);
  await app.register(socketPlugin);

  // ==================== INITIALIZE WEBCHAT SOCKET HANDLERS ====================
  WebChatAdapter.initSocketIO(app.io);

  // ==================== HEALTH CHECK ====================
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  // Ø¢Ù…Ø§Ø± Ø³Ø±ÛŒØ¹ Ø¨Ø±Ø§ÛŒ Ø¹ÛŒØ¨â€ŒÛŒØ§Ø¨ÛŒ Ø¯ÛŒÙ¾Ù„ÙˆÛŒ (Ø¹Ù…ÙˆÙ…ÛŒØŒ Ø¨Ø¯ÙˆÙ† Ø¯Ø§Ø¯Ù‡ Ø­Ø³Ø§Ø³)
  app.get('/api/meta', async () => {
    const [clusters, bots, templates] = await Promise.all([
      app.prisma.cluster.count(),
      app.prisma.bot.count(),
      app.prisma.bot.count({ where: { userId: null } }),
    ]);
    return { clusters, bots, templates, version: '2.0.0' };
  });

  app.get('/', async () => ({
    name: 'ashabot-api',
    status: 'running',
    health: '/health',
  }));

  // ==================== API ROUTES ====================
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(aiRoutes, { prefix: '/api/ai' });
  await app.register(botsRoutes, { prefix: '/api/bots' });
  await app.register(botStatsRoutes, { prefix: '/api/bots' });
  await app.register(clustersRoutes, { prefix: '/api/clusters' });
  await app.register(clusterStatsRoutes, { prefix: '/api/clusters' });
  await app.register(brainsRoutes, { prefix: '/api/brains' });
  await app.register(channelsRoutes, { prefix: '/api/channels' });
  await app.register(channelsListRoutes, { prefix: '/api/channels' });
  await app.register(channelsConfigRoutes, { prefix: '/api/channels' });
  await app.register(activityRoutes, { prefix: '/api/activity' });
  await app.register(dashboardRoutes, { prefix: '/api/dashboard' });

  // ==================== NEW MODULES ====================
  await app.register(knowledgeRoutes, { prefix: '/api/knowledge' });
  await app.register(inboxRoutes, { prefix: '/api/inbox' });
  await app.register(crmRoutes, { prefix: '/api/crm' });
  await app.register(bookingsRoutes, { prefix: '/api/bookings' });
  await app.register(paymentsRoutes, { prefix: '/api/payments' });
  await app.register(workflowsRoutes, { prefix: '/api/workflows' });
  await app.register(marketplaceRoutes, { prefix: '/api/marketplace' });
  await app.register(evalsRoutes, { prefix: '/api/evals' });
  app.get('/api/tools', async () => ({ items: TOOL_NAMES }));

  // ==================== WEBHOOK ROUTES ====================
  await app.register(webhooksRoutes, { prefix: '/api/webhooks' });

  // ==================== TEMP: Admin Import (remove after use) ====================
  await app.register(adminImportRoutes, { prefix: '/api/admin' });

  return app;
}
