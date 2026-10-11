const fs = require('fs');
const path = require('path');

const targetFile = path.join(
  'C:',
  'Users',
  'K.ali',
  'Desktop',
  'robot',
  'bot-platform',
  'apps',
  'web',
  'src',
  'app',
  '(app)',
  'channels',
  'page.tsx'
);

const content = `'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConnectModal } from '@/components/ui/connect-modal';
import {
  channelsApi,
  ChannelConnection,
  ChannelStats,
  CHANNEL_COLORS,
  ChannelType,
} from '@/lib/api-channels';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

interface Bot {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

export default function ChannelsPage() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<ChannelConnection[]>([]);
  const [stats, setStats] = useState<ChannelStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [bots, setBots] = useState<Bot[]>([]);
  const [botModalOpen, setBotModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [connectionsRes, statsRes] = await Promise.all([
        channelsApi.getConnections(),
        channelsApi.getStats(),
      ]);
      setConnections(connectionsRes.connections || []);
      setStats(statsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری اطلاعات');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenConnect = async () => {
    try {
      const { data } = await (await import('@/lib/api')).api.get('/api/bots');
      const botsList = (data as any).bots || (data as any).data || data || [];
      setBots(Array.isArray(botsList) ? botsList : []);
      if (botsList.length === 0) {
        setError('ابتدا باید یک ربات بسازید');
        return;
      }
      setBotModalOpen(true);
    } catch (err) {
      setError('خطا در بارگذاری ربات‌ها');
    }
  };

  const handleSelectBot = (botId: string) => {
    setSelectedBotId(botId);
    setBotModalOpen(false);
    setModalOpen(true);
  };

  const handleToggleConnection = async (connection: ChannelConnection) => {
    try {
      const updated = await channelsApi.toggleConnection(
        connection.id,
        !connection.isActive
      );
      setConnections((prev) =>
        prev.map((c) => (c.id === connection.id ? updated : c))
      );
      const statsRes = await channelsApi.getStats();
      setStats(statsRes);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'خطا در تغییر وضعیت');
    }
  };

  const handleDeleteConnection = async (connection: ChannelConnection) => {
    if (!confirm('آیا از حذف این اتصال مطمئن هستید؟')) return;
    try {
      await channelsApi.deleteConnection(connection.id);
      setConnections((prev) => prev.filter((c) => c.id !== connection.id));
      const statsRes = await channelsApi.getStats();
      setStats(statsRes);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'خطا در حذف');
    }
  };

  const handleTestConnection = async (connection: ChannelConnection) => {
    try {
      const result = await channelsApi.testConnection(connection.id);
      alert(result.success ? 'اتصال موفق' : 'اتصال ناموفق');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'خطا در تست');
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white mb-1">📡 کانال‌ها</h1>
          <p className="text-sm text-white/50">
            اتصالات ربات‌های خود به کانال‌های پیام‌رسان
          </p>
        </div>
        <Button onClick={handleOpenConnect} size="lg">
          ➕ اتصال کانال جدید
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon="🔌" label="کل اتصالات" value={stats.totalConnections} color="#6a8dff" />
          <StatCard icon="✅" label="فعال" value={stats.activeConnections} color="#22c55e" />
          <StatCard icon="⏸️" label="غیرفعال" value={stats.inactiveConnections} color="#ef4444" />
        </div>
      )}

      {error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <div className="flex items-start gap-3 text-red-400">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <div className="font-bold mb-1">خطا</div>
              <div className="text-sm">{error}</div>
            </div>
            <button onClick={() => setError('')} className="text-white/40 hover:text-white">✕</button>
          </div>
        </Card>
      )}

      {loading ? (
        <Card className="p-12 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-2 border-white/20 border-t-[#6a8dff] rounded-full animate-spin mb-4" />
          <p className="text-white/50 text-sm">در حال بارگذاری...</p>
        </Card>
      ) : connections.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="font-bold text-white mb-2">هیچ کانالی متصل نیست</h3>
          <p className="text-sm text-white/50 mb-6">
            برای شروع، یک کانال جدید متصل کنید
          </p>
          <Button onClick={handleOpenConnect}>➕ اتصال اولین کانال</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {connections.map((connection) => (
            <ConnectionCard
              key={connection.id}
              connection={connection}
              onToggle={() => handleToggleConnection(connection)}
              onDelete={() => handleDeleteConnection(connection)}
              onTest={() => handleTestConnection(connection)}
            />
          ))}
        </div>
      )}

      {botModalOpen && (
        <BotSelectModal
          bots={bots}
          onSelect={handleSelectBot}
          onClose={() => setBotModalOpen(false)}
        />
      )}

      {selectedBotId && (
        <ConnectModal
          botId={selectedBotId}
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedBotId(null);
          }}
          onSuccess={() => {
            loadData();
            setModalOpen(false);
            setSelectedBotId(null);
          }}
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <Card className="flex items-center gap-4">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
        style={{ backgroundColor: color + '20', border: '1px solid ' + color + '40' }}
      >
        {icon}
      </div>
      <div>
        <div className="text-xs text-white/50 mb-0.5">{label}</div>
        <div className="text-2xl font-black" style={{ color }}>{value}</div>
      </div>
    </Card>
  );
}

function ConnectionCard({
  connection,
  onToggle,
  onDelete,
  onTest,
}: {
  connection: ChannelConnection;
  onToggle: () => void;
  onDelete: () => void;
  onTest: () => void;
}) {
  const channelType = connection.channel?.type as ChannelType | undefined;
  const color = channelType ? CHANNEL_COLORS[channelType] : '#6a8dff';

  return (
    <Card className="hover:border-white/20 transition">
      <div className="flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
          style={{ backgroundColor: color + '20', border: '2px solid ' + color + '40' }}
        >
          {connection.channel?.icon || '💬'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-white truncate">
              {connection.channel?.name || 'کانال ناشناخته'}
            </h3>
            <span
              className={cn(
                'text-[10px] px-2 py-0.5 rounded-full font-bold',
                connection.isActive
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              )}
            >
              {connection.isActive ? '● فعال' : '○ غیرفعال'}
            </span>
          </div>
          <div className="text-xs text-white/50 space-y-0.5">
            {connection.bot && <div>🤖 ربات: {connection.bot.name}</div>}
            {connection.webhookUrl && <div className="truncate">🔗 {connection.webhookUrl}</div>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onTest}
            title="تست"
            className="w-9 h-9 rounded-lg bg-white/5 hover:bg-blue-500/20 border border-white/10 text-white/60 hover:text-blue-400 transition flex items-center justify-center"
          >
            🔍
          </button>
          <button
            onClick={onToggle}
            title={connection.isActive ? 'غیرفعال' : 'فعال'}
            className={cn(
              'w-9 h-9 rounded-lg border transition flex items-center justify-center',
              connection.isActive
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-green-500/10 border-green-500/30 text-green-400'
            )}
          >
            {connection.isActive ? '⏸️' : '▶️'}
          </button>
          <button
            onClick={onDelete}
            title="حذف"
            className="w-9 h-9 rounded-lg bg-red-500/5 hover:bg-red-500/20 border border-white/10 text-white/60 hover:text-red-400 transition flex items-center justify-center"
          >
            🗑️
          </button>
        </div>
      </div>
    </Card>
  );
}

function BotSelectModal({
  bots,
  onSelect,
  onClose,
}: {
  bots: Bot[];
  onSelect: (botId: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <Card className="p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/5 text-white/60 hover:text-white transition flex items-center justify-center"
          >
            ✕
          </button>
          <h2 className="text-lg font-black text-white mb-1 text-center">انتخاب ربات</h2>
          <p className="text-sm text-white/50 text-center mb-6">
            کانال به کدام ربات متصل شود؟
          </p>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {bots.map((bot) => (
              <button
                key={bot.id}
                onClick={() => onSelect(bot.id)}
                className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#6a8dff]/60 hover:bg-white/[0.06] transition flex items-center gap-3 text-right"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6a8dff] to-[#b46eff] flex items-center justify-center text-xl flex-shrink-0">
                  {bot.icon || '🤖'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white truncate">{bot.name}</div>
                  <div className="text-xs text-white/40 truncate">@{bot.slug}</div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(targetFile, content, 'utf8');
console.log('OK - File written:', targetFile);
console.log('Size:', content.length, 'bytes');