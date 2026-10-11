# Bot Platform — فاز ۱ تا ۳

پلتفرم مدیریت و اجرای ربات‌های هوشمند.

## فازهای تکمیل‌شده

- **فاز ۱**: اسکلت Monorepo + Auth کامل + Docker
- **فاز ۲**: مدل داده + CRUD ربات‌ها + WebSocket + Seed
- **فاز ۳**: AI Integration (OpenAI + Anthropic + Streaming + Conversation)

## اجرای پروژه

```bash
# ۱. نصب
pnpm install

# ۲. کپی env
cp .env.example .env
# JWT secrets را حداقل ۳۲ کاراکتر بگذارید
# OPENAI_API_KEY را اضافه کنید

# ۳. دیتابیس
pnpm db:up
pnpm db:migrate
pnpm db:seed

# ۴. اجرا
pnpm dev
```

- Frontend: http://localhost:3000
- API: http://localhost:4000
- Health: http://localhost:4000/health

## ساختار

```
apps/api/     → Fastify + Prisma + AI
apps/web/     → Next.js 14 + Tailwind
packages/     → shared types
```
