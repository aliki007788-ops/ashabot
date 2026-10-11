'use client';

import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function TermsPage() {
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
            قوانین و مقررات
          </h1>
          <p className="text-[var(--text-tertiary)] mb-8">
            آخرین به‌روزرسانی: ۱۴۰۴/۰۸/۰۱
          </p>

          <div className="space-y-8 text-[var(--text-secondary)] leading-relaxed">
            <section>
              <h2 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">
                ۱. پذیرش قوانین
              </h2>
              <p>
                با استفاده از پلتفرم آشا، شما موافقت می‌کنید که این قوانین و
                مقررات را رعایت کنید. در صورت عدم موافقت، لطفاً از پلتفرم
                استفاده نکنید.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">
                ۲. حساب کاربری
              </h2>
              <p className="mb-3">شما موظف هستید:</p>
              <ul className="space-y-2 pr-6">
                <li>• اطلاعات دقیق و به‌روز ارائه دهید</li>
                <li>• از حساب خود محافظت کنید</li>
                <li>• هرگونه دسترسی غیرمجاز را فوراً گزارش دهید</li>
                <li>• مسئولیت تمام فعالیت‌های حساب خود را بپذیرید</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">
                ۳. استفاده مجاز
              </h2>
              <p className="mb-3">استفاده از پلتفرم برای موارد زیر ممنوع است:</p>
              <ul className="space-y-2 pr-6">
                <li>• ارسال محتوای غیرقانونی، توهین‌آمیز یا مضر</li>
                <li>• نقض حقوق مالکیت معنوی دیگران</li>
                <li>• اسپم، فیشینگ، یا کلاهبرداری</li>
                <li>• تلاش برای دسترسی غیرمجاز به سیستم‌ها</li>
                <li>• نقض قوانین جمهوری اسلامی ایران</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">
                ۴. پرداخت و بازگشت وجه
              </h2>
              <p>
                پرداخت‌ها به صورت ماهانه یا سالانه دریافت می‌شوند. در صورت عدم
                رضایت، تا ۷ روز پس از خرید، کل مبلغ بازگردانده می‌شود.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">
                ۵. مالکیت معنوی
              </h2>
              <p>
                تمام محتوا، کد، و طراحی پلتفرم آشا متعلق به تیم آشا است و هرگونه
                کپی‌برداری بدون اجازه کتبی ممنوع می‌باشد.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">
                ۶. محدودیت مسئولیت
              </h2>
              <p>
                آشا مسئول خسارات ناشی از استفاده نادرست از پلتفرم یا محتوای
                تولیدشده توسط کاربران نیست. استفاده از پلتفرم به عهده کاربر است.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">
                ۷. تغییرات قوانین
              </h2>
              <p>
                آشا حق تغییر این قوانین را در هر زمان محفوظ می‌دارد. کاربران
                موظف به بررسی دوره‌ای این صفحه هستند.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">
                ۸. تماس با ما
              </h2>
              <p>
                برای هرگونه سؤال درباره قوانین، با{' '}
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