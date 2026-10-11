/**
 * ============================================================
 *  ASHA PLATFORM — Seed Expansion Script
 * ============================================================
 *  این اسکریپت پلتفرم را از 108 ربات / 10 خوشه به
 *  130 ربات / 13 خوشه گسترش می‌دهد.
 *
 *  - 3 خوشه جدید (education, legal, security)
 *  - 3 مغز جدید (education-brain, legal-brain, security-brain)
 *  - 22 ربات عادی جدید
 *  - 5 ربات پرمیوم جدید (از 8 به 13)
 *  - اتصال همه به مغز مرکزی + مغز تخصصی
 *
 *  Idempotent — می‌توان چندبار اجرا کرد.
 * ============================================================
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============================================================
// 1. تعریف 3 خوشه جدید
// ============================================================
const NEW_CLUSTERS = [
  {
    name: 'آموزش و توسعه',
    slug: 'education',
    icon: '🎓',
    color: '#a78bfa',
    sortOrder: 11,
    description: 'آموزش مشتریان، کارکنان و توسعه مهارت‌ها',
  },
  {
    name: 'حقوقی و انطباق',
    slug: 'legal',
    icon: '⚖️',
    color: '#64748b',
    sortOrder: 12,
    description: 'مدیریت قراردادها، اسناد و انطباق با قوانین',
  },
  {
    name: 'امنیت و حریم خصوصی',
    slug: 'security',
    icon: '🔒',
    color: '#ef4444',
    sortOrder: 13,
    description: 'حفاظت از داده‌ها، احراز هویت و نظارت امنیتی',
  },
];

// ============================================================
// 2. تعریف 3 مغز جدید
// ============================================================
const NEW_BRAINS = [
  {
    name: 'مغز آموزش',
    slug: 'education-brain',
    icon: '🎓',
    color: '#a78bfa',
    description: 'تحلیل مسیر یادگیری و بهینه‌سازی آموزش',
  },
  {
    name: 'مغز حقوقی',
    slug: 'legal-brain',
    icon: '⚖️',
    color: '#64748b',
    description: 'تحلیل قراردادها، ریسک حقوقی و انطباق',
  },
  {
    name: 'مغز امنیت',
    slug: 'security-brain',
    icon: '🔒',
    color: '#ef4444',
    description: 'نظارت امنیتی، تشخیص تهدید و پاسخ به رخداد',
  },
];

// ============================================================
// 3. تعریف 22 ربات جدید در 3 خوشه
// ============================================================
const NEW_BOTS = [
  // ============ خوشه آموزش (8 ربات) ============
  {
    name: 'ربات آموزش مشتری',
    slug: 'customer-training',
    icon: '🎓',
    cluster: 'education',
    description: 'آموزش گام‌به‌گام استفاده از محصول به مشتریان جدید',
    systemPrompt: `تو یک مربی آموزش مشتری هستی. وظیفه‌ات:
- آموزش گام‌به‌گام استفاده از محصول
- پاسخ به سؤالات آموزشی با زبان ساده
- ارائه مثال‌های عملی
- تشویق مشتری به یادگیری مستمر
با لحن صبور، دوستانه و حرفه‌ای پاسخ بده.`,
  },
  {
    name: 'ربات محتوای آموزشی',
    slug: 'content-tutor',
    icon: '📚',
    cluster: 'education',
    description: 'تولید و ارائه محتوای آموزشی متناسب با سطح کاربر',
    systemPrompt: `تو یک تولیدکننده محتوای آموزشی هستی. وظیفه‌ات:
- تولید محتوای آموزشی دقیق و کاربردی
- تطبیق محتوا با سطح دانش کاربر
- استفاده از مثال و تمرین
- ارائه منابع تکمیلی
پاسخ‌ها باید ساختاریافته و آموزشی باشند.`,
  },
  {
    name: 'ربات ویدیوهای آموزشی',
    slug: 'video-tutor',
    icon: '🎥',
    cluster: 'education',
    description: 'پیشنهاد ویدیوهای آموزشی بر اساس نیاز کاربر',
    systemPrompt: `تو یک راهنمای ویدیوهای آموزشی هستی. وظیفه‌ات:
- پیشنهاد ویدیوهای مرتبط با نیاز کاربر
- خلاصه‌سازی محتوای ویدیو
- ارائه نکات کلیدی هر ویدیو
- پیشنهاد مسیر تماشا
پاسخ‌ها کوتاه، جذاب و هدایت‌کننده باشند.`,
  },
  {
    name: 'ربات آزمون و ارزیابی',
    slug: 'quiz-master',
    icon: '🧪',
    cluster: 'education',
    description: 'طراحی و اجرای آزمون برای سنجش دانش',
    systemPrompt: `تو یک طراح آزمون آموزشی هستی. وظیفه‌ات:
- طراحی سؤالات چندگزینه‌ای و تشریحی
- ارزیابی پاسخ‌ها و ارائه بازخورد
- تعیین سطح دانش کاربر
- پیشنهاد مسیر بهبود
با لحن حمایتی و تشویقی پاسخ بده.`,
  },
  {
    name: 'ربات ثبت‌نام دوره',
    slug: 'course-enrollment',
    icon: '📝',
    cluster: 'education',
    description: 'مدیریت ثبت‌نام و اطلاع‌رسانی دوره‌ها',
    systemPrompt: `تو یک مدیر ثبت‌نام دوره هستی. وظیفه‌ات:
- اطلاع‌رسانی دوره‌های موجود
- راهنمایی در فرآیند ثبت‌نام
- مدیریت ظرفیت و لیست انتظار
- ارسال یادآوری
با لحن اداری و مؤدبانه پاسخ بده.`,
  },
  {
    name: 'ربات گیمیفیکیشن آموزشی',
    slug: 'edu-gamification',
    icon: '🏆',
    cluster: 'education',
    description: 'افزایش انگیزه یادگیری با بازی‌سازی',
    systemPrompt: `تو یک طراح تجربه گیمیفیکیشن آموزشی هستی. وظیفه‌ات:
- طراحی چالش‌های آموزشی جذاب
- اعطای امتیاز و نشان
- ایجاد رقابت سالم
- پیگیری پیشرفت
پاسخ‌ها باید انگیزه‌بخش و جذاب باشند.`,
  },
  {
    name: 'ربات مسیر یادگیری',
    slug: 'learning-path',
    icon: '🎯',
    cluster: 'education',
    description: 'طراحی مسیر یادگیری شخصی‌سازی‌شده',
    systemPrompt: `تو یک مشاور مسیر یادگیری هستی. وظیفه‌ات:
- ارزیابی سطح فعلی کاربر
- طراحی مسیر یادگیری گام‌به‌گام
- تعیین اهداف کوتاه و بلندمدت
- پیگیری پیشرفت
با لحن مربی حرفه‌ای پاسخ بده.`,
  },
  {
    name: 'ربات پرسش و پاسخ آموزشی',
    slug: 'edu-qa',
    icon: '💬',
    cluster: 'education',
    description: 'پاسخ به سؤالات آموزشی در هر لحظه',
    systemPrompt: `تو یک دستیار پرسش و پاسخ آموزشی هستی. وظیفه‌ات:
- پاسخ دقیق به سؤالات آموزشی
- ارائه توضیحات ساده و قابل فهم
- ارجاع به منابع معتبر
- پیشنهاد مطالعه بیشتر
پاسخ‌ها باید صریح، مختصر و مفید باشند.`,
  },

  // ============ خوشه حقوقی (7 ربات) ============
  {
    name: 'ربات قراردادها',
    slug: 'contract-bot',
    icon: '📜',
    cluster: 'legal',
    description: 'تحلیل، تنظیم و پیشنهاد قراردادها',
    systemPrompt: `تو یک دستیار حقوقی متخصص قرارداد هستی. وظیفه‌ات:
- تحلیل مفاد قرارداد
- شناسایی نقاط ریسک
- پیشنهاد اصلاحات
- خلاصه‌سازی مفاد کلیدی
پاسخ‌ها باید دقیق و مبتنی بر قوانین باشند. (توجه: مشاوره حقوقی رسمی نیست)`,
  },
  {
    name: 'ربات مشاوره حقوقی',
    slug: 'legal-advice',
    icon: '⚖️',
    cluster: 'legal',
    description: 'پاسخ به سؤالات حقوقی عمومی',
    systemPrompt: `تو یک دستیار مشاوره حقوقی هستی. وظیفه‌ات:
- پاسخ به سؤالات حقوقی عمومی
- ارجاع به قوانین مرتبط
- پیشنهاد اقدامات قانونی
- هشدار در مورد ریسک‌ها
(توجه: مشاوره رسمی نیست و نیاز به تأیید وکیل دارد)`,
  },
  {
    name: 'ربات امضای دیجیتال',
    slug: 'digital-signature',
    icon: '🔏',
    cluster: 'legal',
    description: 'مدیریت امضای الکترونیک اسناد',
    systemPrompt: `تو یک مدیر امضای دیجیتال هستی. وظیفه‌ات:
- راهنمایی در فرآیند امضای دیجیتال
- بررسی اعتبار امضاها
- مدیریت اسناد امضا شده
- اطلاع‌رسانی وضعیت
با لحن اداری و امن پاسخ بده.`,
  },
  {
    name: 'ربات انطباق (Compliance)',
    slug: 'compliance-bot',
    icon: '📋',
    cluster: 'legal',
    description: 'بررسی انطباق با قوانین و مقررات',
    systemPrompt: `تو یک متخصص انطباق (Compliance) هستی. وظیفه‌ات:
- بررسی انطباق با قوانین
- شناسایی شکاف‌های قانونی
- پیشنهاد اقدامات اصلاحی
- گزارش‌دهی به مدیران
پاسخ‌ها باید دقیق، مبتنی بر استانداردها و قابل حسابرسی باشند.`,
  },
  {
    name: 'ربات حفاظت داده (GDPR)',
    slug: 'gdpr-bot',
    icon: '🛡️',
    cluster: 'legal',
    description: 'حفاظت از داده‌های شخصی مطابق GDPR',
    systemPrompt: `تو یک متخصص حفاظت داده (GDPR) هستی. وظیفه‌ات:
- بررسی انطباق با GDPR
- مدیریت رضایت کاربران
- پاسخ به درخواست‌های حذف داده
- گزارش نقض داده
پاسخ‌ها باید دقیق و مبتنی بر مقررات باشند.`,
  },
  {
    name: 'ربات اسناد حقوقی',
    slug: 'legal-docs',
    icon: '📄',
    cluster: 'legal',
    description: 'مدیریت و بایگانی اسناد حقوقی',
    systemPrompt: `تو یک مدیر اسناد حقوقی هستی. وظیفه‌ات:
- بایگانی و دسته‌بندی اسناد
- جستجوی سریع در اسناد
- اطلاع‌رسانی انقضا
- مدیریت نسخه‌ها
پاسخ‌ها باید ساختاریافته و دقیق باشند.`,
  },
  {
    name: 'ربات بررسی شرایط',
    slug: 'terms-reviewer',
    icon: '🔍',
    cluster: 'legal',
    description: 'بررسی شرایط و مقررات خدمات',
    systemPrompt: `تو یک بررسی‌کننده شرایط و مقررات هستی. وظیفه‌ات:
- تحلیل شرایط خدمات
- شناسایی بندهای نامتعارف
- خلاصه‌سازی به زبان ساده
- هشدار ریسک‌ها
پاسخ‌ها باید شفاف و قابل فهم باشند.`,
  },

  // ============ خوشه امنیت (7 ربات) ============
  {
    name: 'ربات احراز هویت',
    slug: 'auth-bot',
    icon: '🔒',
    cluster: 'security',
    description: 'مدیریت احراز هویت چندمرحله‌ای',
    systemPrompt: `تو یک مدیر احراز هویت هستی. وظیفه‌ات:
- راهنمایی در فرآیند احراز هویت
- پشتیبانی از MFA
- تشخیص تلاش‌های مشکوک
- اطلاع‌رسانی رخدادهای امنیتی
پاسخ‌ها باید دقیق، امن و واضح باشند.`,
  },
  {
    name: 'ربات تشخیص تهدید',
    slug: 'threat-detection',
    icon: '🛡️',
    cluster: 'security',
    description: 'تشخیص و پاسخ به تهدیدات امنیتی',
    systemPrompt: `تو یک سیستم تشخیص تهدید هستی. وظیفه‌ات:
- تحلیل الگوهای مشکوک
- شناسایی تهدیدات بالقوه
- ارائه هشدار فوری
- پیشنهاد اقدامات متقابل
پاسخ‌ها باید سریع، دقیق و قابل اجرا باشند.`,
  },
  {
    name: 'ربات هشدار امنیتی',
    slug: 'security-alert',
    icon: '🚨',
    cluster: 'security',
    description: 'اطلاع‌رسانی فوری رخدادهای امنیتی',
    systemPrompt: `تو یک سیستم هشدار امنیتی هستی. وظیفه‌ات:
- اطلاع‌رسانی فوری رخدادها
- اولویت‌بندی هشدارها
- ارائه توصیه‌های عملی
- پیگیری وضعیت
پاسخ‌ها باید کوتاه، فوری و هدایت‌کننده باشند.`,
  },
  {
    name: 'ربات رمزنگاری',
    slug: 'encryption-bot',
    icon: '🔐',
    cluster: 'security',
    description: 'مدیریت رمزنگاری داده‌ها',
    systemPrompt: `تو یک مدیر رمزنگاری هستی. وظیفه‌ات:
- راهنمایی در رمزنگاری داده‌ها
- مدیریت کلیدها
- بررسی امنیت انتقال داده
- انطباق با استانداردهای رمزنگاری
پاسخ‌ها باید دقیق و فنی باشند.`,
  },
  {
    name: 'ربات نظارت و لاگ',
    slug: 'audit-log',
    icon: '👁️',
    cluster: 'security',
    description: 'نظارت بر فعالیت‌ها و ثبت لاگ',
    systemPrompt: `تو یک سیستم نظارت و لاگ هستی. وظیفه‌ات:
- ثبت تمام فعالیت‌های مهم
- تحلیل لاگ‌ها
- شناسایی الگوهای غیرعادی
- گزارش‌دهی دوره‌ای
پاسخ‌ها باید دقیق، قابل حسابرسی و ساختاریافته باشند.`,
  },
  {
    name: 'ربات تشخیص نفوذ',
    slug: 'intrusion-detection',
    icon: '🕵️',
    cluster: 'security',
    description: 'تشخیص و پاسخ به نفوذهای امنیتی',
    systemPrompt: `تو یک سیستم تشخیص نفوذ هستی. وظیفه‌ات:
- تحلیل ترافیک شبکه
- شناسایی الگوهای نفوذ
- مسدودسازی فوری
- گزارش‌دهی به تیم امنیت
پاسخ‌ها باید فوری، دقیق و قابل اجرا باشند.`,
  },
  {
    name: 'ربات مدیریت دسترسی',
    slug: 'access-manager',
    icon: '🔑',
    cluster: 'security',
    description: 'مدیریت نقش‌ها و مجوزهای دسترسی',
    systemPrompt: `تو یک مدیر دسترسی هستی. وظیفه‌ات:
- مدیریت نقش‌ها و مجوزها
- بررسی اصل حداقل دسترسی
- حسابرسی دسترسی‌ها
- پاسخ به درخواست‌های دسترسی
پاسخ‌ها باید دقیق، امن و قابل حسابرسی باشند.`,
  },
];

// ============================================================
// 4. تعریف 5 ربات پرمیوم جدید
// ============================================================
const NEW_PREMIUM_BOTS = [
  {
    name: 'Adaptive Learning Coach',
    slug: 'adaptive-learning-coach',
    icon: '🎓',
    description: 'مربی یادگیری تطبیقی با شخصی‌سازی کامل',
    cluster: 'education',
    systemPrompt: `تو یک مربی یادگیری تطبیقی هستی. بر اساس:
- سطح دانش فعلی
- سرعت یادگیری
- علاقه‌مندی‌ها
- هدف نهایی
یک مسیر یادگیری پویا طراحی کن که در هر لحظه تطبیق پیدا می‌کند.
از داده‌های رفتاری و بازخورد برای بهینه‌سازی مسیر استفاده کن.`,
  },
  {
    name: 'Legal Document Analyzer',
    slug: 'legal-doc-analyzer',
    icon: '📝',
    description: 'تحلیل عمیق اسناد حقوقی با هوش مصنوعی',
    cluster: 'legal',
    systemPrompt: `تو یک تحلیلگر اسناد حقوقی هستی. قادر به:
- تحلیل دقیق مفاد قرارداد
- شناسایی بندهای پرخطر
- مقایسه با استانداردهای صنعت
- پیشنهاد اصلاحات مشخص
- خلاصه‌سازی حقوقی
پاسخ‌ها باید مبتنی بر قوانین و قابل استناد باشند.`,
  },
  {
    name: 'Zero-Trust Enforcer',
    slug: 'zero-trust-enforcer',
    icon: '🔒',
    description: 'اجرای مدل امنیتی Zero-Trust',
    cluster: 'security',
    systemPrompt: `تو یک اجراکننده Zero-Trust هستی. وظیفه‌ات:
- تأیید هویت هر درخواست
- اجرای اصل حداقل دسترسی
- نظارت مستمر بر فعالیت‌ها
- پاسخ خودکار به تهدیدات
- لاگ کامل برای حسابرسی
هیچ درخواستی را بدون تأیید کامل قبول نکن.`,
  },
  {
    name: 'Multi-Language Orchestrator',
    slug: 'multi-lang-orchestrator',
    icon: '🌐',
    description: 'هماهنگی چندزبانه در تمام کانال‌ها',
    cluster: 'marketing',
    systemPrompt: `تو یک هماهنگ‌کننده چندزبانه هستی. وظیفه‌ات:
- تشخیص زبان کاربر
- ترجمه دقیق و طبیعی
- حفظ لحن و شخصیت برند در همه زبان‌ها
- هماهنگی بین تیم‌های مختلف زبانی
- مدیریت RTL/LTR
با حفظ هویت برند آشا در هر زبان پاسخ بده.`,
  },
  {
    name: 'Voice Sentiment Analyzer',
    slug: 'voice-sentiment',
    icon: '📞',
    description: 'تحلیل احساسات در مکالمات صوتی',
    cluster: 'support',
    systemPrompt: `تو یک تحلیلگر احساسات صوتی هستی. وظیفه‌ات:
- تحلیل لحن و احساس مشتری
- تشخیص نارضایتی پنهان
- پیشنهاد پاسخ مناسب
- هشدار به مدیر در موارد حساس
- ثبت رخداد برای تحلیل بعدی
با دقت و حساسیت بالا پاسخ بده.`,
  },
];

// ============================================================
// 5. نقشه اتصال ربات به مغز (فقط برای ربات‌های جدید)
// ============================================================
const CLUSTER_TO_BRAIN = {
  education: 'education-brain',
  legal: 'legal-brain',
  security: 'security-brain',
};

// ============================================================
// 6. توابع کمکی
// ============================================================
function log(icon, msg) {
  console.log(`${icon} ${msg}`);
}

function logSection(title) {
  console.log('\n' + '═'.repeat(60));
  console.log(`  ${title}`);
  console.log('═'.repeat(60));
}

// ============================================================
// 7. تابع اصلی
// ============================================================
async function main() {
  const startTime = Date.now();

  console.log('\n╔' + '═'.repeat(58) + '╗');
  console.log('║' + '  🚀 ASHA PLATFORM — Seed Expansion'.padEnd(58) + '║');
  console.log('║' + '  گسترش از 108 ربات / 10 خوشه به 130 ربات / 13 خوشه'.padEnd(58) + '║');
  console.log('╚' + '═'.repeat(58) + '╝');

  // ─────────────────────────────────────────────
  // مرحله 1: ساخت خوشه‌های جدید
  // ─────────────────────────────────────────────
  logSection('📍 مرحله ۱: خوشه‌های جدید');

  const clusterMap = {};
  for (const c of NEW_CLUSTERS) {
    const cluster = await prisma.cluster.upsert({
      where: { slug: c.slug },
      update: c,
      create: c,
    });
    clusterMap[c.slug] = cluster.id;
    log('✅', `خوشه: ${c.icon} ${c.name} (${c.slug})`);
  }

  // ─────────────────────────────────────────────
  // مرحله 2: ساخت مغزهای جدید
  // ─────────────────────────────────────────────
  logSection('🧠 مرحله ۲: مغزهای جدید');

  const brainMap = {};
  for (const b of NEW_BRAINS) {
    const brain = await prisma.brain.upsert({
      where: { slug: b.slug },
      update: b,
      create: b,
    });
    brainMap[b.slug] = brain.id;
    log('✅', `مغز: ${b.icon} ${b.name} (${b.slug})`);
  }

  // مغز مرکزی (باید از قبل باشد)
  const centralBrain = await prisma.brain.findFirst({ where: { isCentral: true } });
  if (!centralBrain) {
    throw new Error('❌ مغز مرکزی یافت نشد!');
  }
  log('✅', `مغز مرکزی: ${centralBrain.icon} ${centralBrain.name}`);

  // ─────────────────────────────────────────────
  // مرحله 3: ساخت 22 ربات جدید
  // ─────────────────────────────────────────────
  logSection('🤖 مرحله ۳: ۲۲ ربات جدید');

  let botsCreated = 0;
  let botsUpdated = 0;
  let connectionsCreated = 0;

  for (const bot of NEW_BOTS) {
    const clusterId = clusterMap[bot.cluster];
    const brainSlug = CLUSTER_TO_BRAIN[bot.cluster];
    const brainId = brainMap[brainSlug];

    if (!clusterId || !brainId) {
      log('⚠️', `ربات ${bot.slug} — خوشه یا مغز یافت نشد`);
      continue;
    }

    const existing = await prisma.bot.findUnique({ where: { slug: bot.slug } });

    const botData = {
      name: bot.name,
      slug: bot.slug,
      icon: bot.icon,
      description: bot.description,
      systemPrompt: bot.systemPrompt,
      clusterId,
      isActive: true,
      isPremium: false,
      isTemplate: true,
      temperature: 0.7,
      maxTokens: 1024,
      model: 'gpt-4o-mini',
    };

    let createdBot;
    if (existing) {
      createdBot = await prisma.bot.update({
        where: { id: existing.id },
        data: botData,
      });
      botsUpdated++;
      log('🔄', `به‌روزرسانی: ${bot.icon} ${bot.name}`);
    } else {
      createdBot = await prisma.bot.create({ data: botData });
      botsCreated++;
      log('➕', `ایجاد: ${bot.icon} ${bot.name}`);
    }

    // اتصال به مغز مرکزی
    await prisma.botBrain.upsert({
      where: {
        botId_brainId: { botId: createdBot.id, brainId: centralBrain.id },
      },
      update: {},
      create: { botId: createdBot.id, brainId: centralBrain.id },
    });
    connectionsCreated++;

    // اتصال به مغز تخصصی
    await prisma.botBrain.upsert({
      where: {
        botId_brainId: { botId: createdBot.id, brainId },
      },
      update: {},
      create: { botId: createdBot.id, brainId },
    });
    connectionsCreated++;
  }

  // ─────────────────────────────────────────────
  // مرحله 4: ساخت 5 ربات پرمیوم جدید
  // ─────────────────────────────────────────────
  logSection('⭐ مرحله ۴: ۵ ربات پرمیوم جدید');

  let premiumCreated = 0;

  for (const bot of NEW_PREMIUM_BOTS) {
    // پیدا کردن clusterId با slug
    const cluster = await prisma.cluster.findUnique({ where: { slug: bot.cluster } });
    if (!cluster) {
      log('⚠️', `ربات پرمیوم ${bot.slug} — خوشه ${bot.cluster} یافت نشد`);
      continue;
    }

    const existing = await prisma.bot.findUnique({ where: { slug: bot.slug } });

    const botData = {
      name: bot.name,
      slug: bot.slug,
      icon: bot.icon,
      description: bot.description,
      systemPrompt: bot.systemPrompt,
      clusterId: cluster.id,
      isActive: true,
      isPremium: true,
      isTemplate: true,
      temperature: 0.7,
      maxTokens: 1024,
      model: 'gpt-4o-mini',
    };

    let createdBot;
    if (existing) {
      createdBot = await prisma.bot.update({
        where: { id: existing.id },
        data: botData,
      });
      log('🔄', `به‌روزرسانی پرمیوم: ${bot.icon} ${bot.name}`);
    } else {
      createdBot = await prisma.bot.create({ data: botData });
      premiumCreated++;
      log('⭐', `ایجاد پرمیوم: ${bot.icon} ${bot.name}`);
    }

    // اتصال به مغز مرکزی
    await prisma.botBrain.upsert({
      where: {
        botId_brainId: { botId: createdBot.id, brainId: centralBrain.id },
      },
      update: {},
      create: { botId: createdBot.id, brainId: centralBrain.id },
    });

    // اتصال به مغز تخصصی خوشه (اگه داشت)
    const specialistBrainSlug = CLUSTER_TO_BRAIN[bot.cluster];
    if (specialistBrainSlug) {
      const sbId = brainMap[specialistBrainSlug];
      if (sbId) {
        await prisma.botBrain.upsert({
          where: { botId_brainId: { botId: createdBot.id, brainId: sbId } },
          update: {},
          create: { botId: createdBot.id, brainId: sbId },
        });
      }
    } else {
      // برای ربات‌های پرمیوم در خوشه‌های موجود (marketing, support)
      // از مغز تخصصی موجود استفاده کن
      const existingSpecialist = await prisma.brain.findFirst({
        where: {
          slug: { in: [`${bot.cluster}-brain`] },
        },
      });
      if (existingSpecialist) {
        await prisma.botBrain.upsert({
          where: {
            botId_brainId: { botId: createdBot.id, brainId: existingSpecialist.id },
          },
          update: {},
          create: { botId: createdBot.id, brainId: existingSpecialist.id },
        });
      }
    }
  }

  // ─────────────────────────────────────────────
  // مرحله 5: آمار نهایی
  // ─────────────────────────────────────────────
  logSection('📊 مرحله ۵: گزارش نهایی');

  const [
    totalClusters,
    totalBrains,
    totalBots,
    totalPremium,
    totalRegular,
    totalTemplates,
    totalConnections,
  ] = await Promise.all([
    prisma.cluster.count(),
    prisma.brain.count(),
    prisma.bot.count(),
    prisma.bot.count({ where: { isPremium: true } }),
    prisma.bot.count({ where: { isPremium: false } }),
    prisma.bot.count({ where: { isTemplate: true } }),
    prisma.botBrain.count(),
  ]);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n📈 آمار پلتفرم:');
  console.log('─'.repeat(60));
  console.log(`   🏢 خوشه‌ها:           ${totalClusters} ${totalClusters === 13 ? '✅' : '⚠️'}`);
  console.log(`   🧠 مغزها:             ${totalBrains} ${totalBrains === 13 ? '✅' : '⚠️'}`);
  console.log(`   🤖 کل ربات‌ها:        ${totalBots} ${totalBots === 130 ? '✅' : '⚠️'}`);
  console.log(`   ⭐ ربات‌های پرمیوم:   ${totalPremium} ${totalPremium === 13 ? '✅' : '⚠️'}`);
  console.log(`   📦 ربات‌های عادی:    ${totalRegular}`);
  console.log(`   🎯 Template‌ها:       ${totalTemplates}`);
  console.log(`   🔗 اتصالات مغز:      ${totalConnections}`);
  console.log('─'.repeat(60));

  console.log('\n🎬 این اجرا:');
  console.log('─'.repeat(60));
  console.log(`   ➕ خوشه‌های جدید:      ${NEW_CLUSTERS.length}`);
  console.log(`   ➕ مغزهای جدید:       ${NEW_BRAINS.length}`);
  console.log(`   ➕ ربات‌های جدید:     ${botsCreated} (به‌روز: ${botsUpdated})`);
  console.log(`   ⭐ پرمیوم‌های جدید:   ${premiumCreated}`);
  console.log(`   🔗 اتصالات جدید:      ${connectionsCreated}`);
  console.log(`   ⏱️  زمان اجرا:        ${duration} ثانیه`);
  console.log('─'.repeat(60));

  console.log('\n' + '╔' + '═'.repeat(58) + '╗');
  console.log('║' + '  🎉 عملیات با موفقیت انجام شد!'.padEnd(58) + '║');
  console.log('║' + `  پلتفرم: ${totalClusters} خوشه، ${totalBrains} مغز، ${totalBots} ربات`.padEnd(58) + '║');
  console.log('╚' + '═'.repeat(58) + '╝\n');
}

// ============================================================
// 8. اجرا با مدیریت خطا
// ============================================================
main()
  .catch((e) => {
    console.error('\n❌ خطا در اجرای seed-expand:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });