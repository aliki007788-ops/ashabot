import { buildApp } from './app.js';
import { env } from './env.js';
import { logger } from './lib/logger.js';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Seed خودکار: مستقل از دستور استارت (Start Command) هر پلتفرمی اجرا می‌شود.
 * اگر دیتابیس خالی باشد seed کامل، و همیشه خوشه‌های جدید upsert می‌شوند.
 * غیرفعال‌سازی: SKIP_BOOTSTRAP=1
 */
function runBootstrap() {
  if (process.env.SKIP_BOOTSTRAP === '1') return;
  const here = path.dirname(fileURLToPath(import.meta.url));
  const script = path.resolve(here, '..', 'prisma', 'bootstrap.cjs');
  const child = spawn(process.execPath, [script], {
    cwd: path.resolve(here, '..'),
    stdio: 'inherit',
    env: process.env,
  });
  child.on('error', (e) => logger.warn(`bootstrap spawn failed: ${e.message}`));
  child.on('exit', (code) => logger.info(`bootstrap finished (exit ${code})`));
}

async function main() {
  const app = await buildApp();
  try {
    await app.listen({ port: env.API_PORT, host: env.API_HOST });
    logger.info(`🚀 API listening on http://${env.API_HOST}:${env.API_PORT}`);
    runBootstrap();
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
