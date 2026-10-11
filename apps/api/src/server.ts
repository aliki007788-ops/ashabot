import { buildApp } from './app.js';
import { env } from './env.js';
import { logger } from './lib/logger.js';

async function main() {
  const app = await buildApp();
  try {
    await app.listen({ port: env.API_PORT, host: env.API_HOST });
    logger.info(`🚀 API listening on http://${env.API_HOST}:${env.API_PORT}`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }

  const shutdown = async () => {
    logger.info('Shutting down…');
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
