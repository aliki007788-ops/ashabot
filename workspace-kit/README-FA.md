# Workspace Kit — راهنمای رویه‌ی یکسان

هر خوشه یک **میزکار مستقل** دارد (`apps/web/src/workspaces/<slug>/`) و هر میزکار نسخه‌ی کامل خودش از کیت را داخل `_kit/` دارد.
منبع واقعی کیت فقط یکی است: **`workspace-kit/src/`**.

## تغییر در ظاهر یا باگ کیت
1. فقط فایل‌های `workspace-kit/src/*` را ویرایش کنید (هرگز `_kit/` داخل یک میزکار را دستی تغییر ندهید).
2. شماره‌ی `workspace-kit/VERSION` را بالا ببرید و در `CHANGELOG.md` یک خط بنویسید.
3. اجرا کنید: `pnpm kit:sync` ← کیت داخل همه‌ی میزکارها به‌روز می‌شود.
4. `pnpm kit:check` (در CI هم اجرا می‌شود) اگر یک `_kit` با نسخه‌ی اصلی فرق داشته باشد، خطا می‌دهد.

## رنگ و هویت هر خوشه
فقط در `manifest.ts` همان میزکار (`accent`, `icon`, `title`) تنظیم می‌شود. رنگ از طریق CSS variable با نام `--ws` به همه‌ی اجزا می‌رسد.

## میزکار جدید (مثلاً خوشه‌ی ترکیبی)
1. پوشه‌ی `apps/web/src/workspaces/<slug>/` با `manifest.ts` و `index.tsx` بسازید (از یکی از سه میزکار موجود الگو بگیرید).
2. `pnpm kit:sync` بزنید تا `_kit` ساخته شود.
3. یک خط به `apps/web/src/workspaces/registry.ts` اضافه کنید.

## بسته‌بندی برای فروش یک خوشه
`pnpm pack:workspace <slug>` ← پوشه‌ی `dist/packs/<slug>-<نسخه>/` با میزکار، `_kit`، `host-shim/api.ts` و `README-FA.md` (قرارداد میزبان).

## قرارداد میزبان کیت
`@/lib/api` باید `api` (نمونه‌ی axios با توکن) و `extractError` را صادر کند؛ `API_URL` هم لازم است (برای لینک پرداخت).
