'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, extractError } from '@/lib/api';

// ============================================================
// Interfaces
// ============================================================
interface Field {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url';
  required: boolean;
  placeholder?: string;
  help?: string;
}

interface AdapterInfo {
  type: string;
  name: string;
  icon: string;
  description: string;
  category: 'IRANIAN' | 'FOREIGN' | 'INTERNAL';
  fields: Field[];
  docs?: string;
}

interface ChannelConfig {
  id: string;
  name: string;
  slug: string;
  type: string;
  icon: string;
  isActive: boolean;
  isConnected: boolean;
  webhookSecret: string | null;
  fieldsStatus: Record<string, boolean>;
  info: AdapterInfo | null;
}

// ============================================================
// Main Page
// ============================================================
export default function ChannelConfigPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [config, setConfig] = useState<ChannelConfig | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settingWebhook, setSettingWebhook] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (slug) loadConfig();
  }, [slug]);

  async function loadConfig() {
    try {
      setLoading(true);
      const res = await api.get(`/api/channels/${slug}/config`);
      setConfig(res.data);
    } catch (err) {
      setMessage({ type: 'error', text: extractError(err) });
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig() {
    if (!config) return;
    try {
      setSaving(true);
      setMessage(null);

      // فقط فیلدهای پر شده رو ذخیره کن (اگه خالی بود، مقدار قبلی حفظ بشه)
      const toSave: Record<string, string> = {};
      for (const field of config.info?.fields || []) {
        if (credentials[field.key]?.trim()) {
          toSave[field.key] = credentials[field.key].trim();
        }
      }

      if (Object.keys(toSave).length === 0) {
        setMessage({ type: 'error', text: 'حداقل یک فیلد را پر کنید' });
        return;
      }

      await api.post(`/api/channels/${slug}/config`, {
        credentials: toSave,
      });

      setMessage({ type: 'success', text: '✅ پیکربندی ذخیره شد' });
      setCredentials({});
      await loadConfig();
    } catch (err) {
      setMessage({ type: 'error', text: extractError(err) });
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    try {
      setTesting(true);
      setMessage(null);
      const res = await api.post(`/api/channels/${slug}/test`);
      if (res.data.success) {
        setMessage({ type: 'success', text: '✅ ' + res.data.message });
        await loadConfig();
      } else {
        setMessage({ type: 'error', text: '❌ ' + (res.data.error || 'اتصال ناموفق') });
      }
    } catch (err) {
      setMessage({ type: 'error', text: extractError(err) });
    } finally {
      setTesting(false);
    }
  }

  async function setupWebhook() {
    try {
      setSettingWebhook(true);
      setMessage(null);
      const res = await api.post(`/api/channels/${slug}/setup-webhook`);
      if (res.data.success) {
        setMessage({ type: 'success', text: '✅ Webhook ثبت شد' });
        await loadConfig();
      } else {
        setMessage({ type: 'error', text: '❌ ' + (res.data.error || 'خطا') });
      }
    } catch (err) {
      setMessage({ type: 'error', text: extractError(err) });
    } finally {
      setSettingWebhook(false);
    }
  }

  async function toggleActive() {
    if (!config) return;
    try {
      setMessage(null);
      await api.post(`/api/channels/${config.id}/toggle-active`);
      await loadConfig();
      setMessage({
        type: 'success',
        text: config.isActive ? 'کانال غیرفعال شد' : 'کانال فعال شد',
      });
    } catch (err) {
      setMessage({ type: 'error', text: extractError(err) });
    }
  }

  async function clearConfig() {
    if (!confirm('پیکربندی و credentials پاک شود؟')) return;
    try {
      await api.delete(`/api/channels/${slug}/config`);
      setCredentials({});
      await loadConfig();
      setMessage({ type: 'success', text: 'پیکربندی پاک شد' });
    } catch (err) {
      setMessage({ type: 'error', text: extractError(err) });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-white/20 border-t-[#6a8dff] rounded-full animate-spin" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-20">
        <div className="text-red-400 mb-4">کانال یافت نشد</div>
        <Link href="/channels" className="text-[#6a8dff] hover:underline">
          ← بازگشت به کانال‌ها
        </Link>
      </div>
    );
  }

  const categoryBadge =
    config.info?.category === 'IRANIAN'
      ? '🇮🇷 ایرانی'
      : config.info?.category === 'FOREIGN'
      ? '🌍 خارجی'
      : '🌐 داخلی';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <Link
        href="/channels"
        className="text-sm text-white/40 hover:text-white/70 transition-colors inline-block"
      >
        ← بازگشت به کانال‌ها
      </Link>

      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-6">
        <div className="flex items-start gap-5">
          <div
            className={`w-20 h-20 rounded-3xl flex items-center justify-center text-5xl shrink-0 border ${
              config.isActive
                ? 'bg-white/5 border-white/10'
                : 'bg-red-500/5 border-red-500/20 grayscale'
            }`}
          >
            {config.icon}
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-3xl font-black">{config.name}</h1>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  config.isActive
                    ? 'bg-green-500/10 text-green-400 border-green-500/30'
                    : 'bg-red-500/10 text-red-400 border-red-500/30'
                }`}
              >
                {config.isActive ? '✓ فعال' : '✕ غیرفعال'}
              </span>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  config.isConnected
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                    : 'bg-gray-500/10 text-gray-400 border-gray-500/30'
                }`}
              >
                {config.isConnected ? '● متصل' : '○ قطع'}
              </span>
              <span className="text-xs px-3 py-1 rounded-full bg-white/5 text-white/50">
                {categoryBadge}
              </span>
            </div>
            <p className="text-white/50 text-sm">{config.info?.description}</p>
            {config.info?.docs && (
              <a
                href={config.info.docs}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#6a8dff] hover:underline mt-2 inline-block"
              >
                📚 مستندات →
              </a>
            )}
          </div>

          <button
            onClick={toggleActive}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              config.isActive
                ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30'
            }`}
          >
            {config.isActive ? '⛔ غیرفعال' : '✅ فعال کن'}
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-2xl border ${
            message.type === 'success'
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Fields */}
      {config.info && config.info.fields.length > 0 ? (
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6">
          <h2 className="text-lg font-bold mb-4">🔧 پیکربندی</h2>

          <div className="space-y-4">
            {config.info.fields.map((field) => {
              const alreadySaved = config.fieldsStatus[field.key];
              return (
                <div key={field.key}>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-bold">
                      {field.label}
                      {field.required && <span className="text-red-400 mr-1">*</span>}
                    </label>
                    {alreadySaved && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/30">
                        ✓ ذخیره شده
                      </span>
                    )}
                  </div>

                  <input
                    type={field.type}
                    value={credentials[field.key] || ''}
                    onChange={(e) =>
                      setCredentials((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    placeholder={
                      alreadySaved
                        ? '•••••••• (برای تغییر مقدار جدید وارد کنید)'
                        : field.placeholder || ''
                    }
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#6a8dff] transition-colors"
                    dir={field.type === 'password' ? 'ltr' : 'auto'}
                  />

                  {field.help && (
                    <p className="text-xs text-white/40 mt-1.5">{field.help}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-white/10">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6a8dff] to-[#b46eff] font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? '⏳ ذخیره...' : '💾 ذخیره پیکربندی'}
            </button>

            <button
              onClick={testConnection}
              disabled={testing}
              className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 font-bold text-sm hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {testing ? '⏳ تست...' : '🔗 تست اتصال'}
            </button>

            <button
              onClick={setupWebhook}
              disabled={settingWebhook || !config.isConnected}
              title={!config.isConnected ? 'ابتدا اتصال را تست کنید' : ''}
              className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 font-bold text-sm hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {settingWebhook ? '⏳ ...' : '📌 ثبت Webhook'}
            </button>

            <button
              onClick={clearConfig}
              className="px-5 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-sm transition-colors mr-auto"
            >
              🗑️ پاک کردن
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 text-center">
          <div className="text-4xl mb-3">✨</div>
          <div className="text-lg font-bold mb-2">این کانال نیازی به پیکربندی ندارد</div>
          <div className="text-sm text-white/50">
            کانال‌های وب‌چت به صورت خودکار با وب‌سایت شما یکپارچه می‌شوند.
          </div>
        </div>
      )}

      {/* Webhook Info */}
      {config.webhookSecret && (
        <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-3xl p-6">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <span>📌</span>
            <span>Webhook ثبت شده</span>
          </h3>
          <div className="bg-black/30 rounded-xl p-4 text-xs font-mono text-cyan-400 break-all">
            {config.webhookSecret}
          </div>
          <p className="text-xs text-white/40 mt-3">
            این URL توسط کانال {config.name} برای دریافت پیام‌ها استفاده می‌شود.
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <span>💡</span>
          <span>راهنما</span>
        </h3>
        <ol className="text-sm text-white/60 space-y-2 list-decimal list-inside">
          <li>توکن/کلیدهای لازم را از پنل کانال دریافت کنید</li>
          <li>مقادیر را در فرم بالا وارد کنید</li>
          <li>دکمه «💾 ذخیره پیکربندی» را بزنید</li>
          <li>دکمه «🔗 تست اتصال» را بزنید تا اتصال تایید شود</li>
          <li>دکمه «📌 ثبت Webhook» را بزنید تا پیام‌ها به آشا برسند</li>
          <li>از صفحه ربات‌ها، ربات را به این کانال متصل کنید</li>
        </ol>
      </div>
    </div>
  );
}