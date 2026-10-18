/**
 * pnpm kit:check  — در CI اجرا می‌شود.
 * اگر _kit یک میزکار با نسخه‌ی اصلی فرق داشته باشد (دست‌کاری یا sync نشدن)، خطا می‌دهد.
 */
const { kitSrc, wsRoot, checksum, kitVersion, workspaces, fs, path } = require('./kit-lib.cjs');

const want = checksum(kitSrc);
const version = kitVersion();
let bad = 0;
for (const slug of workspaces()) {
  const dir = path.join(wsRoot, slug, '_kit');
  const metaFile = path.join(dir, '.kit-meta.json');
  if (!fs.existsSync(metaFile)) {
    console.error(`✘ ${slug}: _kit وجود ندارد`);
    bad++;
    continue;
  }
  const have = checksum(dir);
  const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
  if (have !== want || meta.checksum !== want || meta.version !== version) {
    console.error(`✘ ${slug}: _kit با نسخه‌ی اصلی (${version}) یکسان نیست — «pnpm kit:sync» را اجرا کنید`);
    bad++;
  } else {
    console.log(`✔ ${slug}  kit ${version}`);
  }
}
if (bad) process.exit(1);
console.log('همه‌ی میزکارها با کیت اصلی یکسان‌اند.');
