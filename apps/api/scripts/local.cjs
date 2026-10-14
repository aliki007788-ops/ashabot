// اجرای لوکال بدون Docker و بدون PostgreSQL: با SQLite
const fs = require('fs');
const path = require('path');
const { spawnSync, spawn } = require('child_process');
const root = path.join(__dirname, '..');
const isWin = process.platform === 'win32';
const src = fs.readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8');
fs.writeFileSync(
  path.join(root, 'prisma/schema.local.prisma'),
  src.replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"'),
);
process.env.DATABASE_URL = 'file:./local.db';
// اگر دیتابیس لوکال قدیمی (dev.db) موجود است و local.db هنوز ساخته نشده، از روی آن شروع کن
const devDb = path.join(root, 'prisma/dev.db');
const localDb = path.join(root, 'prisma/local.db');
if (!fs.existsSync(localDb) && fs.existsSync(devDb)) {
  fs.copyFileSync(devDb, localDb);
  console.log('[local] copied dev.db -> local.db (existing data kept)');
}
function run(args) {
  const r = spawnSync('pnpm', ['exec', ...args], { cwd: root, stdio: 'inherit', shell: isWin, env: process.env });
  if (r.status !== 0) process.exit(r.status || 1);
}
console.log('[local] generating sqlite client...');
run(['prisma', 'generate', '--schema', 'prisma/schema.local.prisma']);
console.log('[local] creating tables...');
run(['prisma', 'db', 'push', '--skip-generate', '--schema', 'prisma/schema.local.prisma']);
console.log('[local] starting API...');
const p = spawn('pnpm', ['exec', 'tsx', 'watch', 'src/server.ts'], { cwd: root, stdio: 'inherit', shell: isWin, env: process.env });
p.on('exit', (c) => process.exit(c || 0));
