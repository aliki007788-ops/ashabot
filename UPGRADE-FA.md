# ارتقای آشا — راهنمای دیپلوی و قابلیت‌های جدید

## ۱) رفع «در رندر دیده نمی‌شود»
رندر فقط **API** است (صفحه‌ی سایت نیست). برای تست: `https://<سرویس>.onrender.com/health`
روی رندر (Environment) این‌ها را بگذارید:
- `CORS_ORIGIN` = آدرس دقیق ورسل (مثلاً `https://ashabot-rose.vercel.app`) — اکنون `*` هم کار می‌کند
- `PUBLIC_API_URL` = آدرس همین سرویس رندر
- `FRONTEND_URL` = آدرس ورسل
- `OPENAI_API_KEY` و/یا `ANTHROPIC_API_KEY` و/یا `GEMINI_API_KEY` (یکی کافی است)
- `ZARINPAL_MERCHANT_ID` (برای پرداخت؛ برای تست `ZARINPAL_SANDBOX=true`)
روی ورسل: `NEXT_PUBLIC_API_URL` = آدرس رندر → سپس Redeploy.

دیتابیس خالی در اولین استارت **خودکار seed** می‌شود (`prisma/bootstrap.cjs`)، و خوشه‌های جدید همیشه به‌روز می‌شوند.
غیرفعال: `SKIP_BOOTSTRAP=1` — اجرای دوباره‌ی کامل (پاک‌کننده!): `FORCE_SEED=1`.

## ۲) خوشه‌ها و ربات‌ها (جمع نهایی بعد از seed کامل)

| لایه | خوشه | مغز | ربات |
|------|------|-----|------|
| پایه + expand + premium | ۱۸ | ۱۸ | ۱۳۵ |
| جدید (`seed-new-clusters`) | +۹ | +۹ | +۵۶ |
| **جمع** | **۲۷** | **۲۷** | **≈۱۹۱** |

۹ خوشه جدید: پایگاه دانش (RAG)، فروشگاه گفتگومحور، اتوماسیون دایرکت، نوبت‌دهی، عامل تماس صوتی (اسکریپت)، استخدام، فاکتور و حسابداری، کارخانه محتوا، املاک و خودرو.

قبلی‌ها حذف نمی‌شوند؛ روی همان seed قبلی اضافه می‌شوند.

دستی فقط جدید: `pnpm --filter @bot-platform/api seed:new`

## ۳) قابلیت‌های جدید
| قابلیت | صفحه | API |
|---|---|---|
| RAG | /knowledge | /api/knowledge |
| تحویل به اپراتور | /inbox | /api/inbox |
| CRM | /crm | /api/crm |
| نوبت‌ها | /bookings | /api/bookings |
| پرداخت زرین‌پال | /payments | /api/payments |
| اتوماسیون | /workflows | /api/workflows |
| فروشگاه قالب | /marketplace | /api/marketplace |
| تست کیفیت | /evals | /api/evals |

- ابزارهای ربات (tool calling): save_lead, create_booking, get_available_slots, create_payment_link, calculate, get_current_time, handoff_to_human (فقط OpenAI و Anthropic؛ Gemini بدون ابزار)
- مدل Gemini اضافه شد. اگر کلید provider مدل ربات نباشد، خودکار به provider دارای کلید می‌رود.
- ویجت وب‌چت پاسخ اپراتور را دریافت می‌کند.
- Guardrails: مقاومت در برابر prompt injection، جلوگیری از SSRF در webhook، بررسی مالکیت ربات در ویرایش/حذف.

## ۴) عمداً انجام نشد
- اتصال واقعی تلفن (Twilio / مرکز تماس ایرانی)
- صف Redis / BullMQ (پلن رایگان Render)
- ویرایش tools در UI (از API با PATCH `/api/bots/:id` و فیلد `tools`)