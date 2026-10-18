'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function Result() {
  const sp = useSearchParams();
  const ok = sp.get('status') === 'ok';
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">{ok ? '✅' : '❌'}</div>
        <h1 className="text-2xl font-black mb-2">{ok ? 'پرداخت با موفقیت انجام شد' : 'پرداخت ناموفق بود'}</h1>
        <p className="text-sm text-white/60">{ok ? 'از خرید شما سپاسگزاریم. می‌توانید این صفحه را ببندید.' : 'اگر مبلغی از حساب شما کسر شده، تا ۷۲ ساعت به حساب برمی‌گردد.'}</p>
      </div>
    </div>
  );
}

export default function PayResultPage() {
  return <Suspense fallback={null}><Result /></Suspense>;
}
