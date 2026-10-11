'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, extractError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface Totals {
  clusters: number;
  brains: number;
  bots: number;
  premiumBots: number;
  regularBots: number;
  botBrains: number;
  conversations: number;
  conversationsToday: number;
  messages: number;
  messagesToday: number;
  users: number;
  organizations: number;
  plans: number;
  subscriptions: number;
  apiKeys: number;
  channelsTotal: number;
  channelsActive: number;
  channelsConnected: number;
  channelsIranian: number;
}

interface ClusterStat {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  sortOrder: number;
  totalBots: number;
  activeBots: number;
  premiumBots: number;
}

interface ChannelStat {
  id: string;
  name: string;
  slug: string;
  type: string;
  icon: string;
  isActive: boolean;
  isConnected: boolean;
}

interface Activity {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  bot: { id: string; name: string; icon: string } | null;
  user: { id: string; name: string } | null;
}

interface DashboardData {
  totals: Totals;
  clusters: ClusterStat[];
  channels: ChannelStat[];
  recentActivities: Activity[];
}

function StatCard({
  icon,
  label,
  value,
  color,
  sublabel,
  href,
}: {
  icon: string;
  label: string;
  value: number | string;
  color: string;
  sublabel?: string;
  href?: string;
}) {
  const content = (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all hover:scale-[1.02] h-full">
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-3xl font-black mb-1" style={{ color }}>
        {typeof value === 'number' ? value.toLocaleString('fa-IR') : value}
      </div>
      <div className="text-xs text-white/50">{label}</div>
      {sublabel && <div className="text-[10px] text-white/30 mt-1">{sublabel}</div>}
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'همین حالا';
  if (mins < 60) return `${mins} دقیقه پیش`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ساعت پیش`;
  const days = Math.floor(hours / 24);
  return `${days} روز پیش`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const res = await api.get('/api/dashboard/stats');
      setData(res.data);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-white/20 border-t-[#6a8dff] rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20">
        <div className="text-red-400 mb-4">{error || 'خطا در بارگذاری'}</div>
        <button onClick={loadData} className="text-[#6a8dff] hover:underline">
          دوباره تلاش کن
        </button>
      </div>
    );
  }

  const { totals, clusters, channels, recentActivities } = data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black mb-2">داشبورد</h1>
        <p className="text-white/50">
          خوش آمدید، <span className="text-white/80">{user?.name || 'Admin'}</span> 👋
        </p>
      </div>

      {/* Totals Grid */}
      <div>
        <h2 className="text-sm font-bold text-white/40 mb-3">آمار کل پلتفرم</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <StatCard icon="🏢" label="خوشه" value={totals.clusters} color="#6a8dff" href="/clusters" />
          <StatCard icon="🧠" label="مغز" value={totals.brains} color="#39d7e7" />
          <StatCard
            icon="🤖"
            label="ربات"
            value={totals.bots}
            color="#b46eff"
            sublabel={`${totals.premiumBots} پرمیوم · ${totals.regularBots} عادی`}
            href="/bots"
          />
          <StatCard icon="🔗" label="اتصال ربات-مغز" value={totals.botBrains} color="#4ade80" />
          <StatCard
            icon="💬"
            label="مکالمه"
            value={totals.conversations}
            color="#f59e0b"
            sublabel={`${totals.conversationsToday} امروز`}
          />
          <StatCard
            icon="📨"
            label="پیام"
            value={totals.messages}
            color="#ec4899"
            sublabel={`${totals.messagesToday} امروز`}
          />
        </div>
      </div>

      {/* Channels Section */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-bold">📱 کانال‌ها ({channels?.length || 0})</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/30">
              ✓ {totals.channelsActive} فعال
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              ● {totals.channelsConnected} متصل
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30">
              🇮🇷 {totals.channelsIranian} ایرانی
            </span>
          </div>
          <Link href="/channels" className="text-sm text-[#6a8dff] hover:underline">
            مدیریت کانال‌ها ←
          </Link>
        </div>

        {!channels || channels.length === 0 ? (
          <div className="text-center py-12 text-white/40 bg-white/[0.02] rounded-2xl border border-white/10">
            هنوز کانالی ثبت نشده
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-3">
            {channels.map((ch) => (
              <Link
                key={ch.id}
                href="/channels"
                className={`group relative bg-white/[0.03] border rounded-2xl p-4 hover:border-white/20 transition-all hover:scale-[1.02] ${
                  ch.isActive ? 'border-white/10' : 'border-red-500/20 opacity-50'
                }`}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">{ch.icon}</div>
                  <div className="text-xs font-bold truncate group-hover:text-[#6a8dff] transition-colors">
                    {ch.name}
                  </div>
                  {ch.isActive && ch.isConnected && (
                    <div className="text-[9px] text-green-400 mt-1">● متصل</div>
                  )}
                  {ch.isActive && !ch.isConnected && (
                    <div className="text-[9px] text-gray-400 mt-1">○ قطع</div>
                  )}
                  {!ch.isActive && (
                    <div className="text-[9px] text-red-400 mt-1">✕ غیرفعال</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Secondary Stats */}
      <div>
        <h2 className="text-sm font-bold text-white/40 mb-3">آمار سیستم</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard icon="👥" label="کاربر" value={totals.users} color="#8b5cf6" />
          <StatCard icon="🏛️" label="سازمان" value={totals.organizations} color="#06b6d4" />
          <StatCard icon="📋" label="پلن" value={totals.plans} color="#10b981" />
          <StatCard icon="💳" label="اشتراک" value={totals.subscriptions} color="#f97316" />
          <StatCard icon="🔑" label="API Key" value={totals.apiKeys} color="#eab308" />
        </div>
      </div>

      {/* Clusters Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">خوشه‌ها ({clusters.length})</h2>
          <Link href="/clusters" className="text-sm text-[#6a8dff] hover:underline">
            مشاهده همه ←
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {clusters.map((c) => (
            <Link
              key={c.id}
              href={`/clusters/${c.slug}`}
              className="group bg-white/[0.03] border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all hover:scale-[1.02]"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ background: `${c.color}22` }}
                >
                  {c.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate group-hover:text-[#6a8dff] transition-colors">
                    {c.name}
                  </div>
                  <div className="text-xs text-white/40">{c.totalBots} ربات</div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-green-400">
                  <span>🟢</span>
                  <span>{c.activeBots}</span>
                </span>
                {c.premiumBots > 0 && (
                  <span className="flex items-center gap-1 text-yellow-400">
                    <span>⭐</span>
                    <span>{c.premiumBots}</span>
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activities */}
      <div>
        <h2 className="text-lg font-bold mb-4">فعالیت‌های اخیر</h2>

        {recentActivities.length === 0 ? (
          <div className="text-center py-12 text-white/40 bg-white/[0.02] rounded-2xl border border-white/10">
            هیچ فعالیتی ثبت نشده
          </div>
        ) : (
          <div className="space-y-2">
            {recentActivities.map((a) => (
              <div
                key={a.id}
                className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex items-center gap-4"
              >
                {a.bot ? (
                  <span className="text-2xl shrink-0">{a.bot.icon}</span>
                ) : (
                  <span className="text-2xl shrink-0">🔵</span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{a.message}</div>
                  <div className="text-xs text-white/40 mt-1">
                    {a.bot && <span>{a.bot.name} · </span>}
                    {a.user && <span>{a.user.name} · </span>}
                    <span>{timeAgo(a.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-bold mb-4">دسترسی سریع</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/clusters">
            <div className="bg-gradient-to-br from-[#6a8dff]/10 to-[#b46eff]/10 border border-[#6a8dff]/30 rounded-2xl p-5 hover:scale-[1.02] transition-transform cursor-pointer">
              <div className="text-3xl mb-2">🏢</div>
              <div className="font-bold text-sm">خوشه‌ها</div>
              <div className="text-xs text-white/40 mt-1">
                {totals.clusters} خوشه سازمان‌یافته
              </div>
            </div>
          </Link>

          <Link href="/bots">
            <div className="bg-gradient-to-br from-[#b46eff]/10 to-[#6a8dff]/10 border border-[#b46eff]/30 rounded-2xl p-5 hover:scale-[1.02] transition-transform cursor-pointer">
              <div className="text-3xl mb-2">🤖</div>
              <div className="font-bold text-sm">ربات‌ها</div>
              <div className="text-xs text-white/40 mt-1">
                {totals.bots} ربات آماده
              </div>
            </div>
          </Link>

          <Link href="/channels">
            <div className="bg-gradient-to-br from-[#39d7e7]/10 to-[#6a8dff]/10 border border-[#39d7e7]/30 rounded-2xl p-5 hover:scale-[1.02] transition-transform cursor-pointer">
              <div className="text-3xl mb-2">📱</div>
              <div className="font-bold text-sm">کانال‌ها</div>
              <div className="text-xs text-white/40 mt-1">
                {totals.channelsTotal} کانال
              </div>
            </div>
          </Link>

          <Link href="/chat">
            <div className="bg-gradient-to-br from-[#f59e0b]/10 to-[#ec4899]/10 border border-[#f59e0b]/30 rounded-2xl p-5 hover:scale-[1.02] transition-transform cursor-pointer">
              <div className="text-3xl mb-2">💬</div>
              <div className="font-bold text-sm">گفتگو</div>
              <div className="text-xs text-white/40 mt-1">چت با ربات‌ها</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}