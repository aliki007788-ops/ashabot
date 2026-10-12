'use client';

import Link from 'next/link';

const PLANS = [
  { name: 'Free', price: 0, current: true, color: '#6b7280' },
  { name: 'Pro', price: 490000, current: false, color: '#6a8dff', popular: true },
  { name: 'Business', price: 1490000, current: false, color: '#b46eff' },
];

const INVOICES = [
  { id: 'INV-1404-001', date: '1404/08/01', amount: 0, status: 'paid', plan: 'Free' },
];

export default function BillingPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/settings" className="text-sm text-white/40 hover:text-white/70">
        ← بازگشت به تنظیمات
      </Link>

      <div>
        <h1 className="text-4xl font-black mb-2">صورتحساب و پلن</h1>
        <p className="text-white/50">مدیریت اشتراک و پرداخت‌ها</p>
      </div>

      {/* Current Plan */}
      <div className="bg-gradient-to-br from-[#6a8dff]/10 to-[#b46eff]/5 border border-[#6a8dff]/30 rounded-3xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs text-white/50 mb-1">پلن فعلی</div>
            <div className="text-3xl font-black">Free</div>
            <div className="text-sm text-white/60 mt-1">رایگان برای همیشه</div>
          </div>
          <div className="text-xs px-3 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/30">
            ● فعال
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
          <div>
            <div className="text-xs text-white/40 mb-1">ربات‌ها</div>
            <div className="font-bold">1 / 1</div>
          </div>
          <div>
            <div className="text-xs text-white/40 mb-1">پیام‌ها</div>
            <div className="font-bold">47 / 1000</div>
          </div>
          <div>
            <div className="text-xs text-white/40 mb-1">کانال‌ها</div>
            <div className="font-bold">0 / 1</div>
          </div>
          <div>
            <div className="text-xs text-white/40 mb-1">کاربران</div>
            <div className="font-bold">1 / 1</div>
          </div>
        </div>

        <div className="mt-6">
          <Link
            href="/pricing"
            className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-[#6a8dff] to-[#b46eff] font-bold text-sm hover:opacity-90"
          >
            🚀 ارتقا به Pro
          </Link>
        </div>
      </div>

      {/* Available Plans */}
      <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6">
        <h2 className="font-bold mb-4">پلن‌های موجود</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`border rounded-2xl p-5 ${
                plan.current
                  ? 'border-green-500/30 bg-green-500/5'
                  : 'border-white/10 bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="font-black" style={{ color: plan.color }}>
                  {plan.name}
                </div>
                {plan.popular && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    ⭐ پیشنهاد
                  </span>
                )}
                {plan.current && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                    فعلی
                  </span>
                )}
              </div>
              <div className="text-2xl font-black mb-3">
                {plan.price === 0 ? 'رایگان' : plan.price.toLocaleString('fa-IR')}
              </div>
              {plan.price > 0 && (
                <div className="text-xs text-white/40 mb-3">تومان / ماهانه</div>
              )}
              {!plan.current && (
                <Link
                  href="/pricing"
                  className="block w-full py-2 rounded-xl bg-gradient-to-r from-[#6a8dff] to-[#b46eff] text-center text-xs font-bold hover:opacity-90"
                >
                  انتخاب
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Invoices */}
      <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6">
        <h2 className="font-bold mb-4">فاکتورها</h2>
        {INVOICES.length === 0 ? (
          <div className="text-center py-8 text-white/40">هیچ فاکتوری وجود ندارد</div>
        ) : (
          <div className="space-y-2">
            {INVOICES.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-4 bg-black/20 rounded-2xl"
              >
                <div>
                  <div className="font-bold text-sm">{inv.id}</div>
                  <div className="text-xs text-white/40 mt-1">
                    {inv.date} · {inv.plan}
                  </div>
                </div>
                <div className="text-left">
                  <div className="font-bold">
                    {inv.amount === 0 ? 'رایگان' : `${inv.amount.toLocaleString('fa-IR')} تومان`}
                  </div>
                  <div className="text-xs text-green-400 mt-1">● پرداخت شده</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Methods */}
      <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">روش‌های پرداخت</h2>
          <button className="text-xs px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10">
            + افزودن
          </button>
        </div>
        <div className="text-center py-8 text-white/40 text-sm">
          هنوز روش پرداختی اضافه نکرده‌اید
        </div>
      </div>
    </div>
  );
}