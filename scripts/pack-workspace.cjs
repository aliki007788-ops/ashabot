/**
 * pnpm pack:workspace <slug>
 * یک بسته‌ی مستقل برای فروش یک خوشه می‌سازد: dist/packs/<slug>-<نسخه>/
 *   workspace/   ← میزکار + _kit
 *   host-shim/   ← api.ts حداقلی برای اجرا بدون پلتفرم اصلی
 *   README-FA.md ← قرارداد میزبان و راه نصب
 */
const { root, wsRoot, checksum, kitVersion, workspaces, fs, path } = require('./kit-lib.cjs');

const slug = process.argv[2];
const list = workspaces();
if (!slug || !list.includes(slug)) {
  console.error(`استفاده: pnpm pack:workspace <slug>\nمیزکارهای موجود: ${list.join(', ') || '—'}`);
  process.exit(1);
}
const src = path.join(wsRoot, slug);
const manifestText = fs.readFileSync(path.join(src, 'manifest.ts'), 'utf8');
const ver = (manifestText.match(/version:\s*'([^']+)'/) || [])[1] || '0.0.0';
const out = path.join(root, 'dist', 'packs', `${slug}-${ver}`);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.cpSync(src, path.join(out, 'workspace'), { recursive: true });

fs.mkdirSync(path.join(out, 'host-shim'), { recursive: true });
fs.writeFileSync(
  path.join(out, 'host-shim', 'api.ts'),
  `import axios from 'axios';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
export const api = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' } });

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const t = localStorage.getItem('accessToken');
    if (t) config.headers.Authorization = 'Bearer ' + t;
  }
  return config;
});

export const extractError = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    const d = err.response?.data as { error?: string } | undefined;
    return d?.error || err.message;
  }
  return 'خطای نامشخص';
};
`,
);
fs.writeFileSync(
  path.join(out, 'README-FA.md'),
  `# بسته‌ی میزکار «${slug}» — نسخه ${ver}

کیت داخل: workspace-kit ${kitVersion()} (checksum ${checksum(path.join(src, '_kit'))})

## قرارداد میزبان
- Next.js 14 (App Router) + React 18 + Tailwind CSS
- مسیر \`@/*\` به \`src/*\` اشاره کند و فایل \`@/lib/api\` موجود باشد (نمونه: host-shim/api.ts)
- پکیج: axios
- Tailwind باید پوشه‌ی workspaces را اسکن کند: content: ['./src/**/*.{ts,tsx}']
- API سازگار با پلتفرم آشا (مسیرهای /api/...) و توکن ورود در localStorage با کلید accessToken

## نصب
1. پوشه‌ی \`workspace\` را به \`src/workspaces/${slug}\` کپی کنید.
2. (در صورت نیاز) \`host-shim/api.ts\` را به \`src/lib/api.ts\` ببرید.
3. در یک صفحه: \`import Workspace from '@/workspaces/${slug}';\` و \`<Workspace />\` را رندر کنید.

## به‌روزرسانی کیت
پوشه‌ی \`workspace/_kit\` را فقط با نسخه‌ی جدید جایگزین کنید؛ هرگز دستی ویرایشش نکنید.
`,
);
fs.writeFileSync(path.join(out, 'pack.json'), JSON.stringify({ slug, version: ver, kit: kitVersion() }, null, 2) + '\n');
console.log(`✔ بسته ساخته شد: ${path.relative(root, out)}`);
