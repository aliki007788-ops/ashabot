'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, extractError } from '@/lib/api';

// ============================================================
// Interfaces
// ============================================================
interface Cluster {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
}

interface BotStatus {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string | null;
  isActive: boolean;
  isPremium: boolean;
  runStatus: 'ACTIVE' | 'QUEUED' | 'IDLE' | 'DISABLED' | 'FAILED';
  lastTask: string | null;
  lastRunAt: string | null;
  durationMs: number | null;
}

interface Stats {
  botCount: number;
  activeBots: number;
  queuedBots: number;
  idleBots: number;
  messagesToday: number;
  outputsToday: number;
  commandsToday: number;
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

interface Command {
  id: string;
  command: string;
  response: string | null;
  status: string;
  createdAt: string;
}

// ============================================================
// CLUSTER_WORKFLOWS — همه 18 خوشه
// ============================================================
const CLUSTER_WORKFLOWS: Record<string, { title: string; steps: string[]; value: string }> = {
  // ============ 10 خوشه اصلی ============
  sales: {
    title: 'فرآیند فروش و تبدیل',
    steps: ['خوش‌آمدگویی', 'شناسایی نیاز', 'پیشنهاد + مقایسه', 'رفع اعتراض', 'نهایی‌سازی'],
    value: 'افزایش نرخ تبدیل و ارزش سبد خرید',
  },
  'lead-generation': {
    title: 'فرآیند مشتری‌یابی',
    steps: ['جذب ترافیک', 'جمع‌آوری اطلاعات', 'امتیازدهی', 'پرورش سرنخ', 'تحویل به فروش'],
    value: 'افزایش کیفیت و کمیت سرنخ‌ها',
  },
  support: {
    title: 'فرآیند خدمات پس‌فروش',
    steps: ['دریافت تیکت', 'پاسخ ۲۴/۷', 'ردیابی سفارش', 'پیگیری شکایت', 'بازخورد'],
    value: 'کاهش تیکت و افزایش رضایت',
  },
  finance: {
    title: 'فرآیند مالی',
    steps: ['صدور فاکتور', 'پیگیری مطالبات', 'تأیید پرداخت', 'مدیریت اقساط', 'گزارش'],
    value: 'شفافیت مالی و کاهش معوقات',
  },
  inventory: {
    title: 'فرآیند موجودی',
    steps: ['مانیتورینگ', 'هشدار کمبود', 'سفارش خودکار', 'بهینه‌سازی انبار', 'پیش‌بینی'],
    value: 'کاهش هزینه و جلوگیری از کمبود',
  },
  marketing: {
    title: 'فرآیند بازاریابی',
    steps: ['تقسیم مخاطب', 'تولید محتوا', 'اجرای کمپین', 'تست A/B', 'تحلیل ROI'],
    value: 'افزایش آگاهی و کاهش CAC',
  },
  analytics: {
    title: 'فرآیند تحلیل',
    steps: ['جمع‌آوری داده', 'تحلیل رفتار', 'داشبورد', 'هشدار KPI', 'پیش‌بینی'],
    value: 'تصمیم‌گیری داده‌محور',
  },
  hr: {
    title: 'فرآیند منابع انسانی',
    steps: ['مرخصی و حضور', 'تخصیص وظایف', 'نظرسنجی', 'آموزش', 'گزارش عملکرد'],
    value: 'افزایش بهره‌وری و کاهش فرسودگی',
  },
  'supply-chain': {
    title: 'فرآیند زنجیره تامین',
    steps: ['مدیریت تامین‌کننده', 'سفارش خرید', 'ردیابی حمل', 'کنترل کیفیت', 'لجستیک'],
    value: 'کاهش هزینه لجستیک',
  },
  innovation: {
    title: 'فرآیند نوآوری',
    steps: ['جمع‌آوری ایده', 'تحلیل مشکل', 'تست محصول', 'مدیریت باگ', 'پیگیری KPI'],
    value: 'شتاب نوآوری',
  },

  // ============ 3 خوشه جدید (گسترش) ============
  education: {
    title: 'فرآیند آموزش و توسعه',
    steps: ['ارزیابی سطح', 'طراحی مسیر', 'اجرای آموزش', 'آزمون', 'گواهی‌نامه'],
    value: 'افزایش مهارت و رضایت یادگیرنده',
  },
  legal: {
    title: 'فرآیند حقوقی و انطباق',
    steps: ['جمع‌آوری اسناد', 'تحلیل حقوقی', 'شناسایی ریسک', 'انطباق', 'بایگانی'],
    value: 'کاهش ریسک حقوقی و اطمینان انطباق',
  },
  security: {
    title: 'فرآیند امنیت و حریم خصوصی',
    steps: ['احراز هویت', 'نظارت', 'تشخیص تهدید', 'پاسخ', 'گزارش'],
    value: 'حفاظت کامل از داده‌ها و سیستم‌ها',
  },

  // ============ 5 خوشه پرمیوم ============
  'premium-learning': {
    title: 'یادگیری تطبیقی',
    steps: ['پروفایل کاربر', 'مسیر پویا', 'تطبیق لحظه‌ای', 'ارزیابی', 'بهینه‌سازی'],
    value: 'یادگیری شخصی‌سازی‌شده با حداکثر بازدهی',
  },
  'premium-legal': {
    title: 'تحلیل اسناد حقوقی',
    steps: ['آپلود سند', 'تحلیل عمیق', 'شناسایی ریسک', 'پیشنهاد', 'خلاصه'],
    value: 'تحلیل حقوقی دقیق و سریع',
  },
  'premium-security': {
    title: 'Zero-Trust Security',
    steps: ['تأیید هویت', 'حداقل دسترسی', 'نظارت مستمر', 'پاسخ خودکار', 'حسابرسی'],
    value: 'امنیت حداکثری در تمام لایه‌ها',
  },
  'premium-multilang': {
    title: 'هماهنگی چندزبانه',
    steps: ['تشخیص زبان', 'ترجمه دقیق', 'حفظ لحن', 'هماهنگی', 'انتشار'],
    value: 'ارتباط یکپارچه در همه زبان‌ها',
  },
  'premium-voice': {
    title: 'تحلیل احساسات صوتی',
    steps: ['دریافت صدا', 'تحلیل لحن', 'تشخیص احساس', 'پیشنهاد', 'ثبت رخداد'],
    value: 'درک عمیق از احساسات مشتری',
  },
};

// ============================================================
// Status Config
// ============================================================
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  ACTIVE: { label: 'فعال', color: '#4ade80', icon: '🟢' },
  QUEUED: { label: 'در صف', color: '#f59e0b', icon: '🟡' },
  IDLE: { label: 'آماده', color: '#6b7280', icon: '⚪' },
  DISABLED: { label: 'غیرفعال', color: '#ef4444', icon: '🔴' },
  FAILED: { label: 'خطا', color: '#ef4444', icon: '⚠️' },
};

// ============================================================
// Helper Components
// ============================================================
function StatCard({
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
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-white/40">{label}</span>
      </div>
      <div className="text-2xl font-black" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================
export default function ClusterDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [bots, setBots] = useState<BotStatus[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [commands, setCommands] = useState<Command[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commandInput, setCommandInput] = useState('');
  const [commandLoading, setCommandLoading] = useState(false);
  const [liveMode, setLiveMode] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (slug) {
      loadAll();
      if (liveMode) intervalRef.current = setInterval(loadLive, 8000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [slug, liveMode]);

  async function loadAll() {
    try {
      setLoading(true);
      setError('');
      const clustersRes = await api.get('/api/clusters');
      const allClusters = clustersRes.data.items || [];
      const found = allClusters.find((c: Cluster) => c.slug === slug);
      if (!found) {
        setError('خوشه یافت نشد');
        return;
      }
      setCluster(found);
      await loadLive();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadLive() {
    if (!slug) return;
    try {
      const [s, b, o, c] = await Promise.all([
        api.get(`/api/clusters/${slug}/stats`),
        api.get(`/api/clusters/${slug}/bots-status`),
        api.get(`/api/clusters/${slug}/outputs?limit=10`),
        api.get(`/api/clusters/${slug}/commands`),
      ]);
      setStats(s.data);
      setBots(b.data || []);
      setOutputs(o.data.items || []);
      setCommands(c.data.items || []);
    } catch (err) {
      console.error('Live update failed:', err);
    }
  }

  async function sendCommand() {
    if (!commandInput.trim() || commandLoading) return;
    try {
      setCommandLoading(true);
      const res = await api.post(`/api/clusters/${slug}/command`, {
        command: commandInput,
      });
      setCommands((prev) => [
        {
          id: res.data.id,
          command: res.data.command,
          response: res.data.response,
          status: res.data.status,
          createdAt: res.data.createdAt,
        },
        ...prev,
      ]);
      setCommandInput('');
    } catch (err) {
      alert(extractError(err));
    } finally {
      setCommandLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-white/20 border-t-[#6a8dff] rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !cluster) {
    return (
      <div className="text-center py-20">
        <div className="text-red-400 mb-4">{error || 'خوشه یافت نشد'}</div>
        <Link href="/clusters" className="text-[#6a8dff] hover:underline">
          ← بازگشت به خوشه‌ها
        </Link>
      </div>
    );
  }

  const workflow = CLUSTER_WORKFLOWS[cluster.slug] || {
    title: 'فرآیند کاری',
    steps: ['تعریف در حال تکمیل', 'به‌زودی'],
    value: 'این خوشه به‌زودی فرآیند اختصاصی خود را دریافت می‌کند',
  };

  return (
    <div className="space-y-8">
      {/* ============ Header ============ */}
      <div>
        <Link
          href="/clusters"
          className="text-sm text-white/40 hover:text-white/70 transition-colors mb-4 inline-block"
        >
          ← بازگشت
        </Link>

        <div className="flex flex-col md:flex-row md:items-center gap-6 mt-2">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-2xl shrink-0"
            style={{
              background: `${cluster.color}22`,
              boxShadow: `0 12px 40px ${cluster.color}33`,
            }}
          >
            {cluster.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">{cluster.name}</h1>
              <button
                onClick={() => setLiveMode(!liveMode)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  liveMode
                    ? 'bg-green-500/10 text-green-400 border-green-500/30'
                    : 'bg-white/5 text-white/40 border-white/10'
                }`}
              >
                {liveMode ? '● زنده' : '○ غیرفعال'}
              </button>
            </div>
            <p className="text-white/50 mt-2 max-w-2xl">{cluster.description}</p>
          </div>
        </div>
      </div>

      {/* ============ Live Stats ============ */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon="🤖" label="کل ربات‌ها" value={stats.botCount} color="#6a8dff" />
          <StatCard icon="🟢" label="فعال" value={stats.activeBots} color="#4ade80" />
          <StatCard icon="🟡" label="در صف" value={stats.queuedBots} color="#f59e0b" />
          <StatCard icon="💬" label="پیام امروز" value={stats.messagesToday} color="#b46eff" />
        </div>
      )}

      {/* ============ Workflow ============ */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] p-8">
        <div
          className="absolute top-0 left-0 w-full h-1"
          style={{ background: cluster.color }}
        />
        <h2 className="text-xl font-bold mb-2">{workflow.title}</h2>
        <p className="text-sm text-white/50 mb-6">{workflow.value}</p>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {workflow.steps.map((step, idx) => (
            <div key={idx} className="relative">
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{
                    background: `${cluster.color}33`,
                    color: cluster.color,
                  }}
                >
                  {idx + 1}
                </div>
                {idx < workflow.steps.length - 1 && (
                  <div className="hidden md:block flex-1 h-px bg-white/10" />
                )}
              </div>
              <p className="text-sm text-white/70 leading-relaxed">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ============ Command Center ============ */}
      <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/10 rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-2xl">🎛️</div>
          <div>
            <h2 className="text-xl font-bold">مرکز فرمان خوشه</h2>
            <p className="text-xs text-white/40">به کل خوشه دستور بده — پاسخ با هوش مصنوعی</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendCommand()}
              placeholder="مثال: گزارش امروز رو بده..."
              className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#6a8dff] transition-colors"
              disabled={commandLoading}
            />
            <button
              onClick={sendCommand}
              disabled={commandLoading || !commandInput.trim()}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#6a8dff] to-[#b46eff] font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {commandLoading ? '⏳' : 'ارسال'}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              'گزارش امروز رو بده',
              'کدوم مشتری در خطر ریخته؟',
              'عملکرد هفته چطور بود؟',
              'پیشنهاد بهبود بده',
            ].map((s) => (
              <button
                key={s}
                onClick={() => setCommandInput(s)}
                className="text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-white/60"
              >
                {s}
              </button>
            ))}
          </div>

          {commands.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {commands.slice(0, 6).map((cmd) => (
                <div key={cmd.id} className="bg-black/20 rounded-xl p-4 text-sm">
                  <div className="text-[#6a8dff] font-bold mb-2">👤 {cmd.command}</div>
                  {cmd.response && (
                    <div className="text-white/70 whitespace-pre-wrap leading-relaxed">
                      {cmd.response}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ============ Bots with Live Status ============ */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold">ربات‌ها ({bots.length})</h2>
          <div className="flex gap-3 text-xs text-white/40">
            <span>🟢 {stats?.activeBots || 0} فعال</span>
            <span>🟡 {stats?.queuedBots || 0} در صف</span>
          </div>
        </div>

        {bots.length === 0 ? (
          <div className="text-center py-16 text-white/40">هیچ رباتی در این خوشه نیست</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {bots.map((bot) => {
              const sc = STATUS_CONFIG[bot.runStatus] || STATUS_CONFIG.IDLE;
              return (
                <Link
                  key={bot.id}
                  href={`/bots/${bot.id}`}
                  className="group relative bg-white/[0.03] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all hover:scale-[1.02]"
                >
                  {bot.isPremium && (
                    <span className="absolute top-3 left-3 text-[10px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full">
                      ⭐ طلایی
                    </span>
                  )}

                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <span className="text-sm">{sc.icon}</span>
                    <span className="text-[10px] font-bold" style={{ color: sc.color }}>
                      {sc.label}
                    </span>
                  </div>

                  <div className="flex items-start gap-3 mt-4">
                    <span className="text-3xl">{bot.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm truncate group-hover:text-[#6a8dff] transition-colors">
                        {bot.name}
                      </h3>
                      <p className="text-xs text-white/40 mt-1 line-clamp-2">
                        {bot.lastTask || bot.description || 'بدون توضیحات'}
                      </p>
                    </div>
                  </div>

                  {bot.runStatus === 'ACTIVE' && (
                    <div className="mt-3 w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#6a8dff] to-[#b46eff] animate-pulse"
                        style={{ width: '60%' }}
                      />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ============ Outputs ============ */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold">خروجی‌های امروز</h2>
          <span className="text-sm text-white/40">{outputs.length} مورد</span>
        </div>

        {outputs.length === 0 ? (
          <div className="text-center py-16 text-white/40 bg-white/[0.02] rounded-2xl border border-white/10">
            هنوز خروجی‌ای ثبت نشده
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {outputs.map((out) => (
              <div
                key={out.id}
                className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                    {out.type}
                  </span>
                  <span className="text-[10px] text-white/30">
                    {new Date(out.createdAt).toLocaleTimeString('fa-IR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <h3 className="font-bold text-sm mb-1">{out.title}</h3>
                {out.description && (
                  <p className="text-xs text-white/50 line-clamp-2 mb-2">
                    {out.description}
                  </p>
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
    </div>
  );
}