'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  isActive: boolean;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function createKey() {
    if (!newKeyName.trim()) return;
    const key = `asha_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    setCreatedKey(key);
    setKeys((prev) => [
      {
        id: Math.random().toString(36),
        name: newKeyName,
        prefix: key.substring(0, 12),
        createdAt: new Date().toLocaleDateString('fa-IR'),
        lastUsedAt: null,
        isActive: true,
      },
      ...prev,
    ]);
    setNewKeyName('');
  }

  function copyKey() {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/settings" className="text-sm text-white/40 hover:text-white/70">
        ← بازگشت به تنظیمات
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-black mb-2">کلیدهای API</h1>
          <p className="text-white/50">دسترسی برنامه‌نویسی به آشا</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#6a8dff] to-[#b46eff] font-bold text-sm hover:opacity-90"
        >
          + کلید جدید
        </button>
      </div>

      {/* Info */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4">
        <div className="font-bold text-sm mb-2">🔑 کلید API چیست؟</div>
        <p className="text-xs text-white/60 leading-relaxed">
          کلیدهای API برای دسترسی برنامه‌نویسی به آشا استفاده می‌شوند. با استفاده از آنها می‌توانید ربات‌ها را از اپلیکیشن خودتان کنترل کنید.
        </p>
      </div>

      {/* Created Key Alert */}
      {createdKey && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4">
          <div className="font-bold text-green-400 mb-2">✅ کلید API ساخته شد</div>
          <p className="text-xs text-white/70 mb-3">
            ⚠️ این کلید فقط یک‌بار نمایش داده می‌شود. آن را در جای امنی ذخیره کنید.
          </p>
          <div className="flex gap-2">
            <code
              dir="ltr"
              className="flex-1 bg-black/40 rounded-xl px-4 py-3 text-xs font-mono text-green-400 break-all"
            >
              {createdKey}
            </code>
            <button
              onClick={copyKey}
              className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm"
            >
              {copied ? '✓' : '📋'}
            </button>
          </div>
          <button
            onClick={() => setCreatedKey(null)}
            className="mt-3 text-xs text-white/40 hover:text-white/70"
          >
            فهمیدم، بستن
          </button>
        </div>
      )}

      {/* Keys List */}
      <div className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="font-bold">کلیدهای فعال ({keys.length})</h2>
        </div>

        {keys.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-4">🔑</div>
            <div className="font-bold mb-2">هنوز کلید API نساخته‌اید</div>
            <p className="text-sm text-white/50 mb-6">
              برای استفاده از API آشا، اولین کلید خود را بسازید
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#6a8dff] to-[#b46eff] font-bold text-sm hover:opacity-90"
            >
              + ساخت اولین کلید
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {keys.map((key) => (
              <div key={key.id} className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 grid place-items-center text-xl">
                  🔑
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">{key.name}</div>
                  <code className="text-xs text-white/40 font-mono" dir="ltr">
                    {key.prefix}••••••••
                  </code>
                </div>
                <div className="text-left text-xs text-white/40">
                  <div>ساخته: {key.createdAt}</div>
                  <div className="mt-1 text-green-400">● فعال</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0a0e17] border border-white/10 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black">کلید جدید</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">نام کلید</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="مثال: Production Server"
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#6a8dff]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 font-bold text-sm hover:bg-white/10"
                >
                  انصراف
                </button>
                <button
                  onClick={() => {
                    createKey();
                    setShowCreate(false);
                  }}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#6a8dff] to-[#b46eff] font-bold text-sm hover:opacity-90"
                >
                  🔑 ساخت کلید
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}