'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  avatar: string;
  joinedAt: string;
}

export default function TeamPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([
    {
      id: user?.id || '1',
      name: user?.name || 'Admin',
      email: user?.email || 'admin@test.com',
      role: 'OWNER',
      avatar: user?.name?.[0] || 'A',
      joinedAt: '1404/07/01',
    },
  ]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/settings" className="text-sm text-white/40 hover:text-white/70">
        ← بازگشت به تنظیمات
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-black mb-2">اعضای تیم</h1>
          <p className="text-white/50">مدیریت کاربران سازمان</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#6a8dff] to-[#b46eff] font-bold text-sm hover:opacity-90"
        >
          + دعوت عضو جدید
        </button>
      </div>

      {/* Plan Limit */}
      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-4 flex items-center gap-3">
        <span className="text-2xl">⚠️</span>
        <div className="flex-1">
          <div className="text-sm font-bold">پلن Free — حداکثر 1 کاربر</div>
          <div className="text-xs text-white/50">
            برای اضافه کردن اعضای بیشتر، پلن خود را ارتقا دهید
          </div>
        </div>
        <Link
          href="/pricing"
          className="text-xs px-4 py-2 rounded-xl bg-gradient-to-r from-[#6a8dff] to-[#b46eff] font-bold"
        >
          ارتقا
        </Link>
      </div>

      {/* Members */}
      <div className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-bold">اعضای فعلی ({members.length})</h2>
        </div>

        <div className="divide-y divide-white/5">
          {members.map((m) => (
            <div key={m.id} className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6a8dff] to-[#b46eff] grid place-items-center font-black text-white">
                {m.avatar}
              </div>
              <div className="flex-1">
                <div className="font-bold">{m.name}</div>
                <div className="text-xs text-white/40" dir="ltr">{m.email}</div>
              </div>
              <div className="text-left">
                <span
                  className={`text-xs px-3 py-1 rounded-full border ${
                    m.role === 'OWNER'
                      ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                      : m.role === 'ADMIN'
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      : 'bg-white/5 text-white/50 border-white/10'
                  }`}
                >
                  {m.role === 'OWNER' ? 'مالک' : m.role === 'ADMIN' ? 'مدیر' : 'عضو'}
                </span>
                <div className="text-[10px] text-white/30 mt-1">عضویت: {m.joinedAt}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0a0e17] border border-white/10 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black">دعوت عضو جدید</h2>
              <button
                onClick={() => setShowInvite(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">ایمیل</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  dir="ltr"
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#6a8dff]"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">نقش</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#6a8dff]"
                >
                  <option value="MEMBER">عضو</option>
                  <option value="ADMIN">مدیر</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowInvite(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 font-bold text-sm hover:bg-white/10"
                >
                  انصراف
                </button>
                <button
                  onClick={() => {
                    setShowInvite(false);
                    setInviteEmail('');
                  }}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#6a8dff] to-[#b46eff] font-bold text-sm hover:opacity-90"
                >
                  📨 ارسال دعوت
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}