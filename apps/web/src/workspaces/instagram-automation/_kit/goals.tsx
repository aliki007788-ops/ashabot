'use client';

/* Workspace Kit — اهداف کاربر برای هر خوشه: تعریف، اندازه‌گیری از پرونده‌های واقعی، درصد تحقق و سازگاری هر پرونده با اهداف. */
import { useEffect, useMemo, useState } from 'react';
import { api, extractError } from '@/lib/api';
import { Badge, Btn, Empty, ErrorBanner, Field, Notice, Panel, ProgressBar, Spinner, TONES, inputCls } from './ui';
import type { Tone } from './ui';
import { addDays, fa, pct, startOfDay, startOfWeek, toEnDigits } from './format';
import { fetchRuns } from './process';
import type { ProcessDef, RunRecord } from './process';

/* ───────────── انواع ───────────── */
export type GoalMetric =
  | 'runs_done'
  | 'success_rate'
  | 'auto_share'
  | 'real_actions'
  | 'real_crm'
  | 'real_booking'
  | 'real_payment'
  | 'avg_seconds'
  | 'keyword';
export type GoalPeriod = 'day' | 'week' | 'month';

export interface Goal {
  id: string;
  title: string;
  metric: GoalMetric;
  target: number;
  period: GoalPeriod;
  keyword: string;
}

interface MetricInfo {
  label: string;
  unit: string;
  /** count: هرچه بیشتر بهتر؛ rate: درصد؛ lower: هرچه کمتر بهتر */
  kind: 'count' | 'rate' | 'lower';
}

export const METRIC_INFO: Record<GoalMetric, MetricInfo> = {
  runs_done: { label: 'تعداد پرونده‌ی موفق', unit: 'پرونده', kind: 'count' },
  success_rate: { label: 'نرخ موفقیت پرونده‌ها', unit: '٪', kind: 'rate' },
  auto_share: { label: 'سهم پرونده‌های خودکار', unit: '٪', kind: 'rate' },
  real_actions: { label: 'اقدام‌های واقعی روی پلتفرم', unit: 'اقدام', kind: 'count' },
  real_crm: { label: 'مخاطب ثبت‌شده در CRM', unit: 'مخاطب', kind: 'count' },
  real_booking: { label: 'نوبت ثبت‌شده', unit: 'نوبت', kind: 'count' },
  real_payment: { label: 'لینک پرداخت ساخته‌شده', unit: 'لینک', kind: 'count' },
  avg_seconds: { label: 'میانگین زمان پرونده (کمتر بهتر)', unit: 'ثانیه', kind: 'lower' },
  keyword: { label: 'پرونده‌های دارای عبارت مشخص', unit: 'پرونده', kind: 'count' },
};

export const PERIOD_LABEL: Record<GoalPeriod, string> = { day: 'امروز', week: 'این هفته', month: '۳۰ روز اخیر' };

/* ───────────── سرور ───────────── */
interface GoalRow {
  id: string;
  title: string;
  value: number | null;
  unit: string | null;
  description: string | null;
  metadata: string | null;
}

export async function fetchGoals(slug: string): Promise<Goal[]> {
  const r = await api.get(`/api/clusters/${slug}/goals`);
  return ((r.data.items ?? []) as GoalRow[]).map((g) => {
    let keyword = '';
    try {
      keyword = String((JSON.parse(g.metadata ?? '{}') as { keyword?: string }).keyword ?? '');
    } catch {
      keyword = '';
    }
    const metric = (g.unit && g.unit in METRIC_INFO ? g.unit : 'runs_done') as GoalMetric;
    const period = (g.description === 'day' || g.description === 'month' ? g.description : 'week') as GoalPeriod;
    return { id: g.id, title: g.title, metric, target: Number(g.value ?? 0), period, keyword };
  });
}

export async function createGoal(slug: string, g: Omit<Goal, 'id'>): Promise<void> {
  await api.post(`/api/clusters/${slug}/goals`, { title: g.title, metric: g.metric, target: g.target, period: g.period, keyword: g.keyword });
}

export async function deleteGoal(slug: string, id: string): Promise<void> {
  await api.delete(`/api/clusters/${slug}/goals/${id}`);
}

/* ───────────── اندازه‌گیری ───────────── */
export function periodStart(period: GoalPeriod, now = new Date()): number {
  if (period === 'day') return startOfDay(now).getTime();
  if (period === 'week') return startOfWeek(now).getTime();
  return addDays(startOfDay(now), -29).getTime();
}

const realItems = (r: RunRecord, note?: string): number =>
  (r.trail ?? []).filter((t) => t.status === 'done' && t.source === 'real' && (!note || t.note === note)).length;

const runText = (r: RunRecord): string => `${r.input}\n${(r.trail ?? []).map((t) => t.output ?? '').join('\n')}`;

export interface Measure {
  current: number;
  /** ۰ تا ۱۰۰؛ null یعنی در این بازه پرونده‌ای نبوده */
  progress: number | null;
  runs: number;
}

export function measureGoal(goal: Goal, all: RunRecord[], now = new Date()): Measure {
  const from = periodStart(goal.period, now);
  const runs = all.filter((r) => r.startedAt >= from && r.status !== 'running');
  const done = runs.filter((r) => r.status === 'done');
  let current = 0;
  switch (goal.metric) {
    case 'runs_done':
      current = done.length;
      break;
    case 'success_rate':
      current = runs.length ? (done.length / runs.length) * 100 : 0;
      break;
    case 'auto_share':
      current = runs.length ? (runs.filter((r) => r.origin !== 'manual').length / runs.length) * 100 : 0;
      break;
    case 'real_actions':
      current = runs.reduce((a, r) => a + realItems(r), 0);
      break;
    case 'real_crm':
      current = runs.reduce((a, r) => a + realItems(r, 'CRM'), 0);
      break;
    case 'real_booking':
      current = runs.reduce((a, r) => a + realItems(r, 'نوبت واقعی'), 0);
      break;
    case 'real_payment':
      current = runs.reduce((a, r) => a + realItems(r, 'پرداخت واقعی'), 0);
      break;
    case 'avg_seconds': {
      const withMs = runs.filter((r) => r.ms);
      current = withMs.length ? withMs.reduce((a, r) => a + (r.ms ?? 0), 0) / withMs.length / 1000 : 0;
      break;
    }
    case 'keyword': {
      const k = goal.keyword.trim();
      current = k ? runs.filter((r) => runText(r).includes(k)).length : 0;
      break;
    }
  }
  const kind = METRIC_INFO[goal.metric].kind;
  let progress: number | null;
  if (!runs.length) progress = null;
  else if (kind === 'lower') progress = current > 0 ? Math.min(100, (goal.target / current) * 100) : 100;
  else progress = Math.min(100, goal.target > 0 ? (current / goal.target) * 100 : 0);
  return { current, progress, runs: runs.length };
}

export function goalStatus(progress: number | null): { label: string; tone: Tone } {
  if (progress === null) return { label: 'بدون داده', tone: 'mute' };
  if (progress >= 100) return { label: 'محقق شد', tone: 'ok' };
  if (progress >= 60) return { label: 'در مسیر', tone: 'info' };
  return { label: 'عقب‌تر از هدف', tone: 'warn' };
}

/** میانگین درصد تحقق همه‌ی اهداف (فقط اهدافی که داده دارند) */
export function overallProgress(goals: Goal[], runs: RunRecord[]): { pct: number | null; ok: number; onTrack: number; behind: number; noData: number } {
  let sum = 0;
  let n = 0;
  const c = { ok: 0, onTrack: 0, behind: 0, noData: 0 };
  for (const g of goals) {
    const m = measureGoal(g, runs);
    if (m.progress === null) {
      c.noData++;
      continue;
    }
    sum += m.progress;
    n++;
    if (m.progress >= 100) c.ok++;
    else if (m.progress >= 60) c.onTrack++;
    else c.behind++;
  }
  return { pct: n ? sum / n : null, ...c };
}

/* ───────────── سازگاری یک پرونده با اهداف ───────────── */
export interface FitLine {
  goal: Goal;
  /** true: به هدف کمک کرد؛ false: نکرد؛ null: از روی داده‌ی ذخیره‌شده معلوم نیست */
  hit: boolean | null;
  why: string;
}

export function runFit(run: RunRecord, goals: Goal[]): { pct: number | null; lines: FitLine[] } {
  const lines: FitLine[] = goals.map((goal) => {
    const unknown = !run.trail;
    switch (goal.metric) {
      case 'runs_done':
      case 'success_rate':
        return { goal, hit: run.status === 'done', why: run.status === 'done' ? 'پرونده با موفقیت پایان یافت' : 'پرونده ناموفق بود' };
      case 'auto_share':
        return { goal, hit: run.origin !== 'manual', why: run.origin !== 'manual' ? 'بدون دخالت دست انجام شد' : 'به‌صورت دستی اجرا شد' };
      case 'real_actions': {
        if (unknown) return { goal, hit: null, why: 'جزئیات مرحله‌ها ذخیره نشده' };
        const n = realItems(run);
        return { goal, hit: n > 0, why: n > 0 ? `${fa(n)} اقدام واقعی انجام شد` : 'اقدام واقعی انجام نشد (نمایشی/هوشمند)' };
      }
      case 'real_crm':
      case 'real_booking':
      case 'real_payment': {
        if (unknown) return { goal, hit: null, why: 'جزئیات مرحله‌ها ذخیره نشده' };
        const note = goal.metric === 'real_crm' ? 'CRM' : goal.metric === 'real_booking' ? 'نوبت واقعی' : 'پرداخت واقعی';
        const n = realItems(run, note);
        return { goal, hit: n > 0, why: n > 0 ? 'این اقدام واقعی در همین پرونده انجام شد' : 'این اقدام در این پرونده انجام نشد' };
      }
      case 'avg_seconds': {
        if (!run.ms) return { goal, hit: null, why: 'زمان ثبت نشده' };
        const s = run.ms / 1000;
        return { goal, hit: s <= goal.target, why: `${fa(Math.round(s * 10) / 10)} ثانیه (هدف ${fa(goal.target)})` };
      }
      case 'keyword': {
        const k = goal.keyword.trim();
        if (!k) return { goal, hit: null, why: 'عبارت هدف خالی است' };
        const has = runText(run).includes(k);
        return { goal, hit: has, why: has ? `عبارت «${k}» در پرونده آمده` : `عبارت «${k}» در پرونده نیست` };
      }
    }
  });
  const known = lines.filter((l) => l.hit !== null);
  return { pct: known.length ? (known.filter((l) => l.hit).length / known.length) * 100 : null, lines };
}

export function fitLabel(p: number | null): { label: string; tone: Tone } {
  if (p === null) return { label: 'نامشخص', tone: 'mute' };
  if (p >= 75) return { label: 'سازگار', tone: 'ok' };
  if (p >= 40) return { label: 'سازگاری نسبی', tone: 'warn' };
  return { label: 'ناسازگار', tone: 'bad' };
}

/* ───────────── هدف‌های پیشنهادی بر اساس فرایند ───────────── */
export function suggestGoals(def: ProcessDef): Array<Omit<Goal, 'id'>> {
  const acts = new Set(def.stages.map((s) => (s.act ?? '').split(':')[0]));
  const out: Array<Omit<Goal, 'id'>> = [
    { title: 'پردازش ۲۰ پرونده‌ی موفق در هفته', metric: 'runs_done', target: 20, period: 'week', keyword: '' },
    { title: 'نرخ موفقیت بالای ۹۵٪', metric: 'success_rate', target: 95, period: 'week', keyword: '' },
    { title: 'حداقل ۷۰٪ پرونده‌ها خودکار', metric: 'auto_share', target: 70, period: 'week', keyword: '' },
    { title: 'میانگین زمان هر پرونده زیر ۳۰ ثانیه', metric: 'avg_seconds', target: 30, period: 'week', keyword: '' },
  ];
  if (acts.has('crm')) out.push({ title: 'ثبت ۱۰ مخاطب در CRM هر هفته', metric: 'real_crm', target: 10, period: 'week', keyword: '' });
  if (acts.has('booking')) out.push({ title: 'ثبت ۱۰ نوبت واقعی هر هفته', metric: 'real_booking', target: 10, period: 'week', keyword: '' });
  if (acts.has('payment')) out.push({ title: 'ساخت ۵ لینک پرداخت هر هفته', metric: 'real_payment', target: 5, period: 'week', keyword: '' });
  return out;
}

/* ───────────── رابط ───────────── */
const fmt = (n: number, metric: GoalMetric): string => {
  const k = METRIC_INFO[metric].kind;
  return k === 'count' ? fa(Math.round(n)) : fa(Math.round(n * 10) / 10);
};

/** بارگذاری اهداف + پرونده‌های اخیر (برای نمایش در چند جا) */
export function useGoalsData(slug: string) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    Promise.all([fetchGoals(slug), fetchRuns(slug, { take: 100 })])
      .then(([g, r]) => {
        if (!live) return;
        setGoals(g);
        setRuns(r.items);
        setError('');
      })
      .catch((e) => live && setError(extractError(e)))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [slug, tick]);
  return { goals, runs, loading, error, reload: () => setTick((t) => t + 1) };
}

export function GoalsPanel(props: { slug: string; def: ProcessDef }) {
  const { goals, runs, loading, error, reload } = useGoalsData(props.slug);
  const [title, setTitle] = useState('');
  const [metric, setMetric] = useState<GoalMetric>('runs_done');
  const [target, setTarget] = useState('');
  const [period, setPeriod] = useState<GoalPeriod>('week');
  const [keyword, setKeyword] = useState('');
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState('');

  const overall = useMemo(() => overallProgress(goals, runs), [goals, runs]);
  const suggestions = useMemo(() => suggestGoals(props.def).filter((s) => !goals.some((g) => g.title === s.title)), [props.def, goals]);

  async function add(g: Omit<Goal, 'id'>): Promise<void> {
    setBusy(true);
    setFormErr('');
    try {
      await createGoal(props.slug, g);
      reload();
    } catch (e) {
      setFormErr(extractError(e));
    } finally {
      setBusy(false);
    }
  }

  async function submit(): Promise<void> {
    const t = Number(toEnDigits(target).replace(/[,٬]/g, ''));
    if (!title.trim()) return setFormErr('برای هدف یک عنوان بنویسید.');
    if (!Number.isFinite(t) || t <= 0) return setFormErr('عدد هدف باید بزرگ‌تر از صفر باشد.');
    if (metric === 'keyword' && !keyword.trim()) return setFormErr('عبارت مورد نظر را بنویسید.');
    await add({ title: title.trim(), metric, target: t, period, keyword: keyword.trim() });
    setTitle('');
    setTarget('');
    setKeyword('');
  }

  if (loading && !goals.length && !runs.length) return <Spinner />;

  return (
    <div className="space-y-4">
      <ErrorBanner message={error} onRetry={reload} />
      <Panel title="تحقق اهداف این خوشه" subtitle="درصد تحقق از پرونده‌های واقعی ثبت‌شده‌ی همین میزکار محاسبه می‌شود">
        {goals.length === 0 ? (
          <Empty icon="🎯" text="هنوز هدفی برای این خوشه تعریف نکرده‌اید. از پیشنهادها یکی را بزنید یا هدف خودتان را بنویسید." />
        ) : (
          <div className="grid md:grid-cols-[220px_1fr] gap-5 items-center">
            <div className="text-center">
              <div className="text-5xl font-black" style={{ color: overall.pct === null ? TONES.mute : overall.pct >= 100 ? TONES.ok : 'var(--ws)' }}>
                {overall.pct === null ? '—' : pct(overall.pct)}
              </div>
              <div className="text-xs text-white/50 mt-1">میانگین تحقق اهداف</div>
            </div>
            <div className="space-y-3">
              <ProgressBar value={overall.pct ?? 0} max={100} />
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge tone="ok">{fa(overall.ok)} محقق‌شده</Badge>
                <Badge tone="info">{fa(overall.onTrack)} در مسیر</Badge>
                <Badge tone="warn">{fa(overall.behind)} عقب‌تر</Badge>
                {overall.noData > 0 && <Badge tone="mute">{fa(overall.noData)} بدون داده</Badge>}
              </div>
            </div>
          </div>
        )}
      </Panel>

      {goals.length > 0 && (
        <div className="grid md:grid-cols-2 gap-3">
          {goals.map((g) => {
            const m = measureGoal(g, runs);
            const st = goalStatus(m.progress);
            const info = METRIC_INFO[g.metric];
            return (
              <div key={g.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-extrabold text-sm">{g.title}</div>
                    <div className="text-[11px] text-white/45 mt-0.5">
                      {info.label}
                      {g.metric === 'keyword' && g.keyword ? ` «${g.keyword}»` : ''} · {PERIOD_LABEL[g.period]}
                    </div>
                  </div>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </div>
                <div className="mt-3 flex items-baseline justify-between text-sm">
                  <span className="font-black text-lg" style={{ color: TONES[st.tone] }}>
                    {m.progress === null ? '—' : pct(m.progress)}
                  </span>
                  <span className="text-white/55 text-xs tabular-nums">
                    {m.progress === null ? 'در این بازه پرونده‌ای نبوده' : `${fmt(m.current, g.metric)} از ${fmt(g.target, g.metric)} ${info.unit}`}
                  </span>
                </div>
                <div className="mt-2">
                  <ProgressBar value={m.progress ?? 0} max={100} color={TONES[st.tone]} />
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-white/40">
                  <span>{fa(m.runs)} پرونده در این بازه</span>
                  <button
                    className="underline hover:text-red-300"
                    onClick={() => {
                      void deleteGoal(props.slug, g.id).then(reload);
                    }}
                  >
                    حذف هدف
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Panel title="هدف جدید" subtitle="هدف را مشخص کنید تا هر پرونده با آن سنجیده شود">
        {suggestions.length > 0 && (
          <div className="mb-4">
            <div className="text-[11px] font-bold text-white/45 mb-1.5">پیشنهاد برای این خوشه (با یک کلیک اضافه می‌شود)</div>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s.title}
                  disabled={busy}
                  onClick={() => void add(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-white/15 text-white/70 hover:text-white hover:bg-white/5 disabled:opacity-40"
                >
                  + {s.title}
                </button>
              ))}
            </div>
          </div>
        )}
        {formErr && (
          <div className="mb-3">
            <Notice tone="bad">{formErr}</Notice>
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="عنوان هدف *">
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: ۳۰ نوبت واقعی در هفته" />
          </Field>
          <Field label="شاخص اندازه‌گیری *">
            <select className={inputCls} value={metric} onChange={(e) => setMetric(e.target.value as GoalMetric)}>
              {(Object.keys(METRIC_INFO) as GoalMetric[]).map((k) => (
                <option key={k} value={k} className="text-black">
                  {METRIC_INFO[k].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={`عدد هدف * (${METRIC_INFO[metric].unit})`}>
            <input className={inputCls} dir="ltr" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="30" />
          </Field>
          <Field label="بازه‌ی زمانی">
            <select className={inputCls} value={period} onChange={(e) => setPeriod(e.target.value as GoalPeriod)}>
              {(Object.keys(PERIOD_LABEL) as GoalPeriod[]).map((k) => (
                <option key={k} value={k} className="text-black">
                  {PERIOD_LABEL[k]}
                </option>
              ))}
            </select>
          </Field>
          {metric === 'keyword' && (
            <Field label="عبارت مورد نظر *" hint="هر پرونده‌ای که این عبارت در ورودی یا خروجی‌اش باشد شمرده می‌شود">
              <input className={inputCls} value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="مثلاً: تخفیف" />
            </Field>
          )}
        </div>
        <div className="mt-4">
          <Btn variant="primary" disabled={busy} onClick={() => void submit()}>
            {busy ? 'در حال ثبت…' : '+ افزودن هدف'}
          </Btn>
        </div>
      </Panel>
    </div>
  );
}
