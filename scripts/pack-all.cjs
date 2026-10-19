/**
 * pnpm pack:all
 * برای هر خوشه یک بسته‌ی «آماده‌ی اجرا» می‌سازد: apps/web/public/packs/<slug>.zip  (+ index.json)
 * داخل بسته: برنامه‌ی Next.js مستقل + میزکار + کیت + راهنمای فارسی.
 * این اسکریپت هرگز خطا برنمی‌گرداند تا بیلد سایت را نشکند.
 */
const { root, wsRoot, checksum, kitVersion, workspaces, fs, path } = require('./kit-lib.cjs');
const { createZip } = require('./zip-lib.cjs');

function walk(dir, base = dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, base));
    else out.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return out;
}

try {
  const tpl = path.join(__dirname, 'pack-template');
  const outDir = path.join(root, 'apps', 'web', 'public', 'packs');
  fs.mkdirSync(outDir, { recursive: true });
  const index = {};
  const list = workspaces();
  const clusters = (() => {
    try {
      return JSON.parse(fs.readFileSync(path.join(__dirname, 'clusters-catalog.json'), 'utf8'));
    } catch {
      return {};
    }
  })();
  for (const slug of list) {
    const src = path.join(wsRoot, slug);
    const manifest = fs.readFileSync(path.join(src, 'manifest.ts'), 'utf8');
    const ver = (manifest.match(/version:\s*'([^']+)'/) || [])[1] || '1.0.0';
    const title = (manifest.match(/title:\s*"([^"]+)"/) || manifest.match(/title:\s*'([^']+)'/) || [])[1] || slug;
    const sub = (s) =>
      s
        .replace(/__SLUG__/g, slug)
        .replace(/__TITLE__/g, title)
        .replace(/__VERSION__/g, ver)
        .replace(/__KIT__/g, `${kitVersion()} (${checksum(path.join(src, '_kit'))})`);
    const root0 = `${slug}-pack`;
    const entries = [];
    const names = [...walk(tpl), '.env.example'].filter((v, i, a) => a.indexOf(v) === i && fs.existsSync(path.join(tpl, v)));
    for (const f of names) entries.push({ name: `${root0}/${f}`, data: Buffer.from(sub(fs.readFileSync(path.join(tpl, f), 'utf8'))) });
    for (const f of walk(src)) if (f !== '_kit/.kit-meta.json') entries.push({ name: `${root0}/src/workspaces/${slug}/${f}`, data: fs.readFileSync(path.join(src, f)) });
    const buf = createZip(entries);
    fs.writeFileSync(path.join(outDir, `${slug}.zip`), buf);
    index[slug] = { file: `${slug}.zip`, version: ver, kit: kitVersion(), size: buf.length, title, name: (clusters[slug] || {}).name || title };
  }
  fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index, null, 2));
  console.log(`✔ ${list.length} بسته‌ی خوشه ساخته شد → apps/web/public/packs`);
} catch (e) {
  console.warn('⚠ ساخت بسته‌های خوشه انجام نشد (بیلد ادامه می‌یابد):', e && e.message);
}
