import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CLUSTERS = [
  { name: 'فروش و تبدیل', slug: 'sales', icon: '💰', color: '#4ade80', sortOrder: 1, description: 'جذب و تبدیل مشتریان' },
  { name: 'مشتری‌یابی', slug: 'lead-generation', icon: '🎯', color: '#6a8dff', sortOrder: 2, description: 'تولید و فیلتر سرنخ‌های فروش' },
  { name: 'خدمات پس‌فروش', slug: 'support', icon: '🎧', color: '#b46eff', sortOrder: 3, description: 'حمایت مستمر و رضایت مشتری' },
  { name: 'تسویه‌حساب و پرداخت', slug: 'finance', icon: '💳', color: '#f59e0b', sortOrder: 4, description: 'مدیریت مالی و پرداخت‌ها' },
  { name: 'مدیریت موجودی', slug: 'inventory', icon: '📦', color: '#10b981', sortOrder: 5, description: 'کنترل و بهینه‌سازی موجودی' },
  { name: 'بازاریابی و تبلیغات', slug: 'marketing', icon: '📢', color: '#ec4899', sortOrder: 6, description: 'افزایش آگاهی از برند' },
  { name: 'تحلیل و گزارش‌دهی', slug: 'analytics', icon: '📊', color: '#39d7e7', sortOrder: 7, description: 'تصمیم‌گیری داده‌محور' },
  { name: 'منابع انسانی', slug: 'hr', icon: '👥', color: '#8b5cf6', sortOrder: 8, description: 'مدیریت تیم و فرآیندهای داخلی' },
  { name: 'زنجیره تامین', slug: 'supply-chain', icon: '🚚', color: '#f97316', sortOrder: 9, description: 'لجستیک و تامین' },
  { name: 'بهبود و نوآوری', slug: 'innovation', icon: '💡', color: '#eab308', sortOrder: 10, description: 'بهینه‌سازی فرآیندها و توسعه' },
];

const BRAINS = [
  { name: 'مغز مرکزی', slug: 'central', icon: '🧠', color: '#39d7e7', isCentral: true, description: 'هماهنگ‌کننده کل سیستم' },
  { name: 'مغز فروش', slug: 'sales-brain', icon: '💰', color: '#4ade80', description: 'تحلیل فروش و مدیریت قیف' },
  { name: 'مغز پشتیبانی', slug: 'support-brain', icon: '🎧', color: '#b46eff', description: 'مدیریت تیکت و رضایت مشتری' },
  { name: 'مغز تحلیل', slug: 'analytics-brain', icon: '📊', color: '#39d7e7', description: 'تحلیل داده و گزارش‌گیری' },
  { name: 'مغز بازاریابی', slug: 'marketing-brain', icon: '📢', color: '#ec4899', description: 'استراتژی محتوا و کمپین' },
];

const PREMIUM_BOTS = [
  { name: 'Silent Churn Guardian', slug: 'silent-churn-guardian', icon: '🛡️', description: 'پیش‌بینی و جلوگیری از ریزش خاموش مشتری', systemPrompt: 'تو یک سیستم پیشرفته پیش‌بینی ریزش مشتری هستی. رفتار مشتری را تحلیل کن و قبل از نشانه آشکار، اقدامات پیشگیرانه پیشنهاد بده.', isPremium: true, cluster: 'analytics' },
  { name: 'Real-time Journey Orchestrator', slug: 'journey-orchestrator', icon: '🗺️', description: 'هماهنگ‌کننده سفر مشتری در لحظه', systemPrompt: 'تو یک هماهنگ‌کننده هوشمند سفر مشتری هستی. بر اساس رفتار لحظه‌ای، مسیر تعامل را پویا تغییر بده.', isPremium: true, cluster: 'sales' },
  { name: 'Cross-Department Decision Bot', slug: 'cross-dept-decision', icon: '⚖️', description: 'داور هوشمند بین بخش‌ها', systemPrompt: 'تو یک داور بین‌بخشی هستی. تعارض‌ها را حل کن و تصمیم بهینه بگیر.', isPremium: true, cluster: 'innovation' },
  { name: 'Internal Knowledge Evolution Bot', slug: 'knowledge-evolution', icon: '📚', description: 'تکامل خودکار دانش داخلی', systemPrompt: 'تو مسئول تکامل دانش داخلی هستی. از مکالمات یاد بگیر و دانش‌نامه را به‌روز کن.', isPremium: true, cluster: 'innovation' },
  { name: 'Brand Personality Guardian', slug: 'brand-guardian', icon: '🎭', description: 'نگهبان یکپارچگی شخصیت برند', systemPrompt: 'تو نگهبان شخصیت برند هستی. لحن برند را در همه کانال‌ها یکسان نگه دار.', isPremium: true, cluster: 'marketing' },
  { name: 'Workload & Burnout Balancer', slug: 'burnout-balancer', icon: '⚖️', description: 'متعادل‌کننده بار کاری تیم', systemPrompt: 'تو مسئول تعادل بار کاری هستی. حجم کار را تحلیل کن و توزیع هوشمند انجام بده.', isPremium: true, cluster: 'hr' },
  { name: 'Live CLV Adjuster', slug: 'live-clv', icon: '💎', description: 'محاسبه لحظه‌ای ارزش طول عمر مشتری', systemPrompt: 'تو سیستم CLV لحظه‌ای هستی. ارزش مشتری را لحظه‌ای محاسبه و سطح خدمات را تنظیم کن.', isPremium: true, cluster: 'analytics' },
  { name: 'Process Debt Detector', slug: 'process-debt', icon: '🔍', description: 'کشف بدهی فرآیندی', systemPrompt: 'تو کشف‌کننده بدهی فرآیندی هستی. فرآیندهای ناکارآمد را پیدا کن و پیشنهاد بهبود بده.', isPremium: true, cluster: 'innovation' },
];

const REGULAR_BOTS = [
  // Sales
  { name: 'ربات خوش‌آمدگویی', slug: 'welcome', icon: '👋', cluster: 'sales', description: 'استقبال بازدیدکنندگان و معرفی محصولات' },
  { name: 'ربات شناسایی نیاز', slug: 'needs-discovery', icon: '🔍', cluster: 'sales', description: 'پرسش‌های هدفمند برای فهم نیاز مشتری' },
  { name: 'ربات پیشنهاد محصول', slug: 'product-recommend', icon: '🎯', cluster: 'sales', description: 'پیشنهاد بهترین محصول بر اساس نیاز' },
  { name: 'ربات مقایسه محصولات', slug: 'product-compare', icon: '⚖️', cluster: 'sales', description: 'مقایسه تفصیلی محصولات مختلف' },
  { name: 'ربات مدیریت قیمت', slug: 'price-manager', icon: '💰', cluster: 'sales', description: 'ارائه تخفیف‌های شخصی‌سازی‌شده' },
  { name: 'ربات برطرف‌کنندگی شکوک', slug: 'objection-handler', icon: '💬', cluster: 'sales', description: 'پاسخ به شکایات و سؤالات خریدی' },
  { name: 'ربات فروش متقاطع', slug: 'cross-sell', icon: '🔗', cluster: 'sales', description: 'پیشنهاد محصولات اضافی' },
  { name: 'ربات فروش اضافی', slug: 'up-sell', icon: '⬆️', cluster: 'sales', description: 'ارتقاء محصول به نسخه بهتر' },
  { name: 'ربات تحریک خرید', slug: 'urgency-creator', icon: '🔥', cluster: 'sales', description: 'اعلام موجودی کم و فروش محدود' },
  { name: 'ربات بسته‌بندی و نهایی‌سازی', slug: 'checkout-helper', icon: '📦', cluster: 'sales', description: 'تایید سفارش و جزئیات تحویل' },
  // Lead Generation
  { name: 'ربات تبلیغات هدفمند', slug: 'targeted-ads', icon: '🎯', cluster: 'lead-generation', description: 'نمایش تبلیغات برای مخاطب صحیح' },
  { name: 'ربات فرم‌های تحقیقاتی', slug: 'research-forms', icon: '📋', cluster: 'lead-generation', description: 'جمع‌آوری اطلاعات تماس و ترجیحات' },
  { name: 'ربات امتیازدهی سرنخ', slug: 'lead-scoring', icon: '⭐', cluster: 'lead-generation', description: 'تعیین کیفیت سرنخ (Hot/Warm/Cold)' },
  { name: 'ربات دسته‌بندی مشتری', slug: 'customer-segment', icon: '🗂️', cluster: 'lead-generation', description: 'تقسیم‌بندی بر اساس منطقه و رفتار' },
  { name: 'ربات ترغیب ثبت‌نام', slug: 'signup-encourager', icon: '✉️', cluster: 'lead-generation', description: 'تشویق به ثبت‌نام در خبرنامه' },
  { name: 'ربات بازیابی بازدید', slug: 'cart-recovery', icon: '🛒', cluster: 'lead-generation', description: 'تماس مجدد با بازدیدکنندگان' },
  { name: 'ربات تحلیل رفتار', slug: 'behavior-analyzer', icon: '📈', cluster: 'lead-generation', description: 'بررسی الگوهای کلیک و جستجو' },
  { name: 'ربات ارجاع دوستانه', slug: 'referral', icon: '🤝', cluster: 'lead-generation', description: 'تشویق به معرفی محصول به دوستان' },
  { name: 'ربات کنکوری و رقابتی', slug: 'contest', icon: '🏆', cluster: 'lead-generation', description: 'برنامه‌های جذب مشتری (قرعه‌کشی)' },
  { name: 'ربات نظرسنجی', slug: 'survey', icon: '📊', cluster: 'lead-generation', description: 'جمع‌آوری نظرات و شناسایی علایق' },
  // Support
  { name: 'ربات پشتیبانی ۲۴/۷', slug: 'support-247', icon: '🕐', cluster: 'support', description: 'پاسخ به سؤالات عمومی در هر ساعت' },
  { name: 'ربات تعمیر و نگهداری', slug: 'maintenance', icon: '🔧', cluster: 'support', description: 'راهنمایی برای حل مشکلات محصول' },
  { name: 'ربات ردیابی سفارش', slug: 'order-tracking', icon: '📍', cluster: 'support', description: 'اطلاع‌رسانی درباره وضعیت تحویل' },
  { name: 'ربات مدیریت شکایات', slug: 'complaint-manager', icon: '📝', cluster: 'support', description: 'ثبت و پیگیری شکایات مشتری' },
  { name: 'ربات تعویض و بازگشت', slug: 'return-exchange', icon: '↩️', cluster: 'support', description: 'تسهیل فرآیند بازگشت محصول' },
  { name: 'ربات مشاوره فنی', slug: 'tech-support', icon: '🛠️', cluster: 'support', description: 'پشتیبانی تکنیکی عمیق‌تر' },
  { name: 'ربات برنامه‌های وفاداری', slug: 'loyalty', icon: '🎁', cluster: 'support', description: 'مدیریت امتیازات و جوایز' },
  { name: 'ربات یادآوری نگهداری', slug: 'maintenance-reminder', icon: '🔔', cluster: 'support', description: 'یادآوری خدمات دوره‌ای' },
  { name: 'ربات بازخورد پس‌ازخرید', slug: 'post-purchase-feedback', icon: '⭐', cluster: 'support', description: 'درخواست نظر و بررسی رضایت' },
  { name: 'ربات استرجاع اطلاعات', slug: 'info-retrieval', icon: '📂', cluster: 'support', description: 'جمع‌آوری سابقه و داده‌های مشتری' },
  // Finance
  { name: 'ربات درخواست پرداخت', slug: 'payment-request', icon: '💳', cluster: 'finance', description: 'ارسال فاکتور و درخواست تسویه' },
  { name: 'ربات پیگیری پرداخت', slug: 'payment-followup', icon: '📞', cluster: 'finance', description: 'یادآوری پرداخت‌های معوق' },
  { name: 'ربات تأیید پرداخت', slug: 'payment-confirm', icon: '✅', cluster: 'finance', description: 'تایید و ثبت پرداخت‌های دریافت‌شده' },
  { name: 'ربات مدیریت اقساط', slug: 'installment', icon: '📅', cluster: 'finance', description: 'تقسیم هزینه‌ها به اقساط' },
  { name: 'ربات ردیابی هزینه‌ها', slug: 'expense-tracker', icon: '🧾', cluster: 'finance', description: 'محاسبه و ردیابی هزینه‌های مختلف' },
  { name: 'ربات صدور رسید', slug: 'receipt-issuer', icon: '🧾', cluster: 'finance', description: 'صدور رسید خودکار' },
  { name: 'ربات مدیریت بودجه', slug: 'budget-manager', icon: '💼', cluster: 'finance', description: 'نظارت بر بودجه و هزینه‌ها' },
  { name: 'ربات گزارش مالی', slug: 'financial-report', icon: '📊', cluster: 'finance', description: 'تهیه گزارش‌های مالی دوره‌ای' },
  { name: 'ربات مدیریت تخفیف', slug: 'discount-manager', icon: '🏷️', cluster: 'finance', description: 'محاسبه و اعمال تخفیف‌های موثر' },
  { name: 'ربات درخواست فاکتور', slug: 'invoice-request', icon: '📄', cluster: 'finance', description: 'تهیه و ارسال فاکتورهای دوره‌ای' },
  // Inventory
  { name: 'ربات نظارت موجودی', slug: 'inventory-monitor', icon: '📦', cluster: 'inventory', description: 'مانیتورینگ سطح موجودی محصولات' },
  { name: 'ربات هشدار کمی', slug: 'low-stock-alert', icon: '⚠️', cluster: 'inventory', description: 'آگاه‌کردن هنگام پایین آمدن موجودی' },
  { name: 'ربات سفارش خودکار', slug: 'auto-reorder', icon: '🔄', cluster: 'inventory', description: 'سفارش خودکار از تامین‌کننده' },
  { name: 'ربات مدیریت انبار', slug: 'warehouse-manager', icon: '🏭', cluster: 'inventory', description: 'تنظیم مکان‌های ذخیره‌سازی' },
  { name: 'ربات شناسایی محصولات باطل', slug: 'dead-stock', icon: '🚫', cluster: 'inventory', description: 'شناسایی و گزارش محصولات غیرفعال' },
  { name: 'ربات پیش‌بینی تقاضا', slug: 'demand-forecast', icon: '📈', cluster: 'inventory', description: 'پیش‌بینی فروش برای سفارش بهتر' },
  { name: 'ربات مدیریت تاریخ انقضا', slug: 'expiry-manager', icon: '⏳', cluster: 'inventory', description: 'کنترل تاریخ اعتبار محصولات' },
  { name: 'ربات تنظیم قیمت نسبت به موجودی', slug: 'dynamic-pricing', icon: '💹', cluster: 'inventory', description: 'تغییر قیمت برای تخلیه موجودی اضافی' },
  { name: 'ربات گزارش موجودی', slug: 'inventory-report', icon: '📋', cluster: 'inventory', description: 'تهیه گزارش‌های دوره‌ای موجودی' },
  { name: 'ربات شناسایی کند‌فروش', slug: 'slow-mover', icon: '🐢', cluster: 'inventory', description: 'تشخیص محصولاتی که کندتر می‌فروشند' },
  // Marketing
  { name: 'ربات ایمیل مارکتینگ', slug: 'email-marketing', icon: '📧', cluster: 'marketing', description: 'ارسال ایمیل‌های تبلیغاتی هدفمند' },
  { name: 'ربات پیام‌های شبکه‌های اجتماعی', slug: 'social-poster', icon: '📱', cluster: 'marketing', description: 'پست و تعامل در شبکه‌های اجتماعی' },
  { name: 'ربات جدول‌بندی محتوا', slug: 'content-scheduler', icon: '🗓️', cluster: 'marketing', description: 'برنامه‌ریزی و انتشار محتوا خودکار' },
  { name: 'ربات تحلیل سنجش', slug: 'campaign-analyzer', icon: '📊', cluster: 'marketing', description: 'بررسی عملکرد کمپین‌ها' },
  { name: 'ربات تست A/B', slug: 'ab-tester', icon: '🔬', cluster: 'marketing', description: 'مقایسه نسخه‌های مختلف محتوا' },
  { name: 'ربات تقسیم‌بندی مخاطبین', slug: 'audience-segment', icon: '👥', cluster: 'marketing', description: 'تقسیم مخاطبین برای تبلیغات دقیق‌تر' },
  { name: 'ربات طوفان ایمیلی', slug: 'email-blast', icon: '🌪️', cluster: 'marketing', description: 'کمپین‌های ایمیلی ترتیبی' },
  { name: 'ربات یادآوری محتوا', slug: 'content-reminder', icon: '🔔', cluster: 'marketing', description: 'یادآوری مشتریان درباره محصولات' },
  { name: 'ربات تبدیل محتوا', slug: 'content-repurposer', icon: '🔄', cluster: 'marketing', description: 'تبدیل محتوا به فرمت‌های مختلف' },
  { name: 'ربات مدیریت مشترکین', slug: 'subscriber-manager', icon: '📇', cluster: 'marketing', description: 'اضافه و حذف مشترکین از لیست‌ها' },
  // Analytics
  { name: 'ربات داشبورد تجاری', slug: 'business-dashboard', icon: '🖥️', cluster: 'analytics', description: 'نمایش متریک‌های کلیدی در یک صفحه' },
  { name: 'ربات تحلیل فروش', slug: 'sales-analyzer', icon: '📈', cluster: 'analytics', description: 'تحلیل عمیق روند فروش و رفتار خرید' },
  { name: 'ربات تحلیل ترافیک', slug: 'traffic-analyzer', icon: '🌐', cluster: 'analytics', description: 'تحلیل بازدیدکنندگان و منابع ترافیک' },
  { name: 'ربات گزارش ROI', slug: 'roi-reporter', icon: '💹', cluster: 'analytics', description: 'محاسبه بازده سرمایه‌گذاری' },
  { name: 'ربات تحلیل رفتار مشتری', slug: 'customer-behavior', icon: '🧠', cluster: 'analytics', description: 'بررسی الگوهای خرید و ترجیحات' },
  { name: 'ربات گزارش رقابتی', slug: 'competitor-report', icon: '🏁', cluster: 'analytics', description: 'مقایسه عملکرد با رقبا' },
  { name: 'ربات هشدار شاخص', slug: 'kpi-alert', icon: '🚨', cluster: 'analytics', description: 'آگاه‌کردن هنگام تغییرات مهم' },
  { name: 'ربات پیش‌بینی روندی', slug: 'trend-forecast', icon: '🔮', cluster: 'analytics', description: 'پیش‌بینی وضعیت آینده' },
  { name: 'ربات تحلیل کالاها', slug: 'product-analyzer', icon: '📦', cluster: 'analytics', description: 'شناسایی محصولات پرفروش و کندفروش' },
  { name: 'ربات گزارش‌های شخصی‌سازی‌شده', slug: 'custom-report', icon: '📑', cluster: 'analytics', description: 'تهیه گزارش برای نقش‌های مختلف' },
  // HR
  { name: 'ربات مدیریت تعطیلات', slug: 'leave-manager', icon: '🏖️', cluster: 'hr', description: 'ثبت و تأیید درخواست‌های مرخصی' },
  { name: 'ربات ردیابی حضور', slug: 'attendance', icon: '🕒', cluster: 'hr', description: 'مانیتورینگ حضور و غیاب پرسنل' },
  { name: 'ربات تحقیق رضایت کارمند', slug: 'employee-satisfaction', icon: '😊', cluster: 'hr', description: 'نظرسنجی و بررسی رضایت تیم' },
  { name: 'ربات انتساب وظایف', slug: 'task-assigner', icon: '📌', cluster: 'hr', description: 'تعیین و پیگیری تکالیف' },
  { name: 'ربات یادآوری ددلاین', slug: 'deadline-reminder', icon: '⏰', cluster: 'hr', description: 'یادآوری مهلت‌های پروژه‌ها' },
  { name: 'ربات مدیریت پروژه', slug: 'project-manager', icon: '📊', cluster: 'hr', description: 'کنترل پیشرفت و مراحل پروژه' },
  { name: 'ربات نظام‌دهی جلسات', slug: 'meeting-scheduler', icon: '📅', cluster: 'hr', description: 'برنامه‌ریزی و یادآوری جلسات' },
  { name: 'ربات گزارش عملکرد', slug: 'performance-report', icon: '📈', cluster: 'hr', description: 'جمع‌آوری و تحلیل عملکرد کارمندان' },
  { name: 'ربات آموزش و توسعه', slug: 'learning-dev', icon: '📚', cluster: 'hr', description: 'ارائه محتوای آموزشی و تقویت مهارت‌ها' },
  { name: 'ربات فیدبک ۳۶۰ درجه', slug: 'feedback-360', icon: '🔄', cluster: 'hr', description: 'جمع‌آوری نظرات از منابع مختلف' },
  // Supply Chain
  { name: 'ربات مدیریت تامین‌کنندگان', slug: 'supplier-manager', icon: '🤝', cluster: 'supply-chain', description: 'ارتباط و مدیریت تامین‌کنندگان' },
  { name: 'ربات سفارش خرید', slug: 'purchase-order', icon: '🛒', cluster: 'supply-chain', description: 'انجام سفارش‌های تکراری خودکار' },
  { name: 'ربات ردیابی حمل‌ونقل', slug: 'shipment-tracker', icon: '🚚', cluster: 'supply-chain', description: 'نظارت بر وضعیت بارها و تحویل' },
  { name: 'ربات پیگیری تاخیر', slug: 'delay-tracker', icon: '⏱️', cluster: 'supply-chain', description: 'شناسایی و گزارش تاخیرهای تحویل' },
  { name: 'ربات کنترل کیفیت', slug: 'quality-control', icon: '✅', cluster: 'supply-chain', description: 'بررسی کیفیت محصولات دریافتی' },
  { name: 'ربات هماهنگی لجستیک', slug: 'logistics-coordinator', icon: '🔗', cluster: 'supply-chain', description: 'تنسیق بین انبار و مراکز توزیع' },
  { name: 'ربات مدیریت حمل‌بها', slug: 'shipping-cost', icon: '💵', cluster: 'supply-chain', description: 'محاسبه و کنترل هزینه‌های حمل' },
  { name: 'ربات تنسیق انبارداری', slug: 'warehouse-sync', icon: '🏭', cluster: 'supply-chain', description: 'هماهنگی فضای انبار و ذخیره‌سازی' },
  { name: 'ربات گزارش تامین', slug: 'supply-report', icon: '📋', cluster: 'supply-chain', description: 'تهیه گزارش‌های دوره‌ای تامین' },
  { name: 'ربات پیش‌بینی تقاضا تامین', slug: 'supply-forecast', icon: '🔮', cluster: 'supply-chain', description: 'پیش‌بینی نیاز به کالاهای تامین' },
  // Innovation
  { name: 'ربات جمع‌آوری ایده', slug: 'idea-collector', icon: '💡', cluster: 'innovation', description: 'جمع‌آوری و دسته‌بندی ایده‌های کارمندان' },
  { name: 'ربات تحلیل مشکلات', slug: 'problem-analyzer', icon: '🔬', cluster: 'innovation', description: 'شناسایی و تجزیه مشکلات عملیاتی' },
  { name: 'ربات نظرسنجی مشتری', slug: 'customer-survey', icon: '📝', cluster: 'innovation', description: 'درخواست نظرات برای بهبود محصول' },
  { name: 'ربات تست محصول جدید', slug: 'new-product-test', icon: '🧪', cluster: 'innovation', description: 'توزیع نسخه‌های آزمایشی محصول' },
  { name: 'ربات بازخورد بتا تسترها', slug: 'beta-feedback', icon: '👥', cluster: 'innovation', description: 'جمع‌آوری نظرات از تسترهای محدود' },
  { name: 'ربات مدیریت باگ و خرابی', slug: 'bug-tracker', icon: '🐛', cluster: 'innovation', description: 'ثبت و پیگیری خرابی‌های کشف‌شده' },
  { name: 'ربات ردیابی توسعه محصول', slug: 'product-dev-tracker', icon: '🚀', cluster: 'innovation', description: 'نظارت بر مراحل توسعه محصول جدید' },
  { name: 'ربات تحلیل رقابت', slug: 'competitor-analysis', icon: '🏁', cluster: 'innovation', description: 'بررسی محصولات و استراتژی رقبا' },
  { name: 'ربات پیشنهادات بهبود', slug: 'improvement-suggester', icon: '✨', cluster: 'innovation', description: 'تشویق و جمع‌آوری پیشنهادات کاری' },
  { name: 'ربات ردیابی KPI بهبود', slug: 'kpi-improvement', icon: '📊', cluster: 'innovation', description: 'نظارت بر معیارهای پیشرفت و بهبود' },
];

async function main() {
  console.log('🌱 شروع Seed کامل...');

  await prisma.botBrain.deleteMany().catch(() => {});
  await prisma.channelConnection.deleteMany().catch(() => {});
  await prisma.botChannel.deleteMany().catch(() => {});
  await prisma.conversation.deleteMany().catch(() => {});
  await prisma.activityLog.deleteMany().catch(() => {});
  await prisma.bot.deleteMany().catch(() => {});
  await prisma.brain.deleteMany().catch(() => {});
  await prisma.cluster.deleteMany().catch(() => {});
  await prisma.channel.deleteMany().catch(() => {});

  const clusterMap: Record<string, string> = {};
  for (const c of CLUSTERS) {
    const cluster = await prisma.cluster.create({ data: c });
    clusterMap[c.slug] = cluster.id;
    console.log(`✅ Cluster: ${c.name}`);
  }

  const brainMap: Record<string, string> = {};
  for (const b of BRAINS) {
    const brain = await prisma.brain.create({ data: b });
    brainMap[b.slug] = brain.id;
    console.log(`✅ Brain: ${b.name}`);
  }

  const CHANNELS = [
    { name: 'تلگرام', slug: 'telegram', type: 'TELEGRAM', icon: '✈️' },
    { name: 'واتساپ', slug: 'whatsapp', type: 'WHATSAPP', icon: '💬' },
    { name: 'وب‌چت', slug: 'webchat', type: 'WEB_CHAT', icon: '🌐' },
    { name: 'اینستاگرام', slug: 'instagram', type: 'INSTAGRAM', icon: '📷' },
    { name: 'ایتا', slug: 'eitaa', type: 'EITAA', icon: '🟢' },
    { name: 'بله', slug: 'bale', type: 'BALE', icon: '🔵' },
    { name: 'روبیکا', slug: 'rubika', type: 'RUBIKA', icon: '🟣' },
    { name: 'سروش', slug: 'soroush', type: 'SOROUSH', icon: '🟠' },
  ];
  for (const ch of CHANNELS) {
    await prisma.channel.create({ data: ch });
    console.log(`✅ Channel: ${ch.name}`);
  }

  for (const bot of PREMIUM_BOTS) {
    const created = await prisma.bot.create({
      data: {
        name: bot.name,
        slug: bot.slug,
        icon: bot.icon,
        description: bot.description,
        systemPrompt: bot.systemPrompt,
        isPremium: true,
        isActive: true,
        temperature: 0.7,
        maxTokens: 1024,
        model: 'gpt-4o-mini',
        clusterId: clusterMap[bot.cluster],
      },
    });
    await prisma.botBrain.create({ data: { botId: created.id, brainId: brainMap['central'] } });
    console.log(`⭐ Premium: ${bot.name}`);
  }

  for (const bot of REGULAR_BOTS) {
    const systemPrompt = `تو یک ${bot.name} هستی. ${bot.description}. با لحن حرفه‌ای و مفید پاسخ بده.`;
    const created = await prisma.bot.create({
      data: {
        name: bot.name,
        slug: bot.slug,
        icon: bot.icon,
        description: bot.description,
        systemPrompt,
        isPremium: false,
        isActive: true,
        temperature: 0.7,
        maxTokens: 1024,
        model: 'gpt-4o-mini',
        clusterId: clusterMap[bot.cluster],
      },
    });
    const brainSlug =
      bot.cluster === 'sales' || bot.cluster === 'lead-generation' ? 'sales-brain' :
      bot.cluster === 'support' ? 'support-brain' :
      bot.cluster === 'analytics' ? 'analytics-brain' :
      bot.cluster === 'marketing' ? 'marketing-brain' : 'central';
    await prisma.botBrain.create({
      data: { botId: created.id, brainId: brainMap[brainSlug] || brainMap['central'] },
    });
  }

  console.log(`\n🎉 Seed کامل شد!`);
  console.log(`   - ${CLUSTERS.length} خوشه`);
  console.log(`   - ${BRAINS.length} مغز`);
  console.log(`   - ${PREMIUM_BOTS.length} ربات طلایی`);
  console.log(`   - ${REGULAR_BOTS.length} ربات عادی`);
  console.log(`   - جمع کل: ${PREMIUM_BOTS.length + REGULAR_BOTS.length}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });