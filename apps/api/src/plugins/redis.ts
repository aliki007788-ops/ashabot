import fp from 'fastify-plugin';
import Redis from 'ioredis';
import { env } from '../env.js';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis | null;
  }
}

export default fp(async (app) => {
  const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    retryStrategy: () => null, // هیچ تلاش مجددی نکن
    lazyConnect: true,          // به صورت خودکار وصل نشو
    enableOfflineQueue: false,  // درخواست‌ها رو در صف نگه ندار
  });

  // جلوگیری از کرش کردن برنامه در صورت خطای اتصال
  redis.on('error', (err) => {
    // فقط یه بار لاگ کن، نه مدام
    if (!(redis as any).__errorLogged) {
      app.log.warn(`⚠️  Redis is not available: ${err.message}`);
      app.log.warn('⚠️  API will run without Redis (cache/queue features disabled).');
      (redis as any).__errorLogged = true;
    }
  });

  // تلاش برای اتصال، ولی اگه نشد، برنامه رو متوقف نکن
  try {
    await redis.connect();
    app.log.info('✅ Redis connected successfully.');
    app.decorate('redis', redis);
  } catch (err) {
    app.log.warn('⚠️  Could not connect to Redis. Continuing without it.');
    app.decorate('redis', null);
  }

  app.addHook('onClose', async () => {
    try {
      if (redis.status === 'ready') {
        await redis.quit();
      } else {
        redis.disconnect();
      }
    } catch {
      // نادیده بگیر
    }
  });
});