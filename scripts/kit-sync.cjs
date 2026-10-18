/**
 * pnpm kit:sync
 * نسخه‌ی اصلی کیت (workspace-kit/src) را داخل _kit/ همه‌ی میزکارها کپی می‌کند.
 * فقط همین‌جا ویرایش کنید؛ فایل‌های داخل _kit/ را هرگز دستی تغییر ندهید.
 */
const { kitSrc, wsRoot, checksum, kitVersion, workspaces, fs, path } = require('./kit-lib.cjs');

const version = kitVersion();
const sum = checksum(kitSrc);
const list = workspaces();
if (!list.length) {
  console.log('هیچ میزکاری پیدا نشد.');
  process.exit(0);
}
for (const slug of list) {
  const dest = path.join(wsRoot, slug, '_kit');
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(kitSrc, dest, { recursive: true });
  fs.writeFileSync(
    path.join(dest, '.kit-meta.json'),
    JSON.stringify({ kit: 'workspace-kit', version, checksum: sum }, null, 2) + '\n',
  );
  console.log(`✔ ${slug}  ←  kit ${version} (${sum})`);
}
console.log(`\n${list.length} میزکار هم‌گام شد.`);
