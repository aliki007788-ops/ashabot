'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const CLUSTERS = [
  { slug: 'sales', name: 'فروش و بازاریابی', icon: '💼', color: '#6a8dff', bots: 12 },
  { slug: 'support', name: 'پشتیبانی مشتری', icon: '🎧', color: '#b46eff', bots: 10 },
  { slug: 'hr', name: 'منابع انسانی', icon: '👥', color: '#4ade80', bots: 8 },
  { slug: 'finance', name: 'مالی و حسابداری', icon: '💰', color: '#f59e0b', bots: 9 },
  { slug: 'content', name: 'تولید محتوا', icon: '✍️', color: '#ec4899', bots: 11 },
  { slug: 'analytics', name: 'تحلیل داده', icon: '📊', color: '#39d7e7', bots: 7 },
];

const CHANNELS = [
  { slug: 'eitaa', name: 'ایتا', icon: '📱', color: '#6a8dff' },
  { slug: 'bale', name: 'بله', icon: '💬', color: '#4ade80' },
  { slug: 'rubika', name: 'روبیکا', icon: '🎯', color: '#b46eff' },
  { slug: 'telegram', name: 'تلگرام', icon: '✈️', color: '#39d7e7' },
  { slug: 'whatsapp', name: 'واتساپ', icon: '💚', color: '#25d366' },
  { slug: 'instagram', name: 'اینستاگرام', icon: '📷', color: '#ec4899' },
  { slug: 'webchat', name: 'وب‌چت', icon: '🌐', color: '#f59e0b' },
  { slug: 'sms', name: 'پیامک', icon: '📨', color: '#ef4444' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    businessName: '',
    cluster: '',
    bot: '',
    channel: '',
  });

  const totalSteps = 5;

  function next() {
    if (step < totalSteps) setStep(step + 1);
  }

  function back() {
    if (step > 1) setStep(step - 1);
  }

  function finish() {
    router.push('/dashboard?onboarded=true');
  }

  return (
    <div className="min-h-screen flex flex-col max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl md:text-3xl font-black">راه‌اندازی آشا</h1>
          <span className="text-sm text-white/50">
            مرحله {step} از {totalSteps}
          </span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#6a8dff] to-[#b46eff] transition-all duration-500"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-3 text-xs text-white/40">
          {['خوش‌آمد', 'کسب‌وکار', 'خوشه', 'ربات', 'کانال'].map((label, i) => (
            <span key={i} className={step > i ? 'text-[#6a8dff] font-bold' : ''}>
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex-1">
        {step === 1 && <StepWelcome />}
        {step === 2 && (
          <StepBusiness
            value={data.businessName}
            onChange={(v) => setData({ ...data, businessName: v })}
          />
        )}
        {step === 3 && (
          <StepCluster
            value={data.cluster}
            onChange={(v) => setData({ ...data, cluster: v })}
          />
        )}
        {step === 4 && (
          <StepBot
            cluster={data.cluster}
            value={data.bot}
            onChange={(v) => setData({ ...data, bot: v })}
          />
        )}
        {step === 5 && (
          <StepChannel
            value={data.channel}
            onChange={(v) => setData({ ...data, channel: v })}
          />
        )}
      </div>

      <div className="flex items-center justify-between pt-8 border-t border-white/10 mt-8">
        <button
          onClick={back}
          disabled={step === 1}
          className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 font-bold text-sm hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← قبلی
        </button>

        <button
          onClick={() => router.push('/dashboard')}
          className="text-sm text-white/40 hover:text-white/70"
        >
          رد کردن
        </button>

        {step < totalSteps ? (
          <button
            onClick={next}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#6a8dff] to-[#b46eff] font-bold text-sm hover:opacity-90 transition-opacity"
          >
            بعدی →
          </button>
        ) : (
          <button
            onClick={finish}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 font-bold text-sm hover:opacity-90 transition-opacity"
          >
            🎉 شروع کنید
          </button>
        )}
      </div>
    </div>
  );
}

function StepWelcome() {
  return (
    <div className="text-center py-12">
      <div className="text-7xl mb-6">🎉</div>
      <h2 className="text-3xl md:text-4xl font-black mb-4">
        به <span className="bg-gradient-to-r from-[#6a8dff] to-[#b46eff] bg-clip-text text-transparent">آشا</span> خوش آمدید!
      </h2>
      <p className="text-white/60 text-lg max-w-2xl mx-auto leading-relaxed mb-8">
        در ۵ مرحله ساده، اولین ربات هوشمند خود را راه‌اندازی کنید.
        <br />
        کمتر از ۳ دقیقه زمان می‌برد.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mt-12">
        {[
          { icon: '⚡', title: 'سریع', desc: 'در ۳ دقیقه راه‌اندازی' },
          { icon: '🎯', title: 'ساده', desc: 'بدون نیاز به دانش فنی' },
          { icon: '🤖', title: 'هوشمند', desc: '۱۳۵ ربات آماده' },
        ].map((item, i) => (
          <div key={i} className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
            <div className="text-3xl mb-2">{item.icon}</div>
            <div className="font-bold mb-1">{item.title}</div>
            <div className="text-xs text-white/50">{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepBusiness({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="max-w-2xl mx-auto py-12">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">🏢</div>
        <h2 className="text-2xl md:text-3xl font-black mb-3">نام کسب‌وکار شما چیست؟</h2>
        <p className="text-white/50 text-sm">برای شخصی‌سازی تجربه شما</p>
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="مثال: شرکت آریا"
        className="w-full bg-black/30 border border-white/10 rounded-2xl px-5 py-4 text-lg focus:outline-none focus:border-[#6a8dff] text-center"
        autoFocus
      />
    </div>
  );
}

function StepCluster({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="py-8">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">🎯</div>
        <h2 className="text-2xl md:text-3xl font-black mb-3">حوزه کسب‌وکار خود را انتخاب کنید</h2>
        <p className="text-white/50 text-sm">بر اساس نیاز شما، ربات‌های مناسب پیشنهاد می‌شود</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
        {CLUSTERS.map((c) => (
          <button
            key={c.slug}
            onClick={() => onChange(c.slug)}
            className={`p-5 rounded-2xl border-2 transition-all text-right ${
              value === c.slug
                ? 'border-[#6a8dff] bg-[#6a8dff]/10 scale-[1.02]'
                : 'border-white/10 bg-white/[0.02] hover:border-white/20'
            }`}
          >
            <div className="text-3xl mb-2">{c.icon}</div>
            <div className="font-bold text-sm mb-1">{c.name}</div>
            <div className="text-xs text-white/40">{c.bots} ربات</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepBot({
  cluster,
  value,
  onChange,
}: {
  cluster: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const clusterData = CLUSTERS.find((c) => c.slug === cluster);
  const bots = [
    { id: 'bot-1', name: 'دستیار فروش', desc: 'پاسخ به سؤالات مشتریان و پیشنهاد محصول' },
    { id: 'bot-2', name: 'پیگیری مشتری', desc: 'پیگیری خودکار لیدها و مشتریان' },
    { id: 'bot-3', name: 'تولید محتوای فروش', desc: 'نوشتن متن تبلیغاتی و ایمیل' },
    { id: 'bot-4', name: 'تحلیل بازار', desc: 'تحلیل رقبا و روند بازار' },
  ];

  return (
    <div className="py-8">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">🤖</div>
        <h2 className="text-2xl md:text-3xl font-black mb-3">
          اولین ربات خود را انتخاب کنید
        </h2>
        <p className="text-white/50 text-sm">
          از خوشه{' '}
          <span className="text-[#6a8dff] font-bold">
            {clusterData?.name || 'انتخاب شده'}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
        {bots.map((b) => (
          <button
            key={b.id}
            onClick={() => onChange(b.id)}
            className={`p-5 rounded-2xl border-2 transition-all text-right ${
              value === b.id
                ? 'border-[#6a8dff] bg-[#6a8dff]/10'
                : 'border-white/10 bg-white/[0.02] hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#6a8dff]/20 grid place-items-center text-xl">
                🤖
              </div>
              <div className="font-bold text-sm">{b.name}</div>
            </div>
            <p className="text-xs text-white/50 leading-relaxed">{b.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepChannel({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="py-8">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">📱</div>
        <h2 className="text-2xl md:text-3xl font-black mb-3">
          ربات را به کدام کانال متصل کنیم؟
        </h2>
        <p className="text-white/50 text-sm">
          بعداً می‌توانید کانال‌های بیشتری اضافه کنید
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
        {CHANNELS.map((c) => (
          <button
            key={c.slug}
            onClick={() => onChange(c.slug)}
            className={`p-5 rounded-2xl border-2 transition-all text-center ${
              value === c.slug
                ? 'border-[#6a8dff] bg-[#6a8dff]/10 scale-[1.02]'
                : 'border-white/10 bg-white/[0.02] hover:border-white/20'
            }`}
          >
            <div className="text-4xl mb-2">{c.icon}</div>
            <div className="font-bold text-sm" style={{ color: c.color }}>
              {c.name}
            </div>
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto mt-8 bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 text-center">
        <p className="text-xs text-white/60 leading-relaxed">
          💡 پس از اتمام، می‌توانید کانال‌های بیشتری از بخش{' '}
          <Link href="/channels" className="text-[#6a8dff] hover:underline">
            کانال‌ها
          </Link>{' '}
          اضافه کنید.
        </p>
      </div>
    </div>
  );
}