'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, extractError } from '@/lib/api';

// ============================================================
// Interfaces
// ============================================================
interface Bot {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string | null;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  model: string;
  isPremium: boolean;
  isActive: boolean;
  isTemplate: boolean;
  createdAt: string;
  cluster?: {
    id: string;
    name: string;
    slug: string;
    icon: string;
    color: string;
  } | null;
  brains?: Array<{
    brain: {
      id: string;
      name: string;
      slug: string;
      icon: string;
      color: string;
      isCentral: boolean;
    };
  }>;
}

interface Stats {
  messagesToday: number;
  conversationsTotal: number;
  conversationsToday: number;
  tokensToday: number;
  tokensIn: number;
  tokensOut: number;
  costToday: number;
  runStatus: string;
  lastRunAt: string | null;
  lastTask: string | null;
  recentMessages: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: string;
    conversationId: string;
  }>;
}

interface Conversation {
  id: string;
  sessionId: string;
  title: string;
  messageCount: number;
  lastMessage: string;
  lastMessageAt: string;
}

interface Output {
  id: string;
  type: string;
  title: string;
  description: string | null;
  value: number | null;
  unit: string | null;
  status: string;
  createdAt: string;
}

const RUN_STATUS: Record<string, { label: string; color: string; icon: string }> = {
  ACTIVE: { label: 'فعال', color: '#4ade80', icon: '🟢' },
  QUEUED: { label: 'در صف', color: '#f59e0b', icon: '🟡' },
  IDLE: { label: 'آماده', color: '#6b7280', icon: '⚪' },
  DISABLED: { label: 'غیرفعال', color: '#ef4444', icon: '🔴' },
  FAILED: { label: 'خطا', color: '#ef4444', icon: '⚠️' },
};

type TabKey = 'overview' | 'conversations' | 'settings' | 'channels' | 'brains' | 'outputs';

// ============================================================
// Component
// ============================================================
export default function BotDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [bot, setBot] = useState<Bot | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [liveMode, setLiveMode] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (id) {
      loadAll();
      if (liveMode) {
        intervalRef.current = setInterval(loadStats, 8000);
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [id, liveMode]);

  async function loadAll() {
    try {
      setLoading(true);
      setError('');
      const [botRes, statsRes, convRes, outRes] = await Promise.all([
        api.get(`/api/bots/${id}`),
        api.get(`/api/bots/${id}/stats`),
        api.get(`/api/bots/${id}/conversations?limit=20`),
        api.get(`/api/bots/${id}/outputs?limit=20`),
      ]);
      setBot(botRes.data);
      setStats(statsRes.data);
      setConversations(convRes.data.items || []);
      setOutputs(outRes.data.items || []);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    if (!id) return;
    try {
      const res = await api.get(`/api/bots/${id}/stats`);
      setStats(res.data);
    } catch (err) {
      console.error('Stats update failed:', err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-white/20 border-t-[#6a8dff] rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !bot) {
    return (
      <div className="text-center py-20">
        <div className="text-red-400 mb-4">{error || 'ربات یافت نشد'}</div>
        <Link href="/bots" className="text-[#6a8dff] hover:underline">
          ← بازگشت به لیست ربات‌ها
        </Link>
      </div>
    );
  }

  const runStatus = RUN_STATUS[stats?.runStatus || 'IDLE'] || RUN_STATUS.IDLE;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Back */}
      <Link
        href={bot.cluster ? `/clusters/${bot.cluster.slug}` : '/bots'}
        className="text-sm text-white/40 hover:text-white/70 transition-colors inline-block"
      >
        ← بازگشت
      </Link>

      {/* ============ Header ============ */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-6">
        {bot.cluster && (
          <div
            className="absolute top-0 left-0 w-full h-1"
            style={{ background: bot.cluster.color }}
          />
        )}

        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl border border-white/10"
            style={{
              background: bot.cluster ? `${bot.cluster.color}15` : 'rgba(255,255,255,0.05)',
            }}
          >
            {bot.icon}
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-3xl font-black">{bot.name}</h1>
              {bot.isPremium && (
                <span className="text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-3 py-1 rounded-full">
                  ⭐ طلایی
                </span>
              )}
              <span
                className="text-xs px-3 py-1 rounded-full border flex items-center gap-1.5"
                style={{
                  background: `${runStatus.color}15`,
                  borderColor: `${runStatus.color}40`,
                  color: runStatus.color,
                }}
              >
                {runStatus.icon} {runStatus.label}
              </span>
            </div>
            <p className="text-white/50 leading-relaxed max-w-2xl mb-3">
              {bot.description || 'بدون توضیحات'}
            </p>
            {bot.cluster && (
              <Link
                href={`/clusters/${bot.cluster.slug}`}
                className="inline-flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
                style={{ color: bot.cluster.color }}
              >
                <span>{bot.cluster.icon}</span>
                <span>{bot.cluster.name}</span>
              </Link>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href={`/chat/${bot.id}`}>
              <button className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6a8dff] to-[#b46eff] font-bold text-sm hover:opacity-90 transition-opacity">
                💬 شروع گفتگو
              </button>
            </Link>
            <button className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 font-bold text-sm hover:bg-white/10 transition-colors">
              ✏️ ویرایش
            </button>
          </div>
        </div>
      </div>

      {/* ============ Live Stats ============ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatBox icon="💬" label="پیام امروز" value={stats?.messagesToday || 0} color="#6a8dff" />
        <StatBox icon="🗣️" label="مکالمات" value={stats?.conversationsTotal || 0} color="#b46eff" />
        <StatBox icon="📅" label="امروز" value={stats?.conversationsToday || 0} color="#39d7e7" />
        <StatBox
          icon="🔤"
          label="توکن"
          value={formatNumber(stats?.tokensToday || 0)}
          color="#4ade80"
        />
        <StatBox
          icon="💰"
          label="هزینه"
          value={`$${(stats?.costToday || 0).toFixed(4)}`}
          color="#f59e0b"
        />
        <StatBox
          icon={runStatus.icon}
          label="وضعیت"
          value={runStatus.label}
          color={runStatus.color}
        />
      </div>

      {/* ============ Tabs ============ */}
      <div className="border-b border-white/10">
        <div className="flex gap-1 overflow-x-auto">
          {[
            { key: 'overview', label: '📊 نمای کلی' },
            { key: 'conversations', label: `💬 مکالمات (${conversations.length})` },
            { key: 'outputs', label: `📤 خروجی‌ها (${outputs.length})` },
            { key: 'brains', label: `🧠 مغزها (${bot.brains?.length || 0})` },
            { key: 'channels', label: '📱 کانال‌ها' },
            { key: 'settings', label: '🔧 تنظیمات' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={`px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-[#6a8dff] text-[#6a8dff]'
                  : 'border-transparent text-white/40 hover:text-white/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ============ Tab Content ============ */}
      <div className="min-h-[300px]">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Info Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InfoCard label="مدل" value={bot.model} mono />
              <InfoCard label="دما" value={bot.temperature.toString()} />
              <InfoCard label="حداکثر توکن" value={bot.maxTokens.toLocaleString('fa-IR')} />
              <InfoCard label="شناسه" value={bot.slug} mono small />
            </div>

            {/* System Prompt */}
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white/40 mb-4">دستور سیستم (System Prompt)</h3>
              <div className="bg-black/30 rounded-xl p-5 text-sm leading-relaxed text-white/80 whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
                {bot.systemPrompt}
              </div>
            </div>

            {/* Recent Messages */}
            {stats && stats.recentMessages.length > 0 && (
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white/40 mb-4">
                  آخرین پیام‌ها ({stats.recentMessages.length})
                </h3>
                <div className="space-y-3">
                  {stats.recentMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-xl ${
                        msg.role === 'user'
                          ? 'bg-[#6a8dff]/10 border border-[#6a8dff]/20'
                          : 'bg-white/[0.03] border border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5 text-xs">
                        <span className="font-bold">
                          {msg.role === 'user' ? '👤 کاربر' : '🤖 ربات'}
                        </span>
                        <span className="text-white/30">
                          {new Date(msg.createdAt).toLocaleString('fa-IR')}
                        </span>
                      </div>
                      <div className="text-sm text-white/80 line-clamp-2">{msg.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'conversations' && (
          <div>
            {conversations.length === 0 ? (
              <div className="text-center py-16 text-white/40 bg-white/[0.02] rounded-2xl border border-white/10">
                هنوز مکالمه‌ای ثبت نشده
              </div>
            ) : (
              <div className="space-y-3">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold truncate">{conv.title}</h3>
                          <span className="text-xs text-white/40 whitespace-nowrap">
                            {conv.messageCount} پیام
                          </span>
                        </div>
                        <p className="text-sm text-white/50 line-clamp-2">{conv.lastMessage}</p>
                      </div>
                      <div className="text-xs text-white/30 whitespace-nowrap">
                        {new Date(conv.lastMessageAt).toLocaleDateString('fa-IR')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'outputs' && (
          <div>
            {outputs.length === 0 ? (
              <div className="text-center py-16 text-white/40 bg-white/[0.02] rounded-2xl border border-white/10">
                هنوز خروجی‌ای ثبت نشده
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {outputs.map((out) => (
                  <div
                    key={out.id}
                    className="bg-white/[0.03] border border-white/10 rounded-2xl p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                        {out.type}
                      </span>
                      <span className="text-[10px] text-white/30">
                        {new Date(out.createdAt).toLocaleDateString('fa-IR')}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm mb-1">{out.title}</h3>
                    {out.description && (
                      <p className="text-xs text-white/50 line-clamp-2 mb-2">{out.description}</p>
                    )}
                    {out.value !== null && (
                      <div className="text-sm font-bold text-green-400">
                        {out.value.toLocaleString('fa-IR')} {out.unit}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'brains' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bot.brains && bot.brains.length > 0 ? (
              bot.brains.map((bb) => (
                <div
                  key={bb.brain.id}
                  className="border rounded-2xl p-5"
                  style={{
                    background: `${bb.brain.color}10`,
                    borderColor: `${bb.brain.color}40`,
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{bb.brain.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold" style={{ color: bb.brain.color }}>
                          {bb.brain.name}
                        </h3>
                        {bb.brain.isCentral && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10">
                            مرکزی
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-white/40 mt-1">{bb.brain.slug}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 text-center py-16 text-white/40 bg-white/[0.02] rounded-2xl border border-white/10">
                مغزی متصل نیست
              </div>
            )}
          </div>
        )}

        {activeTab === 'channels' && (
          <div className="text-center py-16 text-white/40 bg-white/[0.02] rounded-2xl border border-white/10">
            <div className="text-4xl mb-4">📱</div>
            <div className="text-lg font-bold mb-2">مدیریت کانال‌ها</div>
            <div className="text-sm">این بخش به‌زودی اضافه می‌شود — اتصال ربات به تلگرام، واتساپ، وب‌چت و ...</div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            <InfoCard label="مدل" value={bot.model} mono />
            <InfoCard label="دما (Temperature)" value={bot.temperature.toString()} />
            <InfoCard label="حداکثر توکن" value={bot.maxTokens.toLocaleString('fa-IR')} />
            <InfoCard label="دستور سیستم" value={bot.systemPrompt.slice(0, 200) + '...'} />
            <div className="text-center py-8 text-white/40 text-sm">
              ویرایش پیشرفته به‌زودی...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Helper Components
// ============================================================
function StatBox({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{icon}</span>
        <span className="text-xs text-white/40">{label}</span>
      </div>
      <div className="text-xl font-black" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  mono,
  small,
}: {
  label: string;
  value: string;
  mono?: boolean;
  small?: boolean;
}) {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
      <div className="text-xs text-white/40 mb-1">{label}</div>
      <div
        className={`${mono ? 'font-mono' : 'font-bold'} ${small ? 'text-xs truncate' : ''}`}
      >
        {value}
      </div>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}