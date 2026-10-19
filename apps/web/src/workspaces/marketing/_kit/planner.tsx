'use client';

/*
 * Workspace Kit — هدف و برنامه: کاربر هدفش را می‌نویسد، هوش مصنوعی شدنی‌بودنش را می‌سنجد،
 * برنامه‌ی روزبه‌روز با وظیفه‌ی هر ربات می‌نویسد، پیشرفت دنبال می‌شود و در پایان گزارش تطابق با هدف می‌آید.
 * همه‌چیز در یک صفحه داخل خوشه است. اگر هوش مصنوعی در دسترس نباشد، برنامه‌ی ساده‌ی قاعده‌محور ساخته می‌شود (با برچسب).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, extractError } from '@/lib/api';
import { Badge, Btn, Empty, ErrorBanner, Field, Notice, Panel, Pills, ProgressBar, Spinner, TONES, inputCls } from './ui';
import type { Tone } from './ui';
import { fa, jDate, pct, toEnDigits } from './format';
import { fetchRuns, loadBotIndex } from './process';
import type { ProcessDef, RunRecord } from './process';
import { GoalsPanel } from './goals';

/* ───────────── انواع ───────────── */
export type Verdict = 'realistic' | 'hard' | 'unrealistic';

export interface Feasibility {
  verdict: Verdict;
  /** ۰ تا ۱۰۰: احتمال شدنی‌بودن */
  score: number;
  reason: string;
  suggestion?: string;
  source: 'ai' | 'rule';
}

export interface PlanTask {
  id: string;
  bot: string;
  botName: string;
  icon: string;
  task: string;
  done: boolean;
}

export interface PlanPhase {
  id: string;
  title: string;
  from: number;
  to: number;
  focus: string;
  tasks: PlanTask[];
}

export type PlanState = 'draft' | 'active' | 'paused' | 'finished';
export interface PlanChange {
  at: number;
  note: string;
}

export interface PlanData {
  /** پیش‌نویس تا وقتی کاربر تأیید کند؛ برنامه‌های قدیمی بدون state «فعال» حساب می‌شوند */
  state?: PlanState;
  pausedAt?: number;
  finishedAt?: number;
  history?: PlanChange[];
  goalText: string;
  unit: string;
  baseline: number | null;
  targetPct: number;
  days: number;
  startAt: number;
  feasibility: Feasibility;
  phases: PlanPhase[];
  risks: string[];
  /** آخرین عدد واقعی که کاربر وارد کرده */
  current: number | null;
  report?: { text: string; at: number };
}

export interface PlanRow {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  plan: PlanData;
}

const DAY = 86_400_000;
export const planState = (p: PlanData): PlanState => p.state ?? 'active';
export const MIN_DAYS = 3;
export const MAX_DAYS = 180;
const VERDICT: Record<Verdict, { label: string; tone: Tone; icon: string }> = {
  realistic: { label: 'شدنی است', tone: 'ok', icon: '✅' },
  hard: { label: 'سخت اما ممکن', tone: 'warn', icon: '⚠️' },
  unrealistic: { label: 'غیرواقعی است', tone: 'bad', icon: '⛔' },
};

const num = (s: string): number => Number(toEnDigits(s).replace(/[,٬\s]/g, ''));
const clamp = (n: number, a: number, b: number): number => Math.min(b, Math.max(a, n));
const rid = (): string => Math.random().toString(36).slice(2, 9);

/* ───────────── ارتباط با سرور ───────────── */
function parsePlan(row: { id: string; title: string; status: string; createdAt: string; metadata?: string | null }): PlanRow | null {
  try {
    const p = JSON.parse(row.metadata ?? '{}') as PlanData;
    if (!p || !Array.isArray(p.phases) || !p.feasibility) return null;
    return { id: row.id, title: row.title, status: row.status, createdAt: row.createdAt, plan: p };
  } catch {
    return null;
  }
}

export async function fetchPlans(slug: string): Promise<PlanRow[]> {
  const r = await api.get(`/api/clusters/${slug}/plans`);
  const items = ((r.data as { items?: unknown[] }).items ?? []) as Array<Parameters<typeof parsePlan>[0]>;
  return items.map(parsePlan).filter((x): x is PlanRow => x !== null);
}

async function savePlan(slug: string, title: string, plan: PlanData): Promise<void> {
  await api.post(`/api/clusters/${slug}/plans`, { title, plan });
}
async function patchPlan(slug: string, id: string, plan: PlanData): Promise<void> {
  await api.patch(`/api/clusters/${slug}/plans/${id}`, { plan });
}
async function removePlan(slug: string, id: string): Promise<void> {
  await api.delete(`/api/clusters/${slug}/plans/${id}`);
}

/* ───────────── هوش مصنوعی ───────────── */
async function askAI(def: ProcessDef, sessionId: string, message: string): Promise<string> {
  const idx = await loadBotIndex();
  const stage = def.stages.find((s) => idx[s.bot]?.isActive);
  if (!stage) throw new Error('ربات فعالی برای برنامه‌ریزی در این خوشه پیدا نشد');
  const r = await api.post('/api/ai/chat', { botId: idx[stage.bot].id, sessionId, message });
  const d = r.data as { message?: string; reply?: string; content?: string };
  const text = String(d.message ?? d.reply ?? d.content ?? '').trim();
  if (!text) throw new Error('پاسخی از هوش مصنوعی نیامد');
  return text;
}

function extractJson(text: string): unknown {
  const a = text.indexOf('{');
  const b = text.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('پاسخ قابل‌خواندن نبود');
  return JSON.parse(text.slice(a, b + 1));
}

/* ───────────── برنامه‌ی قاعده‌محور (بدون هوش مصنوعی) ───────────── */
export function ruleFeasibility(targetPct: number, days: number): Feasibility {
  const weeks = Math.max(1, days / 7);
  const perWeek = targetPct / weeks;
  const verdict: Verdict = perWeek <= 5 ? 'realistic' : perWeek <= 12 ? 'hard' : 'unrealistic';
  const score = Math.round(clamp(100 - Math.max(0, perWeek - 2) * 7, 5, 97));
  const safe = Math.max(1, Math.round(5 * weeks));
  return {
    verdict,
    score,
    source: 'rule',
    reason: `این هدف یعنی حدود ${fa(Math.round(perWeek * 10) / 10)}٪ رشد در هر هفته. بیشتر کسب‌وکارها با بهبود فرایند معمولاً تا حدود ۵٪ در هفته را به‌طور پایدار می‌گیرند. (تخمین ساده؛ هوش مصنوعی در دسترس نبود.)`,
    suggestion: verdict === 'realistic' ? undefined : `هدف محتاطانه‌تر برای این بازه: حدود ${fa(safe)}٪`,
  };
}

export function rulePlan(def: ProcessDef, days: number): PlanPhase[] {
  const d = Math.max(3, days);
  const a = Math.max(1, Math.round(d * 0.2));
  const c = Math.max(a + 1, Math.round(d * 0.8));
  const uniq = def.stages.filter((s, i, arr) => arr.findIndex((x) => x.bot === s.bot) === i);
  const task = (s: (typeof uniq)[number], text: string): PlanTask => ({ id: rid(), bot: s.bot, botName: s.botName, icon: s.icon, task: text, done: false });
  return [
    {
      id: rid(),
      title: 'آماده‌سازی و پایه',
      from: 1,
      to: a,
      focus: 'وضعیت فعلی را بسنجید و ربات‌ها را آماده‌ی کار کنید',
      tasks: uniq.slice(0, 6).map((s) => task(s, `آماده‌سازی: ${s.does}`)),
    },
    {
      id: rid(),
      title: 'اجرای اصلی',
      from: a + 1,
      to: c,
      focus: 'فرایند را روی درخواست‌های واقعی هر روز اجرا کنید',
      tasks: uniq.slice(0, 8).map((s) => task(s, `هر روز: ${s.does}`)),
    },
    {
      id: rid(),
      title: 'بهینه‌سازی و نتیجه‌گیری',
      from: c + 1,
      to: d,
      focus: 'نتایج را بسنجید، نقطه‌ضعف‌ها را درست کنید و گزارش بگیرید',
      tasks: [
        ...uniq.slice(0, 3).map((s) => task(s, `بازبینی کیفیت کار: ${s.title}`)),
        ...(uniq[0] ? [task(uniq[0], 'گزارش پایانی و مقایسه با هدف')] : []),
      ],
    },
  ];
}

interface AiPlan {
  note?: string;
  feasibility?: { verdict?: string; score?: number; reason?: string; suggestion?: string };
  phases?: Array<{ title?: string; from?: number; to?: number; focus?: string; tasks?: Array<{ bot?: string; task?: string }> }>;
  risks?: string[];
}

function normalizePhases(rawPhases: AiPlan['phases'], def: ProcessDef, days: number): PlanPhase[] {
  const bySlug = new Map(def.stages.map((s) => [s.bot, s]));
  return (rawPhases ?? [])
    .slice(0, 6)
    .map((p, i) => {
      const from = clamp(Math.round(Number(p.from) || 1), 1, days);
      const to = clamp(Math.round(Number(p.to) || days), from, days);
      const tasks: PlanTask[] = (p.tasks ?? [])
        .slice(0, 10)
        .map((t): PlanTask | null => {
          const st = bySlug.get(String(t.bot)) ?? def.stages.find((s) => s.botName === String(t.bot));
          const text = String(t.task ?? '').trim().slice(0, 240);
          if (!st || !text) return null;
          return { id: rid(), bot: st.bot, botName: st.botName, icon: st.icon, task: text, done: false };
        })
        .filter((x): x is PlanTask => x !== null);
      return { id: rid(), title: String(p.title ?? `مرحله‌ی ${i + 1}`).slice(0, 80), from, to, focus: String(p.focus ?? '').slice(0, 200), tasks };
    })
    .filter((p) => p.tasks.length > 0);
}

function normalizeFeasibility(f: NonNullable<AiPlan['feasibility']>): Feasibility {
  const verdict: Verdict = f.verdict === 'realistic' || f.verdict === 'hard' || f.verdict === 'unrealistic' ? f.verdict : 'hard';
  return {
    verdict,
    score: Math.round(clamp(Number(f.score) || 50, 0, 100)),
    reason: String(f.reason ?? '').slice(0, 600) || 'بدون توضیح',
    suggestion: f.suggestion ? String(f.suggestion).slice(0, 300) : undefined,
    source: 'ai',
  };
}

function normalizeAiPlan(raw: AiPlan, def: ProcessDef, days: number): { feasibility: Feasibility; phases: PlanPhase[]; risks: string[] } {
  const phases = normalizePhases(raw.phases, def, days);
  if (phases.length === 0) throw new Error('برنامه‌ی هوشمند معتبر نبود');
  return { feasibility: normalizeFeasibility(raw.feasibility ?? {}), phases, risks: (raw.risks ?? []).slice(0, 6).map((r) => String(r).slice(0, 200)) };
}

const phasesText = (phases: PlanPhase[]): string =>
  phases.map((p) => `روز ${p.from}–${p.to} «${p.title}» (${p.focus}):\n` + p.tasks.map((t) => `  - [${t.bot}] ${t.task}`).join('\n')).join('\n');

function buildRevisePrompt(def: ProcessDef, plan: PlanData, instruction: string): string {
  const bots = def.stages.map((s) => `- ${s.bot} | ${s.botName}: ${s.does}`).join('\n');
  return (
    'تو مشاور رشد کسب‌وکار و مدیر پروژه هستی. کاربر می‌خواهد برنامه‌اش را تغییر دهد. فقط یک JSON معتبر برگردان، بدون متن دیگر.\n' +
    `[ربات‌های موجود (slug | نام: کار)]\n${bots}\n\n[هدف] ${plan.goalText} — ${plan.targetPct}٪ در ${plan.days} روز\n` +
    `[برنامه‌ی فعلی]\n${phasesText(plan.phases)}\n\n[درخواست کاربر] ${instruction}\n\n` +
    'ساختار خروجی: {"note":"خلاصه‌ی تغییر در یک جمله","phases":[{"title":"","from":1,"to":5,"focus":"","tasks":[{"bot":"slug دقیق","task":""}]}],"risks":[""]}\n' +
    `قوانین: برنامه‌ی کامل و نهایی را برگردان (نه فقط تغییرها)؛ بازه‌ها از روز ۱ تا ${plan.days}؛ فقط همان چیزی را تغییر بده که کاربر خواسته و بقیه را نگه دار؛ ربات فقط از فهرست بالا.`
  );
}

function buildGoalHelpPrompt(def: ProcessDef, situation: string, stats: string): string {
  return (
    'تو مشاور رشد کسب‌وکار هستی. به کاربر کمک کن بهترین و واقع‌بینانه‌ترین هدف را انتخاب کند. فقط یک JSON معتبر برگردان.\n' +
    `[حوزه] ${def.title}: ${def.summary}\n[داده‌ی واقعی خوشه] ${stats}\n[وضعیت و حرف کاربر] ${situation}\n\n` +
    'ساختار: {"tip":"یک نکته‌ی کوتاه و صادقانه","suggestions":[{"goalText":"","targetPct":10,"days":21,"why":"دلیل کوتاه"}]}\n' +
    'قوانین: ۲ یا ۳ پیشنهاد با سطح سختی متفاوت (محتاطانه، متعادل، جسورانه)؛ targetPct عدد درصد؛ days بین ۷ و ۹۰؛ وعده‌ی تضمینی نده.'
  );
}

interface GoalSuggestion {
  goalText: string;
  targetPct: number;
  days: number;
  why: string;
}

function buildPrompt(def: ProcessDef, i: { goalText: string; unit: string; baseline: number | null; targetPct: number; days: number }, stats: string): string {
  const bots = def.stages.map((s) => `- ${s.bot} | ${s.botName}: ${s.does}`).join('\n');
  return (
    'تو مشاور رشد کسب‌وکار و مدیر پروژه هستی. فقط یک JSON معتبر برگردان، بدون هیچ متن دیگر.\n' +
    `[فرایند] ${def.title}: ${def.summary}\n[ربات‌های موجود (slug | نام: کار)]\n${bots}\n\n` +
    `[هدف کاربر] ${i.goalText}\n[بازه] ${i.days} روز\n[رشد خواسته‌شده] ${i.targetPct}٪` +
    (i.baseline !== null ? `\n[عدد فعلی] ${i.baseline} ${i.unit}` : '') +
    `\n[داده‌ی واقعی این خوشه] ${stats}\n\n` +
    'ساختار دقیق خروجی:\n' +
    '{"feasibility":{"verdict":"realistic|hard|unrealistic","score":0-100,"reason":"دلیل ساده‌ی فارسی در ۲ تا ۳ جمله","suggestion":"اگر شدنی نیست هدف بهتر"},' +
    '"phases":[{"title":"","from":1,"to":5,"focus":"","tasks":[{"bot":"slug دقیق یکی از ربات‌های بالا","task":"وظیفه‌ی مشخص و قابل‌انجام این ربات در این مرحله"}]}],' +
    '"risks":["خطر یا نکته‌ی مهم"]}\n' +
    `قوانین: بازه‌ها از روز ۱ تا ${i.days} بدون فاصله، ۳ تا ۵ مرحله، برای هر مرحله چند وظیفه با ربات‌های مختلف، صادق باش و اگر هدف غیرواقعی است همین را بگو. وعده‌ی تضمینی نده.`
  );
}

function statsText(runs: RunRecord[]): string {
  if (!runs.length) return 'هنوز پرونده‌ای ثبت نشده است';
  const ok = runs.filter((r) => r.status === 'done').length;
  const real = runs.reduce((a, r) => a + (r.trail ?? []).filter((t) => t.source === 'real').length, 0);
  return `${runs.length} پرونده‌ی اخیر، ${Math.round((ok / runs.length) * 100)}٪ موفق، ${real} اقدام واقعی`;
}

/* ───────────── محاسبه‌ی پیشرفت ───────────── */
export interface PlanProgress {
  dayNow: number;
  timePct: number;
  taskPct: number;
  tasksDone: number;
  tasksTotal: number;
  resultPct: number | null;
  targetValue: number | null;
  verdict: { label: string; tone: Tone };
  runs: number;
  runsOk: number;
  realActions: number;
}

export function planProgress(p: PlanData, runs: RunRecord[], now = Date.now()): PlanProgress {
  const st = planState(p);
  const t = st === 'paused' && p.pausedAt ? p.pausedAt : st === 'finished' && p.finishedAt ? p.finishedAt : now;
  const draft = st === 'draft';
  const dayNow = draft ? 1 : clamp(Math.floor((t - p.startAt) / DAY) + 1, 1, p.days);
  const timePct = draft ? 0 : clamp(((t - p.startAt) / (p.days * DAY)) * 100, 0, 100);
  const all = p.phases.flatMap((x) => x.tasks);
  const tasksDone = all.filter((x) => x.done).length;
  const taskPct = all.length ? (tasksDone / all.length) * 100 : 0;
  const mine = draft ? [] : runs.filter((r) => r.startedAt >= p.startAt && r.startedAt <= t);
  const realActions = mine.reduce((a, r) => a + (r.trail ?? []).filter((x) => x.source === 'real').length, 0);
  const targetValue = p.baseline !== null ? p.baseline * (1 + p.targetPct / 100) : null;
  let resultPct: number | null = null;
  if (p.baseline !== null && p.current !== null && p.baseline !== 0) {
    const gain = ((p.current - p.baseline) / p.baseline) * 100;
    resultPct = clamp((gain / p.targetPct) * 100, 0, 999);
  }
  const measure = resultPct ?? taskPct;
  const ratio = timePct > 0 ? measure / timePct : measure >= 100 ? 2 : 1;
  let verdict: { label: string; tone: Tone };
  if (draft) verdict = { label: 'منتظر تأیید شما', tone: 'info' };
  else if (resultPct !== null && resultPct >= 100) verdict = { label: 'هدف محقق شد', tone: 'ok' };
  else if (st === 'paused') verdict = { label: 'متوقف شده', tone: 'warn' };
  else if (st === 'finished' || timePct >= 100)
    verdict = resultPct !== null ? { label: 'بازه تمام شد؛ هدف کامل نشد', tone: 'bad' } : { label: 'بازه تمام شد؛ نتیجه را وارد کنید', tone: 'warn' };
  else if (ratio >= 0.9) verdict = { label: 'مطابق برنامه', tone: 'ok' };
  else if (ratio >= 0.6) verdict = { label: 'کمی عقب‌تر از برنامه', tone: 'warn' };
  else verdict = { label: 'عقب‌تر از برنامه', tone: 'bad' };
  return { dayNow, timePct, taskPct, tasksDone, tasksTotal: all.length, resultPct, targetValue, verdict, runs: mine.length, runsOk: mine.filter((r) => r.status === 'done').length, realActions };
}

/* ───────────── رابط ───────────── */
const DAY_CHOICES = [
  { value: '7', label: '۷ روز' },
  { value: '15', label: '۱۵ روز' },
  { value: '21', label: '۳ هفته' },
  { value: '30', label: '۱ ماه' },
  { value: '60', label: '۲ ماه' },
] as const;

export function PlannerPanel(props: { slug: string; def: ProcessDef }) {
  const { slug, def } = props;
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selId, setSelId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let live = true;
    Promise.all([fetchPlans(slug), fetchRuns(slug, { take: 100 })])
      .then(([p, r]) => {
        if (!live) return;
        setPlans(p);
        setRuns(r.items);
        setError('');
        setSelId((cur) => (cur && p.some((x) => x.id === cur) ? cur : (p[0]?.id ?? null)));
      })
      .catch((e) => live && setError(extractError(e)))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [slug, tick]);

  const sel = plans.find((p) => p.id === selId) ?? null;
  const showForm = creating || (!loading && plans.length === 0);

  return (
    <div className="space-y-5">
      <Panel
        title="🎯 هدف و برنامه‌ی هوشمند"
        subtitle="هدفتان را بنویسید؛ هوش مصنوعی می‌گوید شدنی است یا نه، برنامه‌ی روزبه‌روز با وظیفه‌ی هر ربات می‌نویسد و در پایان گزارش می‌دهد چقدر به هدف رسیدید"
        actions={
          plans.length > 0 && !creating ? (
            <Btn size="sm" variant="primary" onClick={() => setCreating(true)}>
              + هدف تازه
            </Btn>
          ) : undefined
        }
      >
        <ErrorBanner message={error} onRetry={reload} />
        {loading ? (
          <Spinner />
        ) : (
          <>
            {plans.length > 0 && (
              <div className="mb-4">
                <Pills<string> value={creating ? '' : (selId ?? '')} onChange={(v) => { setCreating(false); setSelId(v); }} options={plans.map((p) => ({ value: p.id, label: p.title.length > 28 ? `${p.title.slice(0, 27)}…` : p.title }))} />
              </div>
            )}
            {showForm ? (
              <PlanForm
                slug={slug}
                def={def}
                runs={runs}
                onCancel={plans.length ? () => setCreating(false) : undefined}
                onSaved={() => {
                  setCreating(false);
                  setSelId(null);
                  reload();
                }}
              />
            ) : sel ? (
              <PlanView key={sel.id} slug={slug} def={def} row={sel} runs={runs} onChanged={reload} onDeleted={() => { setSelId(null); reload(); }} />
            ) : (
              <Empty icon="🎯" text="یک برنامه را انتخاب کنید." />
            )}
          </>
        )}
      </Panel>

      <div>
        <div className="text-sm font-extrabold mb-2 text-white/80">📏 اهداف سنجشی خودکار</div>
        <div className="text-xs text-white/45 mb-3 leading-6">این اهداف از روی خود پرونده‌ها اندازه‌گیری می‌شوند (نرخ موفقیت، تعداد پرونده، اقدام‌های واقعی…).</div>
        <GoalsPanel slug={slug} def={def} />
      </div>
    </div>
  );
}

/* ───── فرم هدف ───── */
function PlanForm(props: { slug: string; def: ProcessDef; runs: RunRecord[]; onSaved: () => void; onCancel?: () => void }) {
  const { slug, def } = props;
  const [goalText, setGoalText] = useState('');
  const [pctText, setPctText] = useState('15');
  const [daysSel, setDaysSel] = useState('21');
  const [customDays, setCustomDays] = useState('');
  const [baseText, setBaseText] = useState('');
  const [unit, setUnit] = useState('');
  const [busy, setBusy] = useState<'' | 'ai' | 'rule'>('');
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  // کمک دستیار برای تعیین هدف
  const [helpOpen, setHelpOpen] = useState(false);
  const [situation, setSituation] = useState('');
  const [helpBusy, setHelpBusy] = useState(false);
  const [helpTip, setHelpTip] = useState('');
  const [sugs, setSugs] = useState<GoalSuggestion[]>([]);
  const [helpErr, setHelpErr] = useState('');

  const daysValue = (): number => (daysSel === 'custom' ? Math.round(num(customDays)) : Number(daysSel));

  async function askHelp(): Promise<void> {
    if (!situation.trim()) return setHelpErr('یک‌دو جمله درباره‌ی وضعیت کسب‌وکار و خواسته‌تان بنویسید');
    setHelpBusy(true);
    setHelpErr('');
    setSugs([]);
    try {
      const text = await askAI(def, `ws-goalhelp-${slug}-${Date.now()}`, buildGoalHelpPrompt(def, situation.trim(), statsText(props.runs)));
      const j = extractJson(text) as { tip?: string; suggestions?: Array<Partial<GoalSuggestion>> };
      const list = (j.suggestions ?? [])
        .slice(0, 3)
        .map((x) => ({
          goalText: String(x.goalText ?? '').slice(0, 160),
          targetPct: clamp(Number(x.targetPct) || 0, 1, 1000),
          days: clamp(Math.round(Number(x.days) || 21), MIN_DAYS, MAX_DAYS),
          why: String(x.why ?? '').slice(0, 240),
        }))
        .filter((x) => x.goalText && x.targetPct > 0);
      if (!list.length) throw new Error('پیشنهاد معتبری نیامد');
      setSugs(list);
      setHelpTip(String(j.tip ?? '').slice(0, 300));
    } catch (e) {
      setHelpErr(`دستیار پاسخ نداد: ${extractError(e)}`);
    } finally {
      setHelpBusy(false);
    }
  }

  function applySug(x: GoalSuggestion): void {
    setGoalText(x.goalText);
    setPctText(String(x.targetPct));
    const preset = DAY_CHOICES.find((c) => Number(c.value) === x.days);
    if (preset) setDaysSel(preset.value);
    else {
      setDaysSel('custom');
      setCustomDays(String(x.days));
    }
  }

  async function create(useAi: boolean): Promise<void> {
    const targetPct = num(pctText);
    const d = daysValue();
    const baseline = baseText.trim() ? num(baseText) : null;
    if (!goalText.trim()) return setErr('هدفتان را بنویسید؛ مثلاً «افزایش فروش»');
    if (!Number.isFinite(targetPct) || targetPct <= 0 || targetPct > 1000) return setErr('درصد رشد باید عددی بین ۱ تا ۱۰۰۰ باشد');
    if (!Number.isInteger(d) || d < MIN_DAYS || d > MAX_DAYS) return setErr(`تعداد روز باید عددی صحیح بین ${fa(MIN_DAYS)} و ${fa(MAX_DAYS)} باشد`);
    if (baseline !== null && (!Number.isFinite(baseline) || baseline < 0)) return setErr('عدد فعلی معتبر نیست');
    setErr('');
    setNote('');
    setBusy(useAi ? 'ai' : 'rule');
    const inputs = { goalText: goalText.trim(), unit: unit.trim(), baseline, targetPct, days: d };
    let feasibility = ruleFeasibility(targetPct, d);
    let phases = rulePlan(def, d);
    let risks: string[] = ['این برنامه تخمینی است و رشد را تضمین نمی‌کند؛ هر چند روز عدد واقعی‌تان را وارد کنید.'];
    if (useAi) {
      try {
        const text = await askAI(def, `ws-plan-${slug}-${Date.now()}`, buildPrompt(def, inputs, statsText(props.runs)));
        const ai = normalizeAiPlan(extractJson(text) as AiPlan, def, d);
        feasibility = ai.feasibility;
        phases = ai.phases;
        risks = ai.risks.length ? ai.risks : risks;
      } catch (e) {
        setNote(`هوش مصنوعی در دسترس نبود (${extractError(e)}). برنامه‌ی ساده ساخته شد.`);
      }
    }
    const now = Date.now();
    const plan: PlanData = { ...inputs, state: 'draft', startAt: now, feasibility, phases, risks, current: baseline, history: [{ at: now, note: 'پیش‌نویس برنامه ساخته شد' }] };
    try {
      await savePlan(slug, inputs.goalText, plan);
      props.onSaved();
    } catch (e) {
      setErr(extractError(e));
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <button type="button" className="text-sm font-bold text-white/85" onClick={() => setHelpOpen((v) => !v)}>
          💬 مطمئن نیستید چه هدفی بگذارید؟ از دستیار کمک بگیرید {helpOpen ? '▲' : '▼'}
        </button>
        {helpOpen && (
          <div className="mt-3 space-y-3">
            <textarea className={inputCls + ' min-h-[84px]'} value={situation} onChange={(e) => setSituation(e.target.value)} placeholder="مثلاً: فروشگاه آنلاین لباس دارم، ماهی حدود ۱۰۰ سفارش، مشتری‌ها زیاد سؤال می‌پرسند و جواب‌دادن دیر می‌شود…" />
            <Btn size="sm" disabled={helpBusy} onClick={() => void askHelp()}>
              {helpBusy ? 'دستیار در حال بررسی…' : 'پیشنهاد هدف بگیر'}
            </Btn>
            {helpErr && <Notice tone="bad">{helpErr}</Notice>}
            {helpTip && <div className="text-xs leading-7 text-white/70">💡 {helpTip}</div>}
            {sugs.length > 0 && (
              <div className="grid md:grid-cols-3 gap-2">
                {sugs.map((x, i) => (
                  <button key={i} type="button" onClick={() => applySug(x)} className="text-right rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 p-3 transition">
                    <div className="text-sm font-extrabold leading-6">{x.goalText}</div>
                    <div className="text-xs text-white/60 mt-1">
                      {fa(x.targetPct)}٪ در {fa(x.days)} روز
                    </div>
                    <div className="text-[11px] text-white/45 mt-1 leading-6">{x.why}</div>
                    <div className="text-[11px] mt-2" style={{ color: 'var(--ws)' }}>
                      انتخاب این هدف ←
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <Field label="هدف شما چیست؟" className="md:col-span-2">
          <input className={inputCls} value={goalText} onChange={(e) => setGoalText(e.target.value)} placeholder="مثلاً: افزایش فروش ماهانه" />
        </Field>
        <Field label="چند درصد رشد می‌خواهید؟" hint="مثلاً ۱۵">
          <input className={inputCls} inputMode="decimal" value={pctText} onChange={(e) => setPctText(e.target.value)} />
        </Field>
        <Field label="در چه مدتی؟" hint={daysSel === 'custom' ? `عددی صحیح بین ${fa(MIN_DAYS)} تا ${fa(MAX_DAYS)} روز` : undefined}>
          <div className="space-y-2">
            <Pills<string> value={daysSel} onChange={setDaysSel} options={[...DAY_CHOICES.map((c) => ({ value: c.value, label: c.label })), { value: 'custom', label: 'روز دلخواه' }]} />
            {daysSel === 'custom' && (
              <div className="flex items-center gap-2">
                <input className={inputCls + ' max-w-[140px]'} inputMode="numeric" value={customDays} onChange={(e) => setCustomDays(e.target.value)} placeholder="مثلاً ۴۵" />
                <span className="text-sm text-white/60">روز</span>
              </div>
            )}
          </div>
        </Field>
        <Field label="عدد فعلی شما (اختیاری)" hint="هرچه دقیق‌تر، ارزیابی بهتر؛ بعداً هم می‌توانید عدد تازه وارد کنید">
          <input className={inputCls} inputMode="decimal" value={baseText} onChange={(e) => setBaseText(e.target.value)} placeholder="مثلاً ۲۰۰۰۰۰۰۰۰" />
        </Field>
        <Field label="واحد (اختیاری)">
          <input className={inputCls} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="تومان در ماه / مشتری / نوبت" />
        </Field>
      </div>
      {err && <Notice tone="bad">{err}</Notice>}
      {note && <Notice tone="warn">{note}</Notice>}
      <div className="flex flex-wrap gap-2">
        <Btn variant="primary" disabled={busy !== ''} onClick={() => void create(true)}>
          {busy === 'ai' ? 'هوش مصنوعی در حال برنامه‌ریزی…' : '🤖 بررسی هدف و ساخت برنامه'}
        </Btn>
        <Btn disabled={busy !== ''} onClick={() => void create(false)}>
          {busy === 'rule' ? '…' : 'برنامه‌ی ساده (بدون هوش مصنوعی)'}
        </Btn>
        {props.onCancel && (
          <Btn variant="ghost" onClick={props.onCancel}>
            انصراف
          </Btn>
        )}
      </div>
      <div className="text-[11px] text-white/40 leading-6">برنامه اول به‌صورت «پیش‌نویس» ساخته می‌شود؛ می‌توانید آن را ویرایش کنید یا با دستیار تغییر دهید و فقط وقتی راضی بودید «تأیید و شروع اجرا» را بزنید.</div>
    </div>
  );
}

/* ───── نمایش، ویرایش و پیگیری برنامه ───── */
interface EditDraft {
  goalText: string;
  targetPct: string;
  days: string;
  phases: PlanPhase[];
}

interface Proposal {
  note: string;
  phases: PlanPhase[];
  risks: string[];
  added: string[];
  removed: string[];
}

const taskKey = (t: { bot: string; task: string }): string => `${t.bot}|${t.task.trim()}`;

function PlanView(props: { slug: string; def: ProcessDef; row: PlanRow; runs: RunRecord[]; onChanged: () => void; onDeleted: () => void }) {
  const { slug, def, row } = props;
  const [plan, setPlan] = useState<PlanData>(row.plan);
  const [curText, setCurText] = useState(row.plan.current !== null ? String(row.plan.current) : '');
  const [err, setErr] = useState('');
  const [busyRep, setBusyRep] = useState(false);
  const [edit, setEdit] = useState<EditDraft | null>(null);
  const [instr, setInstr] = useState('');
  const [revBusy, setRevBusy] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [reBusy, setReBusy] = useState(false);
  const [showHist, setShowHist] = useState(false);
  const st = planState(plan);
  const prog = useMemo(() => planProgress(plan, props.runs), [plan, props.runs]);
  const fv = VERDICT[plan.feasibility.verdict];
  const draft = st === 'draft';
  const botOptions = useMemo(() => def.stages.filter((s, i, a) => a.findIndex((x) => x.bot === s.bot) === i), [def]);

  async function persist(next: PlanData, historyNote?: string): Promise<boolean> {
    const withHist = historyNote ? { ...next, history: [...(next.history ?? []), { at: Date.now(), note: historyNote }].slice(-40) } : next;
    setPlan(withHist);
    try {
      await patchPlan(slug, row.id, withHist);
      setErr('');
      return true;
    } catch (e) {
      setErr(extractError(e));
      return false;
    }
  }

  function toggle(phaseId: string, taskId: string): void {
    if (st !== 'active') return;
    void persist({
      ...plan,
      phases: plan.phases.map((p) => (p.id !== phaseId ? p : { ...p, tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)) })),
    });
  }

  /* ───── تأیید / توقف / ادامه / پایان ───── */
  function approve(): void {
    void persist({ ...plan, state: 'active', startAt: Date.now(), pausedAt: undefined }, 'برنامه تأیید شد و اجرا شروع شد');
  }
  function pause(): void {
    void persist({ ...plan, state: 'paused', pausedAt: Date.now() }, 'برنامه متوقف شد');
  }
  function resume(): void {
    const gap = plan.pausedAt ? Date.now() - plan.pausedAt : 0;
    void persist({ ...plan, state: 'active', startAt: plan.startAt + gap, pausedAt: undefined }, 'اجرا ادامه یافت (مدت توقف از بازه کم نمی‌شود)');
  }
  function finish(): void {
    if (!window.confirm('برنامه همین حالا پایان یابد؟ بعد از آن می‌توانید گزارش بگیرید.')) return;
    void persist({ ...plan, state: 'finished', finishedAt: Date.now() }, 'برنامه پایان یافت');
  }

  /* ───── ویرایش دستی ───── */
  function startEdit(): void {
    setProposal(null);
    setEdit({ goalText: plan.goalText, targetPct: String(plan.targetPct), days: String(plan.days), phases: plan.phases.map((p) => ({ ...p, tasks: p.tasks.map((t) => ({ ...t })) })) });
  }
  const patchPhase = (id: string, f: (p: PlanPhase) => PlanPhase): void => setEdit((e) => (e ? { ...e, phases: e.phases.map((p) => (p.id === id ? f(p) : p)) } : e));

  function addPhase(): void {
    setEdit((e) => {
      if (!e) return e;
      const last = e.phases[e.phases.length - 1];
      const d = Math.round(num(e.days)) || plan.days;
      const from = Math.min(d, (last?.to ?? 0) + 1);
      return { ...e, phases: [...e.phases, { id: rid(), title: 'مرحله‌ی تازه', from, to: d, focus: '', tasks: [] }] };
    });
  }
  function addTask(phaseId: string): void {
    const s = botOptions[0];
    if (!s) return;
    patchPhase(phaseId, (p) => ({ ...p, tasks: [...p.tasks, { id: rid(), bot: s.bot, botName: s.botName, icon: s.icon, task: '', done: false }] }));
  }
  function setTaskBot(phaseId: string, taskId: string, slugBot: string): void {
    const s = botOptions.find((b) => b.bot === slugBot);
    if (!s) return;
    patchPhase(phaseId, (p) => ({ ...p, tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, bot: s.bot, botName: s.botName, icon: s.icon } : t)) }));
  }

  async function saveEdit(): Promise<void> {
    if (!edit) return;
    const pctV = num(edit.targetPct);
    const d = Math.round(num(edit.days));
    if (!edit.goalText.trim()) return setErr('عنوان هدف خالی است');
    if (!Number.isFinite(pctV) || pctV <= 0 || pctV > 1000) return setErr('درصد رشد معتبر نیست');
    if (!Number.isInteger(d) || d < MIN_DAYS || d > MAX_DAYS) return setErr(`تعداد روز باید بین ${fa(MIN_DAYS)} و ${fa(MAX_DAYS)} باشد`);
    const phases: PlanPhase[] = [];
    for (const p of edit.phases) {
      const from = Math.round(p.from);
      const to = Math.round(p.to);
      if (!p.title.trim()) return setErr('عنوان همه‌ی مرحله‌ها را بنویسید');
      if (!(from >= 1 && to >= from && to <= d)) return setErr(`بازه‌ی «${p.title}» باید بین روز ۱ تا ${fa(d)} و از کم به زیاد باشد`);
      const tasks = p.tasks.filter((t) => t.task.trim());
      if (!tasks.length) return setErr(`مرحله‌ی «${p.title}» حداقل یک وظیفه می‌خواهد`);
      phases.push({ ...p, from, to, tasks: tasks.map((t) => ({ ...t, task: t.task.trim() })) });
    }
    if (!phases.length) return setErr('حداقل یک مرحله لازم است');
    const goalChanged = pctV !== plan.targetPct || d !== plan.days;
    const ok = await persist(
      { ...plan, goalText: edit.goalText.trim(), targetPct: pctV, days: d, phases, feasibility: goalChanged ? ruleFeasibility(pctV, d) : plan.feasibility },
      goalChanged ? 'ویرایش دستی (هدف یا مدت عوض شد؛ ارزیابی دوباره پیشنهاد می‌شود)' : 'ویرایش دستی برنامه',
    );
    if (ok) setEdit(null);
  }

  /* ───── ارزیابی دوباره‌ی شدنی‌بودن ───── */
  async function reassess(): Promise<void> {
    setReBusy(true);
    setErr('');
    try {
      const text = await askAI(def, `ws-reassess-${row.id}-${Date.now()}`, buildPrompt(def, plan, statsText(props.runs)));
      const j = extractJson(text) as AiPlan;
      await persist({ ...plan, feasibility: normalizeFeasibility(j.feasibility ?? {}) }, 'ارزیابی شدنی‌بودن دوباره انجام شد');
    } catch (e) {
      setErr(`ارزیابی هوشمند انجام نشد: ${extractError(e)}`);
    } finally {
      setReBusy(false);
    }
  }

  /* ───── تغییر با دستیار (پیشنهاد؛ تا تأیید اعمال نمی‌شود) ───── */
  async function askRevise(): Promise<void> {
    if (!instr.trim()) return setErr('بنویسید چه تغییری می‌خواهید');
    setRevBusy(true);
    setErr('');
    setProposal(null);
    try {
      const text = await askAI(def, `ws-revise-${row.id}-${Date.now()}`, buildRevisePrompt(def, plan, instr.trim()));
      const j = extractJson(text) as AiPlan;
      const phases = normalizePhases(j.phases, def, plan.days);
      if (!phases.length) throw new Error('برنامه‌ی پیشنهادی معتبر نبود');
      const oldKeys = new Set(plan.phases.flatMap((p) => p.tasks.map(taskKey)));
      const newKeys = new Set(phases.flatMap((p) => p.tasks.map(taskKey)));
      const added = phases.flatMap((p) => p.tasks).filter((t) => !oldKeys.has(taskKey(t))).map((t) => `${t.botName}: ${t.task}`);
      const removed = plan.phases.flatMap((p) => p.tasks).filter((t) => !newKeys.has(taskKey(t))).map((t) => `${t.botName}: ${t.task}`);
      setProposal({ note: String(j.note ?? 'برنامه بازنویسی شد').slice(0, 300), phases, risks: (j.risks ?? []).slice(0, 6).map((r) => String(r).slice(0, 200)), added, removed });
    } catch (e) {
      setErr(`دستیار پیشنهادی نداد: ${extractError(e)}`);
    } finally {
      setRevBusy(false);
    }
  }

  async function applyProposal(): Promise<void> {
    if (!proposal) return;
    const doneKeys = new Set(plan.phases.flatMap((p) => p.tasks.filter((t) => t.done).map(taskKey)));
    const phases = proposal.phases.map((p) => ({ ...p, tasks: p.tasks.map((t) => ({ ...t, done: doneKeys.has(taskKey(t)) })) }));
    const ok = await persist({ ...plan, phases, risks: proposal.risks.length ? proposal.risks : plan.risks }, `تغییر با دستیار: ${proposal.note}`);
    if (ok) {
      setProposal(null);
      setInstr('');
    }
  }

  function saveCurrent(): void {
    const v = num(curText);
    if (!curText.trim() || !Number.isFinite(v)) return setErr('یک عدد معتبر وارد کنید');
    void persist({ ...plan, current: v });
  }

  async function writeReport(): Promise<void> {
    setBusyRep(true);
    setErr('');
    try {
      const phasesSummary = plan.phases.map((p) => `روز ${p.from}–${p.to} «${p.title}»: ${p.tasks.filter((t) => t.done).length} از ${p.tasks.length} وظیفه انجام شد`).join('\n');
      const changes = (plan.history ?? []).slice(-8).map((h) => `- ${h.note}`).join('\n');
      const msg =
        'تو تحلیل‌گر گزارش پایانی هستی. ابزاری اجرا نکن. گزارش را ساده و روان فارسی بنویس (حداکثر ۱۴ خط) با این بخش‌ها: ۱) خلاصه‌ی نتیجه ۲) چه کارهایی خوب پیش رفت ۳) چه چیزی عقب ماند و چرا ۴) تغییرهایی که در برنامه داده شد و اثرشان ۵) سه پیشنهاد مشخص برای بازه‌ی بعد. وعده‌ی غیرواقعی نده و فقط از عددهای زیر استفاده کن.\n\n' +
        `[هدف] ${plan.goalText} — ${plan.targetPct}٪ رشد در ${plan.days} روز\n[وضعیت برنامه] ${prog.verdict.label}\n[روز فعلی] ${prog.dayNow} از ${plan.days}\n` +
        (plan.baseline !== null ? `[عدد شروع] ${plan.baseline} ${plan.unit}\n` : '') +
        (plan.current !== null ? `[عدد فعلی] ${plan.current} ${plan.unit}\n` : '') +
        `[تحقق هدف] ${prog.resultPct === null ? 'عدد واقعی وارد نشده' : `${Math.round(prog.resultPct)}٪`}\n` +
        `[وظیفه‌ها] ${prog.tasksDone} از ${prog.tasksTotal}\n[پرونده‌های بازه] ${prog.runs} پرونده، ${prog.runsOk} موفق، ${prog.realActions} اقدام واقعی\n[مراحل]\n${phasesSummary}\n[تاریخچه‌ی تغییرها]\n${changes || '—'}`;
      const text = await askAI(def, `ws-report-${row.id}`, msg);
      await persist({ ...plan, report: { text, at: Date.now() } });
    } catch (e) {
      setErr(`گزارش هوشمند ساخته نشد: ${extractError(e)}`);
    } finally {
      setBusyRep(false);
    }
  }

  async function del(): Promise<void> {
    if (!window.confirm('این برنامه حذف شود؟')) return;
    try {
      await removePlan(slug, row.id);
      props.onDeleted();
    } catch (e) {
      setErr(extractError(e));
    }
  }

  const endAt = plan.startAt + plan.days * DAY;
  const STATE_BADGE: Record<PlanState, { label: string; tone: Tone }> = {
    draft: { label: 'پیش‌نویس — هنوز اجرا نشده', tone: 'info' },
    active: { label: 'در حال اجرا', tone: 'ok' },
    paused: { label: 'متوقف', tone: 'warn' },
    finished: { label: 'پایان‌یافته', tone: 'mute' },
  };

  return (
    <div className="space-y-5">
      {err && <Notice tone="bad">{err}</Notice>}

      {/* نوار وضعیت و دکمه‌های اصلی */}
      <div className="rounded-2xl border p-4" style={{ borderColor: draft ? 'var(--ws)' : 'rgba(255,255,255,.1)', background: 'rgba(255,255,255,.03)' }}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={STATE_BADGE[st].tone}>{STATE_BADGE[st].label}</Badge>
          {!edit && (
            <div className="flex flex-wrap gap-2 mr-auto">
              {draft && (
                <Btn variant="primary" onClick={approve}>
                  ✅ تأیید و شروع اجرا
                </Btn>
              )}
              {st === 'active' && (
                <Btn size="sm" onClick={pause}>
                  ⏸ توقف
                </Btn>
              )}
              {st === 'paused' && (
                <Btn size="sm" variant="primary" onClick={resume}>
                  ▶ ادامه
                </Btn>
              )}
              {(st === 'active' || st === 'paused') && (
                <Btn size="sm" onClick={finish}>
                  🏁 پایان برنامه
                </Btn>
              )}
              {st !== 'finished' && (
                <Btn size="sm" onClick={startEdit}>
                  ✏️ ویرایش برنامه
                </Btn>
              )}
            </div>
          )}
        </div>
        {draft && !edit && (
          <div className="text-sm leading-7 text-white/70 mt-3">
            این برنامه هنوز اجرا نشده و زمانش شروع نشده است. آن را بخوانید؛ اگر چیزی را نمی‌پسندید با «✏️ ویرایش» یا «💬 تغییر با دستیار» عوضش کنید و وقتی راضی بودید «تأیید و شروع اجرا» را بزنید.
          </div>
        )}
        {st === 'paused' && <div className="text-xs text-white/55 mt-2">در زمان توقف، شمارش روزها نمی‌رود و با «ادامه» از همان‌جا پیش می‌رود.</div>}
      </div>

      {/* خلاصه و ارزیابی شدنی‌بودن */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="text-[11px] font-bold text-white/45">هدف</div>
        <div className="text-base font-extrabold leading-7">{plan.goalText}</div>
        <div className="text-xs text-white/55 mt-1 leading-6">
          {fa(plan.targetPct)}٪ رشد در {fa(plan.days)} روز
          {!draft && (
            <>
              {' '}
              · از {jDate(new Date(plan.startAt))} تا {jDate(new Date(endAt))}
            </>
          )}
          {plan.baseline !== null && (
            <>
              {' '}
              · از {fa(plan.baseline)} به {fa(Math.round((prog.targetValue ?? 0) * 100) / 100)} {plan.unit}
            </>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="text-3xl font-black" style={{ color: TONES[fv.tone] }}>
            {pct(plan.feasibility.score)}
          </div>
          <div>
            <Badge tone={fv.tone}>
              {fv.icon} {fv.label}
            </Badge>
            <div className="text-[11px] text-white/40 mt-1">{plan.feasibility.source === 'ai' ? 'ارزیابی هوش مصنوعی' : 'تخمین ساده'}</div>
          </div>
          <Btn size="sm" variant="ghost" disabled={reBusy} onClick={() => void reassess()}>
            {reBusy ? '…' : '🔄 ارزیابی دوباره'}
          </Btn>
        </div>
        <div className="text-sm leading-7 text-white/80 mt-2">{plan.feasibility.reason}</div>
        {plan.feasibility.suggestion && (
          <div className="text-sm leading-7 mt-1" style={{ color: TONES.warn }}>
            💡 {plan.feasibility.suggestion}
          </div>
        )}
      </div>

      {/* گفتگو با دستیار برای تغییر برنامه */}
      {st !== 'finished' && !edit && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
          <div className="font-extrabold text-sm">💬 تغییر برنامه با دستیار</div>
          <div className="text-xs text-white/50 leading-6">به زبان ساده بگویید چه می‌خواهید، مثلاً «هفته‌ی اول سبک‌تر باشد» یا «روی پیگیری مشتری‌ها بیشتر تمرکز کن». دستیار پیشنهاد می‌دهد و تا شما تأیید نکنید چیزی عوض نمی‌شود.</div>
          <textarea className={inputCls + ' min-h-[72px]'} value={instr} onChange={(e) => setInstr(e.target.value)} placeholder="تغییر دلخواه شما…" />
          <Btn size="sm" disabled={revBusy} onClick={() => void askRevise()}>
            {revBusy ? 'دستیار در حال بازنویسی…' : 'پیشنهاد تغییر بگیر'}
          </Btn>
          {proposal && (
            <div className="rounded-xl border border-white/15 bg-white/5 p-3 space-y-3">
              <div className="text-sm font-bold">پیشنهاد دستیار: {proposal.note}</div>
              {proposal.added.length > 0 && (
                <div>
                  <div className="text-xs font-bold" style={{ color: TONES.ok }}>
                    ＋ وظیفه‌های تازه ({fa(proposal.added.length)})
                  </div>
                  <ul className="list-disc pr-5 text-xs leading-6 text-white/75">
                    {proposal.added.slice(0, 8).map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
              {proposal.removed.length > 0 && (
                <div>
                  <div className="text-xs font-bold" style={{ color: TONES.bad }}>
                    － وظیفه‌های حذف‌شده ({fa(proposal.removed.length)})
                  </div>
                  <ul className="list-disc pr-5 text-xs leading-6 text-white/55">
                    {proposal.removed.slice(0, 8).map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
              {proposal.added.length === 0 && proposal.removed.length === 0 && <div className="text-xs text-white/55">وظیفه‌ها یکی است؛ فقط بازه‌ها یا توضیح مرحله‌ها عوض شده است.</div>}
              <div className="text-xs text-white/50">مرحله‌های پیشنهادی: {proposal.phases.map((p) => `${p.title} (روز ${fa(p.from)}–${fa(p.to)})`).join('، ')}</div>
              <div className="flex gap-2">
                <Btn size="sm" variant="primary" onClick={() => void applyProposal()}>
                  ✅ اعمال این تغییر
                </Btn>
                <Btn size="sm" variant="ghost" onClick={() => setProposal(null)}>
                  ❌ رد
                </Btn>
              </div>
              <div className="text-[11px] text-white/40">وظیفه‌هایی که قبلاً انجام داده‌اید و در برنامه‌ی تازه هم هستند، تیکشان می‌ماند.</div>
            </div>
          )}
        </div>
      )}

      {/* پیشرفت */}
      {!draft && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-extrabold text-sm">📊 پیشرفت و تطابق با هدف</div>
            <Badge tone={prog.verdict.tone}>{prog.verdict.label}</Badge>
          </div>
          <ProgressBar value={prog.timePct} max={100} label={`زمان: روز ${fa(prog.dayNow)} از ${fa(plan.days)} (${pct(prog.timePct)})`} />
          <ProgressBar value={prog.taskPct} max={100} color="#22d3ee" label={`وظیفه‌های انجام‌شده: ${fa(prog.tasksDone)} از ${fa(prog.tasksTotal)} (${pct(prog.taskPct)})`} />
          {plan.baseline !== null && (
            <ProgressBar value={Math.min(100, prog.resultPct ?? 0)} max={100} color="#4ade80" label={prog.resultPct === null ? 'تحقق هدف: عدد فعلی را وارد کنید' : `تحقق هدف: ${pct(prog.resultPct)}`} />
          )}
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ['پرونده‌ی بازه', prog.runs],
              ['موفق', prog.runsOk],
              ['اقدام واقعی', prog.realActions],
            ].map(([l, v]) => (
              <div key={String(l)} className="rounded-xl bg-white/5 py-2">
                <div className="text-lg font-black tabular-nums">{fa(Number(v))}</div>
                <div className="text-[11px] text-white/45">{l}</div>
              </div>
            ))}
          </div>
          {plan.baseline !== null && (
            <div className="flex flex-wrap items-end gap-2 pt-1">
              <Field label={`عدد واقعی امروز شما (${plan.unit || 'همان واحد'})`} className="flex-1 min-w-[180px]">
                <input className={inputCls} inputMode="decimal" value={curText} onChange={(e) => setCurText(e.target.value)} />
              </Field>
              <Btn size="sm" onClick={saveCurrent}>
                ثبت عدد
              </Btn>
            </div>
          )}
        </div>
      )}

      {/* برنامه‌ی روزبه‌روز: نمایش یا ویرایش */}
      {edit ? (
        <div className="rounded-2xl border p-4 space-y-4" style={{ borderColor: 'var(--ws)' }}>
          <div className="font-extrabold text-sm">✏️ ویرایش برنامه</div>
          <div className="grid md:grid-cols-3 gap-3">
            <Field label="هدف" className="md:col-span-3">
              <input className={inputCls} value={edit.goalText} onChange={(e) => setEdit({ ...edit, goalText: e.target.value })} />
            </Field>
            <Field label="درصد رشد">
              <input className={inputCls} inputMode="decimal" value={edit.targetPct} onChange={(e) => setEdit({ ...edit, targetPct: e.target.value })} />
            </Field>
            <Field label="مدت (روز)" hint={`بین ${fa(MIN_DAYS)} تا ${fa(MAX_DAYS)}`}>
              <input className={inputCls} inputMode="numeric" value={edit.days} onChange={(e) => setEdit({ ...edit, days: e.target.value })} />
            </Field>
          </div>
          {edit.phases.map((p, pi) => (
            <div key={p.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-3">
              <div className="grid grid-cols-[1fr_72px_72px] md:grid-cols-[1fr_90px_90px_auto] gap-2 items-end">
                <Field label={`مرحله‌ی ${fa(pi + 1)}`}>
                  <input className={inputCls} value={p.title} onChange={(e) => patchPhase(p.id, (x) => ({ ...x, title: e.target.value }))} />
                </Field>
                <Field label="از روز">
                  <input className={inputCls} inputMode="numeric" value={String(p.from)} onChange={(e) => patchPhase(p.id, (x) => ({ ...x, from: num(e.target.value) || 0 }))} />
                </Field>
                <Field label="تا روز">
                  <input className={inputCls} inputMode="numeric" value={String(p.to)} onChange={(e) => patchPhase(p.id, (x) => ({ ...x, to: num(e.target.value) || 0 }))} />
                </Field>
                <Btn size="sm" variant="danger" onClick={() => setEdit({ ...edit, phases: edit.phases.filter((x) => x.id !== p.id) })}>
                  حذف مرحله
                </Btn>
              </div>
              <Field label="تمرکز این مرحله">
                <input className={inputCls} value={p.focus} onChange={(e) => patchPhase(p.id, (x) => ({ ...x, focus: e.target.value }))} />
              </Field>
              <div className="space-y-2">
                {p.tasks.map((t) => (
                  <div key={t.id} className="grid md:grid-cols-[200px_1fr_auto] gap-2 items-start">
                    <select className={inputCls} value={t.bot} onChange={(e) => setTaskBot(p.id, t.id, e.target.value)}>
                      {botOptions.map((b) => (
                        <option key={b.bot} value={b.bot} className="text-black">
                          {b.icon} {b.botName}
                        </option>
                      ))}
                    </select>
                    <input className={inputCls} value={t.task} placeholder="وظیفه‌ی این ربات…" onChange={(e) => patchPhase(p.id, (x) => ({ ...x, tasks: x.tasks.map((y) => (y.id === t.id ? { ...y, task: e.target.value } : y)) }))} />
                    <Btn size="sm" variant="ghost" onClick={() => patchPhase(p.id, (x) => ({ ...x, tasks: x.tasks.filter((y) => y.id !== t.id) }))}>
                      حذف
                    </Btn>
                  </div>
                ))}
                <Btn size="sm" onClick={() => addTask(p.id)}>
                  + وظیفه
                </Btn>
              </div>
            </div>
          ))}
          <Btn size="sm" onClick={addPhase}>
            + مرحله‌ی تازه
          </Btn>
          <div className="flex gap-2 pt-1">
            <Btn variant="primary" onClick={() => void saveEdit()}>
              💾 ذخیره‌ی ویرایش
            </Btn>
            <Btn variant="ghost" onClick={() => { setEdit(null); setErr(''); }}>
              انصراف
            </Btn>
          </div>
        </div>
      ) : (
        <div>
          <div className="font-extrabold text-sm mb-2">🗓️ برنامه‌ی {fa(plan.days)} روزه و وظیفه‌ی هر ربات</div>
          <DayStrip plan={plan} dayNow={draft ? 0 : prog.dayNow} />
          <div className="space-y-3 mt-3">
            {plan.phases.map((ph) => {
              const active = !draft && prog.dayNow >= ph.from && prog.dayNow <= ph.to && st === 'active';
              const done = ph.tasks.filter((t) => t.done).length;
              return (
                <div key={ph.id} className="rounded-2xl border p-4" style={{ borderColor: active ? 'var(--ws)' : 'rgba(255,255,255,.1)', background: active ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.02)' }}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-sm">{ph.title}</span>
                    <Badge tone="mute">
                      روز {fa(ph.from)}–{fa(ph.to)}
                    </Badge>
                    {active && <Badge tone="info">الان اینجاییم</Badge>}
                    {!draft && (
                      <span className="text-[11px] text-white/40 mr-auto tabular-nums">
                        {fa(done)}/{fa(ph.tasks.length)}
                      </span>
                    )}
                  </div>
                  {ph.focus && <div className="text-xs text-white/55 mt-1 leading-6">{ph.focus}</div>}
                  <ul className="mt-3 space-y-2">
                    {ph.tasks.map((t) => (
                      <li key={t.id}>
                        <label className={`flex items-start gap-2.5 ${st === 'active' ? 'cursor-pointer' : 'cursor-default'}`}>
                          <input type="checkbox" className="mt-1.5 accent-[var(--ws)]" checked={t.done} disabled={st !== 'active'} onChange={() => toggle(ph.id, t.id)} />
                          <span className="text-sm leading-7">
                            <b>
                              {t.icon} {t.botName}
                            </b>
                            <span className={t.done ? 'line-through text-white/35' : 'text-white/80'}> — {t.task}</span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          {draft && <div className="text-[11px] text-white/40 mt-2">تیک‌زدن وظیفه‌ها بعد از «تأیید و شروع اجرا» فعال می‌شود.</div>}
        </div>
      )}

      {plan.risks.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="font-extrabold text-sm mb-1">⚠️ نکته‌ها و خطرها</div>
          <ul className="list-disc pr-5 space-y-1 text-sm text-white/75 leading-7">
            {plan.risks.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {/* گزارش */}
      {!draft && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className="font-extrabold text-sm">📝 گزارش برنامه و تطابق با هدف</div>
            <Btn size="sm" disabled={busyRep} onClick={() => void writeReport()}>
              {busyRep ? 'در حال نوشتن…' : plan.report ? '🔄 گزارش تازه' : '🤖 نوشتن گزارش'}
            </Btn>
          </div>
          {plan.report ? (
            <>
              <div className="text-sm leading-8 text-white/85 whitespace-pre-wrap">{plan.report.text}</div>
              <div className="text-[11px] text-white/35 mt-2">نوشته‌شده در {jDate(new Date(plan.report.at))}</div>
            </>
          ) : (
            <div className="text-sm text-white/50 leading-7">هر زمان خواستید (وسط برنامه یا آخر آن) گزارش بگیرید: خلاصه‌ی نتیجه، کارهای خوب، عقب‌ماندگی‌ها، اثر تغییرهای برنامه و پیشنهاد برای بازه‌ی بعد.</div>
          )}
        </div>
      )}

      {/* تاریخچه‌ی تغییرها */}
      {(plan.history?.length ?? 0) > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <button type="button" className="text-sm font-bold text-white/70" onClick={() => setShowHist((v) => !v)}>
            🕘 تاریخچه‌ی تغییرها ({fa(plan.history?.length ?? 0)}) {showHist ? '▲' : '▼'}
          </button>
          {showHist && (
            <ol className="mt-3 space-y-1.5 text-xs leading-6">
              {[...(plan.history ?? [])].reverse().map((h, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-white/35 tabular-nums shrink-0">{jDate(new Date(h.at))}</span>
                  <span className="text-white/75">{h.note}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      <div className="text-left">
        <Btn size="sm" variant="danger" onClick={() => void del()}>
          حذف این برنامه
        </Btn>
      </div>
    </div>
  );
}

/* نوار روزها: هر مرحله یک بخش، امروز با نشانگر */
function DayStrip(props: { plan: PlanData; dayNow: number }) {
  const { plan } = props;
  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden bg-white/10" dir="rtl">
        {plan.phases.map((p, i) => {
          const w = ((p.to - p.from + 1) / plan.days) * 100;
          const past = p.to < props.dayNow;
          const on = props.dayNow >= p.from && props.dayNow <= p.to;
          return <div key={p.id} title={p.title} style={{ width: `${w}%`, background: past ? TONES.ok : on ? 'var(--ws)' : 'rgba(255,255,255,.12)', marginInlineStart: i ? 2 : 0 }} />;
        })}
      </div>
      <div className="flex justify-between text-[10px] text-white/35 mt-1 tabular-nums">
        <span>روز ۱</span>
        <span>روز {fa(plan.days)}</span>
      </div>
    </div>
  );
}
