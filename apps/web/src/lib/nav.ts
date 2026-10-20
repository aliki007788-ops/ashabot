export interface NavItem { href: string; label: string }

/** منوی اصلی برنامه (مدیر می‌تواند هر بخش را از «تنظیمات فروش» غیرفعال کند) */
export const NAV: NavItem[] = [
  { href: '/dashboard', label: 'داشبورد' },
  { href: '/store', label: '🛒 فروشگاه' },
  { href: '/account', label: '👤 حساب من' },
  { href: '/clusters', label: 'خوشه‌ها' },
  { href: '/w', label: 'میزکارها' },
  { href: '/runs', label: 'پرونده‌ها' },
  { href: '/bots', label: 'ربات‌ها' },
  { href: '/marketplace', label: 'فروشگاه قالب' },
  { href: '/knowledge', label: 'دانش' },
  { href: '/inbox', label: 'صندوق گفتگو' },
  { href: '/crm', label: 'CRM' },
  { href: '/bookings', label: 'نوبت‌ها' },
  { href: '/payments', label: 'پرداخت‌ها' },
  { href: '/workflows', label: 'اتوماسیون' },
  { href: '/evals', label: 'تست کیفیت' },
  { href: '/channels', label: 'کانال‌ها' },
  { href: '/brains', label: 'مغزها' },
  { href: '/settings', label: 'تنظیمات' },
];

/** بخش‌هایی که غیرفعال‌شدنشان معنا ندارد */
export const ALWAYS_ON = ['/dashboard', '/settings', '/account', '/store'];
