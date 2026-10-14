/**
 * Bootstrap دیتابیس production (در start:prod بعد از prisma db push اجرا می‌شود).
 *  - اگر دیتابیس خالی باشد: seed کامل (seed.ts → کانال‌ها → expand → premium) اجرا می‌شود.
 *  - همیشه: seed-new-clusters (idempotent) اجرا می‌شود تا خوشه‌های جدید به‌روز باشند.
 *  - هر مرحله‌ی ناموفق فقط لاگ می‌شود و سرور بالا می‌آید.
 * غیرفعال‌سازی: SKIP_BOOTSTRAP=1
 */
const { spawnSync } = require('child_process');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const root = path.join(__dirname, '..');
function run(cmd, args, useShell) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    shell: !!useShell && process.platform === 'win32',
  });
  if (r.status !== 0) console.warn(`⚠️  step failed: ${cmd} ${args.join(' ')}`);
  return r.status === 0;
}

(async () => {
  if (process.env.SKIP_BOOTSTRAP === '1') return;
  const prisma = new PrismaClient();
  let clusters = 0;
  try {
    clusters = await prisma.cluster.count();
  } catch (e) {
    console.warn('⚠️  bootstrap: cannot query DB', e.message);
    return;
  } finally {
    await prisma.$disconnect();
  }

  if (clusters === 0 || process.env.FORCE_SEED === '1') {
    console.log('[bootstrap] 🌱 دیتابیس خالی است؛ seed کامل اجرا می‌شود...');
    run('npx', ['tsx', 'prisma/seed.ts'], true);
    run(process.execPath, ['prisma/seed-channels.cjs']);
    run(process.execPath, ['prisma/seed-expand.cjs']);
    run(process.execPath, ['prisma/seed-premium-clusters.cjs']);
  }
  run(process.execPath, ['prisma/seed-new-clusters.cjs']);
})();
