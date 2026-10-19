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

export interface PlanData {
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
  feasibility?: { verdict?: string; score?: number; reason?: string; suggestion?: string };
  phases?: Array<{ title?: string; from?: number; to?: number; focus?: string; tasks?: Array<{ bot?: string; task?: string }> }>;
  risks?: string[];
}

function normalizeAiPlan(raw: AiPlan, def: ProcessDef, days: number): { feasibility: Feasibility; phases: PlanPhase[]; risks: string[] } {
  const f = raw.feasibility ?? {};
  const verdict: Verdict = f.verdict === 'realistic' || f.verdict === 'hard' || f.verdict === 'unrealistic' ? f.verdict : 'hard';
  const bySlug = new Map(def.stages.map((s) => [s.bot, s]));
  const phases: PlanPhase[] = (raw.phases ?? [])
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
  if (phases.length === 0) throw new Error('برنامه‌ی هوشمند معتبر نبود');
  return {
    feasibility: {
      verdict,
      score: Math.round(clamp(Number(f.score) || 50, 0, 100)),
      reason: String(f.reason ?? '').slice(0, 600) || 'بدون توضیح',
      suggestion: f.suggestion ? String(f.suggestion).slice(0, 300) : undefined,
      source: 'ai',
    },
    phases,
    risks: (raw.risks ?? []).slice(0, 6).map((r) => String(r).slice(0, 200)),
  };
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
  const dayNow = clamp(Math.floor((now - p.startAt) / DAY) + 1, 1, p.days);
  const timePct = clamp(((now - p.startAt) / (p.days * DAY)) * 100, 0, 100);
  const all = p.phases.flatMap((x) => x.tasks);
  const tasksDone = all.filter((t) => t.done).length;
  const taskPct = all.length ? (tasksDone / all.length) * 100 : 0;
  const mine = runs.filter((r) => r.startedAt >= p.startAt);
  const realActions = mine.reduce((a, r) => a + (r.trail ?? []).filter((t) => t.source === 'real').length, 0);
  const targetValue = p.baseline !== null ? p.baseline * (1 + p.targetPct / 100) : null;
  let resultPct: number | null = null;
  if (p.baseline !== null && p.current !== null && p.baseline !== 0) {
    const gain = ((p.current - p.baseline) / p.baseline) * 100;
    resultPct = clamp((gain / p.targetPct) * 100, 0, 999);
  }
  // مقایسه‌ی نتیجه (اگر باشد) یا اجرای وظیفه‌ها با گذر زمان
  const measure = resultPct ?? taskPct;
  const ratio = timePct > 0 ? measure / timePct : measure >= 100 ? 2 : 1;
  const verdict =
    resultPct !== null && resultPct >= 100
      ? { label: 'هدف محقق شد', tone: 'ok' as Tone }
      : timePct >= 100
        ? resultPct !== null
          ? { label: 'بازه تمام شد؛ هدف کامل نشد', tone: 'bad' as Tone }
          : { label: 'بازه تمام شد؛ نتیجه را وارد کنید', tone: 'warn' as Tone }
        : ratio >= 0.9
          ? { label: 'مطابق برنامه', tone: 'ok' as Tone }
          : ratio >= 0.6
            ? { label: 'کمی عقب‌تر از برنامه', tone: 'warn' as Tone }
            : { label: 'عقب‌تر از برنامه', tone: 'bad' as Tone };
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
  const [days, setDays] = useState('21');
  const [baseText, setBaseText] = useState('');
  const [unit, setUnit] = useState('');
  const [busy, setBusy] = useState<'' | 'ai' | 'rule'>('');
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');

  async function create(useAi: boolean): Promise<void> {
    const targetPct = num(pctText);
    const d = Number(days);
    const baseline = baseText.trim() ? num(baseText) : null;
    if (!goalText.trim()) return setErr('هدفتان را بنویسید؛ مثلاً «افزایش فروش»');
    if (!Number.isFinite(targetPct) || targetPct <= 0 || targetPct > 1000) return setErr('درصد رشد باید عددی بین ۱ تا ۱۰۰۰ باشد');
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
    const plan: PlanData = { ...inputs, startAt: Date.now(), feasibility, phases, risks, current: baseline };
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
      <div className="grid md:grid-cols-2 gap-3">
        <Field label="هدف شما چیست؟" className="md:col-span-2">
          <input className={inputCls} value={goalText} onChange={(e) => setGoalText(e.target.value)} placeholder="مثلاً: افزایش فروش ماهانه" />
        </Field>
        <Field label="چند درصد رشد می‌خواهید؟" hint="مثلاً ۱۵">
          <input className={inputCls} inputMode="decimal" value={pctText} onChange={(e) => setPctText(e.target.value)} />
        </Field>
        <Field label="در چه مدتی؟">
          <Pills<string> value={days} onChange={setDays} options={DAY_CHOICES.map((c) => ({ value: c.value, label: c.label }))} />
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
    </div>
  );
}

/* ───── نمایش و پیگیری برنامه ───── */
function PlanView(props: { slug: string; def: ProcessDef; row: PlanRow; runs: RunRecord[]; onChanged: () => void; onDeleted: () => void }) {
  const { slug, def, row } = props;
  const [plan, setPlan] = useState<PlanData>(row.plan);
  const [curText, setCurText] = useState(row.plan.current !== null ? String(row.plan.current) : '');
  const [err, setErr] = useState('');
  const [busyRep, setBusyRep] = useState(false);
  const prog = useMemo(() => planProgress(plan, props.runs), [plan, props.runs]);
  const fv = VERDICT[plan.feasibility.verdict];

  async function persist(next: PlanData): Promise<void> {
    setPlan(next);
    try {
      await patchPlan(slug, row.id, next);
      setErr('');
    } catch (e) {
      setErr(extractError(e));
    }
  }

  function toggle(phaseId: string, taskId: string): void {
    void persist({
      ...plan,
      phases: plan.phases.map((p) => (p.id !== phaseId ? p : { ...p, tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)) })),
    });
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
      const phasesText = plan.phases
        .map((p) => `روز ${p.from}–${p.to} «${p.title}»: ${p.tasks.filter((t) => t.done).length} از ${p.tasks.length} وظیفه انجام شد`)
        .join('\n');
      const msg =
        'تو تحلیل‌گر گزارش پایانی هستی. ابزاری اجرا نکن. گزارش را ساده و روان فارسی بنویس (حداکثر ۱۲ خط) با این بخش‌ها: ۱) خلاصه‌ی نتیجه ۲) چه کارهایی خوب پیش رفت ۳) چه چیزی عقب ماند و چرا ۴) سه پیشنهاد مشخص برای بازه‌ی بعد. وعده‌ی غیرواقعی نده و فقط از عددهای زیر استفاده کن.\n\n' +
        `[هدف] ${plan.goalText} — ${plan.targetPct}٪ رشد در ${plan.days} روز\n[روز فعلی] ${prog.dayNow} از ${plan.days}\n` +
        (plan.baseline !== null ? `[عدد شروع] ${plan.baseline} ${plan.unit}\n` : '') +
        (plan.current !== null ? `[عدد فعلی] ${plan.current} ${plan.unit}\n` : '') +
        `[تحقق هدف] ${prog.resultPct === null ? 'عدد واقعی وارد نشده' : `${Math.round(prog.resultPct)}٪`}\n` +
        `[وظیفه‌ها] ${prog.tasksDone} از ${prog.tasksTotal}\n[پرونده‌های بازه] ${prog.runs} پرونده، ${prog.runsOk} موفق، ${prog.realActions} اقدام واقعی\n[مراحل]\n${phasesText}`;
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

  return (
    <div className="space-y-5">
      {err && <Notice tone="bad">{err}</Notice>}

      {/* خلاصه و ارزیابی شدنی‌بودن */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="text-[11px] font-bold text-white/45">هدف</div>
        <div className="text-base font-extrabold leading-7">{plan.goalText}</div>
        <div className="text-xs text-white/55 mt-1 leading-6">
          {fa(plan.targetPct)}٪ رشد در {fa(plan.days)} روز · از {jDate(new Date(plan.startAt))} تا {jDate(new Date(endAt))}
          {plan.baseline !== null && <> · از {fa(plan.baseline)} به {fa(Math.round((prog.targetValue ?? 0) * 100) / 100)} {plan.unit}</>}
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
        </div>
        <div className="text-sm leading-7 text-white/80 mt-2">{plan.feasibility.reason}</div>
        {plan.feasibility.suggestion && <div className="text-sm leading-7 mt-1" style={{ color: TONES.warn }}>💡 {plan.feasibility.suggestion}</div>}
      </div>

      {/* پیشرفت */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-extrabold text-sm">📊 پیشرفت و تطابق با هدف</div>
          <Badge tone={prog.verdict.tone}>{prog.verdict.label}</Badge>
        </div>
        <ProgressBar value={prog.timePct} max={100} label={`زمان: روز ${fa(prog.dayNow)} از ${fa(plan.days)} (${pct(prog.timePct)})`} />
        <ProgressBar value={prog.taskPct} max={100} color="#22d3ee" label={`وظیفه‌های انجام‌شده: ${fa(prog.tasksDone)} از ${fa(prog.tasksTotal)} (${pct(prog.taskPct)})`} />
        {plan.baseline !== null && (
          <ProgressBar
            value={Math.min(100, prog.resultPct ?? 0)}
            max={100}
            color="#4ade80"
            label={prog.resultPct === null ? 'تحقق هدف: عدد فعلی را وارد کنید' : `تحقق هدف: ${pct(prog.resultPct)}`}
          />
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

      {/* برنامه‌ی روزبه‌روز */}
      <div>
        <div className="font-extrabold text-sm mb-2">🗓️ برنامه‌ی {fa(plan.days)} روزه و وظیفه‌ی هر ربات</div>
        <DayStrip plan={plan} dayNow={prog.dayNow} />
        <div className="space-y-3 mt-3">
          {plan.phases.map((ph) => {
            const active = prog.dayNow >= ph.from && prog.dayNow <= ph.to;
            const done = ph.tasks.filter((t) => t.done).length;
            return (
              <div key={ph.id} className="rounded-2xl border p-4" style={{ borderColor: active ? 'var(--ws)' : 'rgba(255,255,255,.1)', background: active ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.02)' }}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-sm">{ph.title}</span>
                  <Badge tone="mute">
                    روز {fa(ph.from)}–{fa(ph.to)}
                  </Badge>
                  {active && <Badge tone="info">الان اینجاییم</Badge>}
                  <span className="text-[11px] text-white/40 mr-auto tabular-nums">
                    {fa(done)}/{fa(ph.tasks.length)}
                  </span>
                </div>
                {ph.focus && <div className="text-xs text-white/55 mt-1 leading-6">{ph.focus}</div>}
                <ul className="mt-3 space-y-2">
                  {ph.tasks.map((t) => (
                    <li key={t.id}>
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input type="checkbox" className="mt-1.5 accent-[var(--ws)]" checked={t.done} onChange={() => toggle(ph.id, t.id)} />
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
      </div>

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
          <div className="text-sm text-white/50 leading-7">هر زمان خواستید (وسط برنامه یا آخر آن) گزارش بگیرید: خلاصه‌ی نتیجه، کارهای خوب، عقب‌ماندگی‌ها و پیشنهاد برای بازه‌ی بعد.</div>
        )}
      </div>

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
