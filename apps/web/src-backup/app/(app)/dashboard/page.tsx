'use client';

import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">داشبورد</h1>
        <p className="text-white/50 text-sm mt-1">خوش آمدید، {user?.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <p className="text-xs text-white/40 mb-2">کاربر</p>
          <p className="font-black text-lg">{user?.name}</p>
          <p className="text-sm text-white/60 mt-1">{user?.email}</p>
        </Card>
        <Card>
          <p className="text-xs text-white/40 mb-2">نقش</p>
          <p className="font-black text-lg">{user?.role}</p>
        </Card>
        <Card>
          <p className="text-xs text-white/40 mb-2">وضعیت</p>
          <p className="font-black text-lg">فاز ۱–۳ ✅</p>
        </Card>
      </div>

      <Card>
        <h2 className="font-black text-lg mb-2">فازهای تکمیل‌شده</h2>
        <ul className="text-white/60 text-sm leading-7 space-y-1">
          <li>✅ فاز ۱ — اسکلت و زیرساخت + Auth</li>
          <li>✅ فاز ۲ — مدل داده + CRUD ربات‌ها + WebSocket</li>
          <li>✅ فاز ۳ — AI Integration (OpenAI + Anthropic + Streaming)</li>
        </ul>
      </Card>
    </div>
  );
}
