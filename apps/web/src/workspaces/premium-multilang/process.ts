/* تعریف فرایند «میزکار هماهنگ‌کننده‌ی چندزبانه» — تولیدشده از scripts/specs با «pnpm ws:gen». ویرایش دستی نکنید؛ تعریف را در specs تغییر دهید. */
import type { ProcessDef } from './_kit/process';

export const processDef: ProcessDef = {
  "id": "multilang-flow",
  "title": "از پیام تا پاسخ بومی",
  "summary": "زبان پیام تشخیص داده می‌شود، پاسخ مستند ساخته و به زبان مشتری بومی‌سازی می‌شود و لحن برند کنترل می‌گردد.",
  "trigger": {
    "icon": "🌐",
    "label": "پیام مشتری",
    "inputLabel": "پیام مشتری",
    "scenarios": [
      "Hello, what is the warranty period for your product?",
      "سلام، هل يمكنني إرجاع المنتج بعد فتحه؟",
      "Merhaba, siparişim ne zaman gelir?",
      "سلام، نحوه‌ی ثبت سفارش را توضیح بدهید"
    ]
  },
  "stages": [
    {
      "id": "detect",
      "bot": "multi-lang-orchestrator",
      "botName": "Multi-Language Orchestrator",
      "icon": "🌐",
      "title": "تشخیص زبان",
      "does": "زبان و لحن پیام را تشخیص می‌دهد",
      "sample": "زبان پیام «{input}» تشخیص داده شد.",
      "after": "پاسخ مستند ساخته می‌شود",
      "next": [
        "answer"
      ]
    },
    {
      "id": "answer",
      "bot": "kb-support-agent",
      "botName": "پاسخگوی دانش‌محور",
      "icon": "📖",
      "title": "پاسخ مستند",
      "does": "پاسخ را از دانش مرجع می‌سازد",
      "sample": "پاسخ مستند از دانش مرجع ساخته شد.",
      "after": "به زبان مشتری بومی‌سازی می‌شود",
      "next": [
        "localize"
      ],
      "act": "kb"
    },
    {
      "id": "localize",
      "bot": "multi-lang-orchestrator",
      "botName": "Multi-Language Orchestrator",
      "icon": "🌐",
      "title": "ترجمه و بومی‌سازی",
      "does": "پاسخ را با اصطلاحات و ادب زبان مقصد بازنویسی می‌کند",
      "sample": "پاسخ به زبان مشتری بومی‌سازی شد.",
      "after": "لحن برند کنترل می‌شود",
      "next": [
        "brand"
      ]
    },
    {
      "id": "brand",
      "bot": "brand-guardian",
      "botName": "ربات نگهبان شخصیت برند",
      "icon": "🎭",
      "title": "کنترل لحن برند",
      "does": "لحن و واژگان برند را کنترل می‌کند",
      "sample": "لحن برند در پاسخ تأیید شد.",
      "after": "پایان چرخه",
      "next": []
    }
  ],
  "outcome": "پاسخ مستند به زبان مشتری و با لحن برند آماده شده است."
};

export const prompts: string[] = [
  "این پیام را به انگلیسی و عربی ترجمه کن",
  "یک پاسخ استاندارد برای مشتری ترک‌زبان بنویس",
  "اصطلاحات برند را برای ترجمه فهرست کن",
  "چه زبان‌هایی برای بازار ما اولویت دارد؟"
];
