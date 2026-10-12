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
import { WebChatAdapter } from './modules/channels/adapters/webchat.adapter.js';

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

      if (
        allowedOrigins.includes(origin) ||
        env.CORS_ORIGIN.split(',').map((s) => s.trim()).includes(origin)
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

  // ==================== WEBHOOK ROUTES ====================
  await app.register(webhooksRoutes, { prefix: '/api/webhooks' });

  return app;
}
