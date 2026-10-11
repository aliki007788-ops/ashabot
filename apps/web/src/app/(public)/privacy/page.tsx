'use client';

import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" dir="rtl">
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-overlay)' }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 md:gap-3 shrink-0">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6a8dff] to-[#b46eff] grid place-items-center font-black text-white">
              A
            </span>
            <span className="font-black text-lg text-[var(--text-primary)]">آشا</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/register"
              className="px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-[#6a8dff] to-[#b46eff] text-white"
            >
              شروع رایگان
            </Link>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-4 md:px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-black mb-4 text-[var(--text-primary)]">
            حریم خصوصی
          </h1>
          <p className="text-[var(--text-tertiary)] mb-8">
            آخرین به‌روزرسانی: ۱۴۰۴/۰۸/۰۱
          </p>

          <div className="space-y-8 text-[var(--text-secondary)] leading-relaxed">
            <section>
              <h2 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">
                🔒 تعهد ما
              </h2>
              <p>
                در آشا، حریم خصوصی شما اولویت اول ماست. این سند توضیح می‌دهد چه
                اطلاعاتی جمع‌آوری می‌کنیم، چگونه از آن محافظت می‌کنیم و شما چه
                حقوقی دارید.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">
                ۱. اطلاعاتی که جمع‌آوری می‌کنیم
              </h2>
              <ul className="space-y-2 pr-6">
                <li>• <strong>اطلاعات حساب:</strong> نام، ایمیل، شماره تماس</li>
                <li>• <strong>اطلاعات کسب‌وکار:</strong> نام شرکت، صنعت</li>
                <li>• <strong>داده‌های استفاده:</strong> ربات‌های فعال، پیام‌ها، آمار</li>
                <li>• <strong>اطلاعات پرداخت:</strong> از طریق درگاه‌های امن</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">
                ۲. چگونه از اطلاعات استفاده می‌کنیم
              </h2>
              <ul className="space-y-2 pr-6">
                <li>• ارائه و بهبود خدمات</li>
                <li>• پشتیبانی فنی</li>
                <li>• اطلاع‌رسانی درباره تغییرات</li>
                <li>• تحلیل عملکرد و رفع باگ</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">
                ۳. اشتراک‌گذاری اطلاعات
              </h2>
              <p className="mb-3">
                ما اطلاعات شما را با هیچ شخص ثالثی به اشتراک نمی‌گذاریم، مگر:
              </p>
              <ul className="space-y-2 pr-6">
                <li>• با اجازه صریح شما</li>
                <li>• برای رعایت الزامات قانونی</li>
                <li>• با ارائه‌دهندگان خدمات ضروری (با توافق محرمانگی)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">
                ۴. امنیت اطلاعات
              </h2>
              <ul className="space-y-2 pr-6">
                <li>• رمزنگاری SSL/TLS برای تمام ارتباطات</li>
                <li>• ذخیره‌سازی امن رمز عبور (bcrypt)</li>
                <li>• پشتیبان‌گیری روزانه</li>
                <li>• نظارت ۲۴/۷ بر سیستم</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">
                ۵. حقوق شما
              </h2>
              <ul className="space-y-2 pr-6">
                <li>• دسترسی به اطلاعات شخصی</li>
                <li>• تصحیح اطلاعات نادرست</li>
                <li>• حذف کامل حساب و داده‌ها</li>
                <li>• دریافت نسخه از داده‌ها (Export)</li>
                <li>• انصراف از دریافت ایمیل‌های تبلیغاتی</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">
                ۶. کوکی‌ها
              </h2>
              <p>
                ما از کوکی‌ها برای نگهداری وضعیت ورود، تنظیمات تم و تحلیل استفاده
                می‌کنیم. شما می‌توانید کوکی‌ها را از مرورگر خود غیرفعال کنید.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">
                ۷. تماس با ما
              </h2>
              <p>
                برای هرگونه سؤال درباره حریم خصوصی، با{' '}
                <Link href="/contact" className="text-[#6a8dff] hover:underline">
                  تماس با ما
                </Link>{' '}
                در ارتباط باشید.
              </p>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}