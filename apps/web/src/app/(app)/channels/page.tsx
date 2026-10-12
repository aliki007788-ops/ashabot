'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, extractError } from '@/lib/api';

// ============================================================
// Interfaces
// ============================================================
interface Channel {
  id: string;
  name: string;
  slug: string;
  type: string;
  icon: string;
  isActive: boolean;
  isConnected: boolean;
  category: 'IRANIAN' | 'FOREIGN' | 'OTHER';
  botCount: number;
  connectionCount: number;
  conversationCount: number;
  updatedAt: string;
}

interface Summary {
  total: number;
  active: number;
  inactive: number;
  connected: number;
  disconnected: number;
  iranian: number;
  foreign: number;
  totalBotChannels: number;
}

type FilterKey = 'all' | 'active' | 'inactive' | 'connected' | 'iranian' | 'foreign';

// ============================================================
// Main Page
// ============================================================
export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      const [listRes, summaryRes] = await Promise.all([
        api.get('/api/channels/list'),
        api.get('/api/channels/summary'),
      ]);
      setChannels(listRes.data.items || []);
      setSummary(summaryRes.data);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(channel: Channel) {
    if (toggling) return;
    try {
      setToggling(channel.id);
      const res = await api.post(`/api/channels/${channel.id}/toggle-active`);
      setChannels((prev) =>
        prev.map((c) =>
          c.id === channel.id ? { ...c, isActive: res.data.isActive } : c,
        ),
      );
      // رفرش summary
      const summaryRes = await api.get('/api/channels/summary');
      setSummary(summaryRes.data);
    } catch (err) {
      alert(extractError(err));
    } finally {
      setToggling(null);
    }
  }

  async function toggleConnection(channel: Channel) {
    if (toggling) return;
    if (!channel.isActive) {
      alert('ابتدا کانال را فعال کنید');
      return;
    }
    try {
      setToggling(channel.id);
      const res = await api.post(`/api/channels/${channel.id}/toggle-connection`);
      setChannels((prev) =>
        prev.map((c) =>
          c.id === channel.id ? { ...c, isConnected: res.data.isConnected } : c,
        ),
      );
      const summaryRes = await api.get('/api/channels/summary');
      setSummary(summaryRes.data);
    } catch (err) {
      alert(extractError(err));
    } finally {
      setToggling(null);
    }
  }

  const filtered = channels.filter((c) => {
    if (filter === 'active') return c.isActive;
    if (filter === 'inactive') return !c.isActive;
    if (filter === 'connected') return c.isConnected;
    if (filter === 'iranian') return c.category === 'IRANIAN';
    if (filter === 'foreign') return c.category === 'FOREIGN';
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-white/20 border-t-[#6a8dff] rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <div className="text-red-400 mb-4">{error}</div>
        <button onClick={loadData} className="text-[#6a8dff] hover:underline">
          دوباره تلاش کن
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ============ Header ============ */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#6a8dff]/10 via-[#b46eff]/5 to-transparent p-8">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#6a8dff] to-[#b46eff]" />

        <div className="flex items-center gap-3 mb-4">
          <div className="text-4xl">📱</div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black">
              مدیریت شبکه‌های اجتماعی
            </h1>
            <p className="text-white/50 mt-1">
              یکپارچه‌سازی {summary?.total || 0} پلتفرم — ایرانی و خارجی
            </p>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
          <h3 className="font-bold mb-2 flex items-center gap-2">
            <span>🏗️</span>
            <span>معماری ماژولار</span>
          </h3>
          <p className="text-sm text-white/60 leading-relaxed">
            هر کانال یک ماژول مستقل است. اضافه شدن کانال جدید فقط با اضافه شدن یک ماژول انجام
            می‌شود. ربات‌ها به صورت یکپارچه در همه کانال‌ها فعالیت می‌کنند و لحن برند در همه کانال‌ها
            یکسان حفظ می‌شود.
          </p>
        </div>
      </div>

      {/* ============ Summary ============ */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <SummaryCard icon="📱" label="کل" value={summary.total} color="#6a8dff" />
          <SummaryCard icon="✅" label="فعال" value={summary.active} color="#4ade80" />
          <SummaryCard icon="⛔" label="غیرفعال" value={summary.inactive} color="#ef4444" />
          <SummaryCard icon="🔗" label="متصل" value={summary.connected} color="#39d7e7" />
          <SummaryCard icon="🇮🇷" label="ایرانی" value={summary.iranian} color="#10b981" />
          <SummaryCard icon="🌍" label="خارجی" value={summary.foreign} color="#b46eff" />
        </div>
      )}

      {/* ============ Filters ============ */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { key: 'all', label: 'همه', icon: '📋' },
          { key: 'active', label: 'فعال', icon: '✅' },
          { key: 'inactive', label: 'غیرفعال', icon: '⛔' },
          { key: 'connected', label: 'متصل', icon: '🔗' },
          { key: 'iranian', label: 'ایرانی', icon: '🇮🇷' },
          { key: 'foreign', label: 'خارجی', icon: '🌍' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as FilterKey)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
              filter === f.key
                ? 'bg-[#6a8dff] text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
            }`}
          >
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      {/* ============ Channels Grid ============ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">کانال‌ها ({filtered.length})</h2>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-white/40 bg-white/[0.02] rounded-2xl border border-white/10">
            هیچ کانالی با این فیلتر یافت نشد
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((channel) => (
              <ChannelCard
                key={channel.id}
                channel={channel}
                loading={toggling === channel.id}
                onToggleActive={() => toggleActive(channel)}
                onToggleConnection={() => toggleConnection(channel)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ============ Brand Guardian ============ */}
      <div className="relative overflow-hidden rounded-3xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-transparent p-6">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-orange-500" />

        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-yellow-500/20 flex items-center justify-center text-3xl shrink-0">
            🎭
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="text-xl font-bold">ربات نگهبان شخصیت برند</h3>
              <span className="text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full">
                ⭐ طلایی
              </span>
            </div>
            <p className="text-white/60 text-sm leading-relaxed mb-4">
              این ربات تضمین می‌کند که لحن و شخصیت برند شما در تلگرام، اینستاگرام، سایت، ایمیل،
              پیامک، ایتا، بله و همه کانال‌ها یکسان بماند، در حالی که برای هر کانال شخصی‌سازی می‌شود.
            </p>
            <Link
              href="/bots/cmv1ztra8000w11747zska2f3"
              className="text-xs px-3 py-1.5 rounded-full bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 transition-colors inline-block"
            >
              مشاهده ربات →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Components
// ============================================================
function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{icon}</span>
        <span className="text-xs text-white/40">{label}</span>
      </div>
      <div className="text-2xl font-black" style={{ color }}>
        {value.toLocaleString('fa-IR')}
      </div>
    </div>
  );
}

function ChannelCard({
  channel,
  loading,
  onToggleActive,
  onToggleConnection,
}: {
  channel: Channel;
  loading: boolean;
  onToggleActive: () => void;
  onToggleConnection: () => void;
}) {
  const categoryBadge = channel.category === 'IRANIAN' ? '🇮🇷 ایرانی' : '🌍 خارجی';

  return (
    <div
      className={`group bg-white/[0.03] border rounded-2xl p-5 transition-all ${
        channel.isActive
          ? 'border-white/10 hover:border-white/20 hover:scale-[1.02]'
          : 'border-red-500/20 opacity-60'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl ${
            channel.isActive
              ? 'bg-white/5 border border-white/10'
              : 'bg-red-500/5 border border-red-500/20 grayscale'
          }`}
        >
          {channel.icon}
        </div>
        <div className="flex flex-col items-end gap-1">
          {/* Active Badge */}
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              channel.isActive
                ? 'bg-green-500/10 text-green-400 border-green-500/30'
                : 'bg-red-500/10 text-red-400 border-red-500/30'
            }`}
          >
            {channel.isActive ? '✓ فعال' : '✕ غیرفعال'}
          </span>
          {/* Connected Badge */}
          {channel.isActive && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                channel.isConnected
                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                  : 'bg-gray-500/10 text-gray-400 border-gray-500/30'
              }`}
            >
              {channel.isConnected ? '● متصل' : '○ قطع'}
            </span>
          )}
          <span className="text-[10px] text-white/40">{categoryBadge}</span>
        </div>
      </div>

      {/* Info */}
      <h3 className="font-bold mb-1 group-hover:text-[#6a8dff] transition-colors">
        {channel.name}
      </h3>
      <div className="text-xs text-white/40 mb-3 font-mono">{channel.type.toLowerCase()}</div>

      <div className="flex items-center gap-3 text-xs text-white/40 mb-4">
        <span>🤖 {channel.botCount} ربات</span>
        {channel.conversationCount > 0 && <span>💬 {channel.conversationCount}</span>}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        {/* Toggle Active */}
        <button
          onClick={onToggleActive}
          disabled={loading}
          className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            channel.isActive
              ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30'
          } ${loading ? 'opacity-50 cursor-wait' : ''}`}
        >
          {loading ? '⏳ ...' : channel.isActive ? '⛔ غیرفعال کن' : '✅ فعال کن'}
        </button>

        {/* Toggle Connection (فقط اگه active) */}
        {channel.isActive && (
          <button
            onClick={onToggleConnection}
            disabled={loading}
            className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              channel.isConnected
                ? 'bg-white/5 hover:bg-white/10 border border-white/10'
                : 'bg-gradient-to-r from-[#6a8dff] to-[#b46eff] hover:opacity-90'
            } ${loading ? 'opacity-50 cursor-wait' : ''}`}
          >
            {channel.isConnected ? '🔌 قطع اتصال' : '🔗 اتصال'}
          </button>
        )}
      </div>
    </div>
  );
}