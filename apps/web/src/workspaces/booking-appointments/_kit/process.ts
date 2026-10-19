/* Workspace Kit — موتور فرایند: تعریف، چیدمان شبکه، اجرا (واقعی / هوش مصنوعی / نمایشی)، ثبت و بازیابی. */
import { api, extractError } from '@/lib/api';

/* ───────────── انواع ───────────── */
export interface StageDef {
  id: string;
  /** slug ربات مسئول این مرحله (با ربات‌های واقعی پلتفرم تطبیق داده می‌شود) */
  bot: string;
  botName: string;
  icon: string;
  title: string;
  /** این ربات الان چه کاری انجام می‌دهد */
  does: string;
  /** دستور هوش مصنوعی برای این مرحله (پیش‌فرض: does) */
  prompt?: string;
  /** خروجی نمایشی وقتی هوش مصنوعی در دسترس نیست. {input} با ورودی پرونده جایگزین می‌شود */
  sample: string;
  /** بعد از پایان این مرحله چه می‌شود */
  after: string;
  /** مرحله‌های بعدی (شاخه‌ها = شبکه) */
  next: string[];
  /** مرحله‌ای که انسان هم می‌تواند در آن وارد شود (فقط نمایش نشان) */
  human?: boolean;
  /** اقدام واقعی روی پلتفرم (CRM، نوبت، پرداخت، دانش)؛ مثال: 'crm:QUALIFIED:70' — جزئیات در executors.ts */
  act?: string;
  /** انتخاب ربات بر اساس محتوای پرونده: [الگوی regex، slug ربات، نام ربات]؛ اولین تطبیق برنده است */
  pick?: Array<[string, string, string]>;
}

export interface ProcessDef {
  id: string;
  title: string;
  summary: string;
  trigger: { icon: string; label: string; inputLabel: string; scenarios: string[] };
  stages: StageDef[];
  /** نتیجه‌ی نهایی فرایند برای کسب‌وکار */
  outcome: string;
}

export type StageStatus = 'idle' | 'running' | 'done' | 'error';
export type StageSource = 'real' | 'ai' | 'sim';

export interface StageState {
  status: StageStatus;
  /** نام رباتی که واقعاً این مرحله را انجام داد (وقتی از pick انتخاب شده) */
  by?: string;
  output?: string;
  source?: StageSource;
  ms?: number;
  note?: string;
}

export type RunOrigin = 'manual' | 'auto' | 'event';

/** یک گام از مسیر پرونده؛ خودبسنده است تا بعد از تغییر تعریف فرایند هم قابل نمایش بماند */
export interface TrailItem {
  id: string;
  title: string;
  botName: string;
  icon: string;
  status: StageStatus;
  source?: StageSource;
  ms?: number;
  output?: string;
  note?: string;
}

export interface RunLogLine {
  t: number;
  text: string;
  tone: 'ok' | 'warn' | 'bad' | 'info' | 'mute';
}

export interface RunRecord {
  id: string;
  startedAt: number;
  input: string;
  origin: RunOrigin;
  status: 'running' | 'done' | 'error';
  states: Record<string, StageState>;
  ms?: number;
  summary?: string;
  /** مسیر کامل پرونده: هر ربات چه کرد و چه خروجی داد */
  trail?: TrailItem[];
  log?: RunLogLine[];
  /** فقط در نمای «همه‌ی خوشه‌ها» */
  cluster?: { slug: string; name: string; icon: string; color: string };
}

export interface LogEntry {
  t: number;
  stageId: string | null;
  text: string;
  tone: 'ok' | 'warn' | 'bad' | 'info' | 'mute';
}

export interface BotRef {
  id: string;
  name: string;
  icon: string;
  isActive: boolean;
}
export type BotIndex = Record<string, BotRef>;

export interface AutoEvent {
  id: string;
  input: string;
  /** داده‌ی واقعی رویداد؛ اگر { existing: true } باشد یعنی کار قبلاً در سیستم انجام شده و اجراکننده‌ی واقعی دوباره ننویسد */
  data?: unknown;
}
export type AutoSource = () => Promise<AutoEvent[]>;
/** چند منبع رویداد را یکی می‌کند؛ خرابی یک منبع بقیه را نمی‌اندازد */
export const mergeSources =
  (...sources: AutoSource[]): AutoSource =>
  async () => {
    const lists = await Promise.all(sources.map((f) => f().catch(() => [] as AutoEvent[])));
    return lists.reduce<AutoEvent[]>((a, b) => a.concat(b), []);
  };

export interface ExecCtx {
  slug: string;
  stage: StageDef;
  input: string;
  event?: AutoEvent;
  results: Record<string, string>;
}
export interface ExecResult {
  output: string;
  note?: string;
}
/** اجراکننده‌ی واقعی یک مرحله؛ null یعنی «برای این پرونده کاری ندارم، به هوش مصنوعی بسپار» */
export type Executor = (ctx: ExecCtx) => Promise<ExecResult | null>;

/* ───────────── کمکی‌های تعریف ───────────── */
export const stageIndex = (def: ProcessDef): Record<string, StageDef> => {
  const m: Record<string, StageDef> = {};
  for (const s of def.stages) m[s.id] = s;
  return m;
};

/** بررسی ساختاری تعریف: شناسه‌ی تکراری، ارجاع ناموجود، حلقه */
export function validateProcess(def: ProcessDef): string[] {
  const errs: string[] = [];
  const ids = new Set<string>();
  for (const s of def.stages) {
    if (ids.has(s.id)) errs.push(`شناسه‌ی تکراری: ${s.id}`);
    ids.add(s.id);
  }
  for (const s of def.stages) for (const n of s.next) if (!ids.has(n)) errs.push(`${s.id} → ${n} ناموجود`);
  const state: Record<string, 0 | 1 | 2> = {};
  const idx = stageIndex(def);
  const visit = (id: string): void => {
    if (state[id] === 2) return;
    if (state[id] === 1) {
      errs.push(`حلقه در ${id}`);
      return;
    }
    state[id] = 1;
    for (const n of idx[id]?.next ?? []) visit(n);
    state[id] = 2;
  };
  for (const s of def.stages) visit(s.id);
  const incoming = new Set<string>();
  for (const s of def.stages) for (const n of s.next) incoming.add(n);
  if (!def.stages.some((s) => !incoming.has(s.id))) errs.push('مرحله‌ی شروع ندارد');
  return errs;
}

/* ───────────── چیدمان شبکه ───────────── */
export const NODE_W = 168;
export const NODE_H = 78;
export const COL_GAP = 64;
export const ROW_GAP = 22;
export const PAD = 20;

export interface LNode {
  id: string;
  kind: 'start' | 'stage' | 'end';
  level: number;
  x: number;
  y: number;
  stage?: StageDef;
}
export interface LEdge {
  id: string;
  from: string;
  to: string;
  path: string;
}
export interface Layout {
  nodes: LNode[];
  edges: LEdge[];
  width: number;
  height: number;
  levelOf: Record<string, number>;
  /** مرحله‌ها به ترتیب سطح (هر سطح = مرحله‌هایی که هم‌زمان اجرا می‌شوند) */
  waves: StageDef[][];
}

export function layoutProcess(def: ProcessDef): Layout {
  const idx = stageIndex(def);
  const preds: Record<string, string[]> = {};
  for (const s of def.stages) preds[s.id] = [];
  for (const s of def.stages) for (const n of s.next) preds[n]?.push(s.id);

  const levelOf: Record<string, number> = {};
  const lv = (id: string): number => {
    if (levelOf[id] !== undefined) return levelOf[id];
    levelOf[id] = 1; // محافظ حلقه
    const p = preds[id] ?? [];
    levelOf[id] = p.length ? Math.max(...p.map(lv)) + 1 : 1;
    return levelOf[id];
  };
  for (const s of def.stages) lv(s.id);
  const maxLevel = Math.max(1, ...Object.values(levelOf));

  const rowsAt: StageDef[][] = [];
  for (let l = 0; l <= maxLevel + 1; l++) rowsAt.push([]);
  for (const s of def.stages) rowsAt[levelOf[s.id]].push(s);
  const maxRows = Math.max(1, ...rowsAt.map((r) => r.length));

  const colW = NODE_W + COL_GAP;
  const width = PAD * 2 + (maxLevel + 2) * NODE_W + (maxLevel + 1) * COL_GAP;
  const height = PAD * 2 + maxRows * NODE_H + (maxRows - 1) * ROW_GAP;
  const xOf = (level: number): number => width - PAD - NODE_W - level * colW; // راست‌به‌چپ
  const yFor = (row: number, count: number): number => {
    const block = count * NODE_H + (count - 1) * ROW_GAP;
    return PAD + (height - PAD * 2 - block) / 2 + row * (NODE_H + ROW_GAP);
  };

  const nodes: LNode[] = [{ id: '__start', kind: 'start', level: 0, x: xOf(0), y: yFor(0, 1) }];
  for (let l = 1; l <= maxLevel; l++) {
    rowsAt[l].forEach((s, i) => {
      nodes.push({ id: s.id, kind: 'stage', level: l, x: xOf(l), y: yFor(i, rowsAt[l].length), stage: idx[s.id] });
    });
  }
  nodes.push({ id: '__end', kind: 'end', level: maxLevel + 1, x: xOf(maxLevel + 1), y: yFor(0, 1) });

  const byId: Record<string, LNode> = {};
  for (const n of nodes) byId[n.id] = n;

  const pairs: Array<[string, string]> = [];
  for (const s of def.stages) if (!(preds[s.id] ?? []).length) pairs.push(['__start', s.id]);
  for (const s of def.stages) {
    for (const n of s.next) pairs.push([s.id, n]);
    if (!s.next.length) pairs.push([s.id, '__end']);
  }
  const edges: LEdge[] = pairs.map(([a, b]) => {
    const A = byId[a];
    const B = byId[b];
    const sx = A.x;
    const sy = A.y + NODE_H / 2;
    const tx = B.x + NODE_W;
    const ty = B.y + NODE_H / 2;
    const d = Math.max(24, (sx - tx) / 2);
    return { id: `${a}>${b}`, from: a, to: b, path: `M ${sx} ${sy} C ${sx - d} ${sy}, ${tx + d} ${ty}, ${tx} ${ty}` };
  });

  const waves: StageDef[][] = [];
  for (let l = 1; l <= maxLevel; l++) if (rowsAt[l].length) waves.push(rowsAt[l]);
  return { nodes, edges, width, height, levelOf, waves };
}

/** مسیر پرونده به ترتیب اجرا (سطح‌به‌سطح) برای نمایش خط زمانی */
export function buildTrail(def: ProcessDef, states: Record<string, StageState>): TrailItem[] {
  const out: TrailItem[] = [];
  for (const wave of layoutProcess(def).waves) {
    for (const st of wave) {
      const s = states[st.id];
      if (!s || s.status === 'idle') continue;
      out.push({
        id: st.id,
        title: st.title,
        botName: s.by ?? st.botName,
        icon: st.icon,
        status: s.status,
        source: s.source,
        ms: s.ms,
        output: s.output ? s.output.slice(0, 700) : undefined,
        note: s.note,
      });
    }
  }
  return out;
}

/* ───────────── اجرا ───────────── */
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const clip = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

const GUIDE =
  'تو یکی از ربات‌های یک خط لوله‌ی خودکار هستی و فقط کار مرحله‌ی خودت را انجام می‌دهی. ' +
  'این یک اجرای میزکار است؛ هیچ ابزاری (ذخیره، رزرو، پرداخت و…) را اجرا نکن و فقط متن نتیجه را بنویس. ' +
  'پاسخ فارسی، دقیق و حداکثر ۴ خط باشد.';

export interface RunOptions {
  slug: string;
  /** live: تلاش برای ربات واقعی؛ demo: فقط نمایشی */
  mode: 'live' | 'demo';
  bots: BotIndex;
  executors?: Record<string, Executor>;
  event?: AutoEvent;
  /** false = هیچ اقدام واقعی (نوشتن در CRM/نوبت/پرداخت) انجام نشود؛ برای ورودی‌های نمونه */
  real?: boolean;
  onState: (stageId: string, s: StageState) => void;
  onLog: (e: LogEntry) => void;
  /** حداقل زمان نمایش هر مرحله (میلی‌ثانیه) تا کاربر جریان را ببیند */
  pace?: number;
  isCancelled?: () => boolean;
}

export interface RunOutcome {
  status: 'done' | 'error';
  results: Record<string, string>;
  states: Record<string, StageState>;
  ms: number;
}

function fill(sample: string, input: string): string {
  return sample.split('{input}').join(clip(input.replace(/\s+/g, ' ').trim(), 60));
}

export async function runProcess(def: ProcessDef, input: string, o: RunOptions): Promise<RunOutcome> {
  const layout = layoutProcess(def);
  const results: Record<string, string> = {};
  const states: Record<string, StageState> = {};
  const session = `ws-run-${def.id}-${Math.random().toString(36).slice(2, 9)}`;
  const pace = o.pace ?? 900;
  const t0 = Date.now();
  let aiDown = o.mode === 'demo';
  let aiWarned = false;
  const log = (stageId: string | null, text: string, tone: LogEntry['tone'] = 'info'): void =>
    o.onLog({ t: Date.now(), stageId, text, tone });
  const set = (id: string, s: StageState): void => {
    states[id] = s;
    o.onState(id, s);
  };

  log(null, `پرونده‌ی جدید دریافت شد: «${clip(input, 80)}»`, 'info');

  async function runStage(stage: StageDef): Promise<void> {
    const started = Date.now();
    let botSlug = stage.bot;
    let botLabel = stage.botName;
    for (const [pat, slug, name] of stage.pick ?? []) {
      let hit = false;
      try {
        hit = new RegExp(pat).test(input);
      } catch {
        hit = false;
      }
      if (hit) {
        botSlug = slug;
        botLabel = name;
        break;
      }
    }
    set(stage.id, { status: 'running', by: botLabel });
    log(stage.id, `${stage.icon} ${botLabel} شروع کرد: ${stage.does}`, 'info');

    let output = '';
    let source: StageSource = 'sim';
    let note: string | undefined;
    let failed = false;

    try {
      const exec = o.mode === 'live' && o.real !== false ? o.executors?.[stage.id] : undefined;
      const real = exec ? await exec({ slug: o.slug, stage, input, event: o.event, results: { ...results } }) : null;
      if (real) {
        output = real.output;
        note = real.note;
        source = 'real';
      } else {
        const bot = o.bots[botSlug];
        if (!aiDown && bot && bot.isActive) {
          try {
            const prev = Object.entries(results)
              .map(([k, v]) => `- ${k}: ${clip(v, 200)}`)
              .join('\n');
            const message =
              `${GUIDE}\n\n[ورودی پرونده]\n${input}\n\n[نتیجه‌ی مرحله‌های قبل]\n${prev || '(ندارد)'}\n\n[وظیفه‌ی تو: ${stage.title}]\n${stage.prompt ?? stage.does}`;
            const r = await Promise.race([
              api.post('/api/ai/chat', { botId: bot.id, sessionId: session, message }),
              sleep(45000).then(() => {
                throw new Error('timeout');
              }),
            ]);
            const d = r.data as { message?: string; reply?: string; content?: string };
            const text = String(d.message ?? d.reply ?? d.content ?? '').trim();
            if (!text) throw new Error('empty');
            output = text;
            source = 'ai';
          } catch (e) {
            aiDown = true;
            note = clip(extractError(e), 90);
            if (!aiWarned) {
              aiWarned = true;
              log(null, `ربات هوشمند در دسترس نبود (${note}). ادامه با حالت نمایشی.`, 'warn');
            }
            output = fill(stage.sample, input);
            source = 'sim';
          }
        } else {
          output = fill(stage.sample, input);
          source = 'sim';
          if (!bot && o.mode === 'live') note = 'ربات این مرحله در این نصب یافت نشد';
        }
      }
    } catch (e) {
      failed = true;
      note = clip(extractError(e), 120);
      output = '';
    }

    const spent = Date.now() - started;
    if (spent < pace) await sleep(pace - spent + Math.random() * 300);
    const ms = Date.now() - started;
    results[stage.id] = output;
    if (failed) {
      set(stage.id, { status: 'error', by: botLabel, note, ms });
      log(stage.id, `خطا در «${stage.title}»: ${note}`, 'bad');
    } else {
      set(stage.id, { status: 'done', by: botLabel, output, source, ms, note });
      log(stage.id, `✔ ${stage.title} انجام شد${source === 'real' ? ' (اقدام واقعی)' : source === 'ai' ? ' (ربات هوشمند)' : ' (نمایشی)'}. بعد: ${stage.after}`, 'ok');
    }
  }

  let hadError = false;
  for (const wave of layout.waves) {
    if (o.isCancelled?.()) break;
    // فقط مرحله‌هایی که همه‌ی پیش‌نیازهایشان تمام شده است
    const ready = wave.filter((s) =>
      def.stages.every((p) => !p.next.includes(s.id) || states[p.id]?.status === 'done'),
    );
    for (const s of wave) if (!ready.includes(s)) set(s.id, { status: 'idle', note: 'پیش‌نیاز ناموفق' });
    await Promise.all(ready.map(runStage));
    if (ready.some((s) => states[s.id]?.status === 'error')) hadError = true;
  }

  const ms = Date.now() - t0;
  const status: RunOutcome['status'] = hadError ? 'error' : 'done';
  log(null, status === 'done' ? `🏁 فرایند کامل شد (${Math.round(ms / 100) / 10} ثانیه). نتیجه: ${def.outcome}` : '⚠️ فرایند با خطا متوقف شد.', status === 'done' ? 'ok' : 'bad');
  return { status, results, states, ms };
}

/* ───────────── ثبت و بازیابی (سرور) ───────────── */
interface ServerRun {
  id: string;
  title: string;
  description: string | null;
  value: number | null;
  status: string;
  metadata: string | null;
  createdAt: string;
}

export async function saveRun(slug: string, r: RunRecord): Promise<void> {
  try {
    await api.post(`/api/clusters/${slug}/process-runs`, {
      input: r.input,
      status: r.status === 'error' ? 'FAILED' : 'SUCCESS',
      ms: r.ms ?? 0,
      summary: r.summary ?? '',
      origin: r.origin,
      startedAt: r.startedAt,
      states: r.states,
      trail: r.trail ?? [],
      log: (r.log ?? []).slice(-60),
    });
  } catch {
    /* ثبت اختیاری است؛ نبودنش اجرا را خراب نمی‌کند */
  }
}

export interface RunsQuery {
  q?: string;
  status?: 'SUCCESS' | 'FAILED';
  origin?: RunOrigin;
  skip?: number;
  take?: number;
}

function parseRun(it: ServerRun & { cluster?: RunRecord['cluster'] }): RunRecord {
  let meta: { origin?: RunOrigin; states?: Record<string, StageState>; startedAt?: number; trail?: TrailItem[]; log?: RunLogLine[] } = {};
  try {
    meta = it.metadata ? (JSON.parse(it.metadata) as typeof meta) : {};
  } catch {
    meta = {};
  }
  return {
    id: it.id,
    startedAt: meta.startedAt ?? new Date(it.createdAt).getTime(),
    input: it.title,
    origin: meta.origin ?? 'manual',
    status: it.status === 'FAILED' ? 'error' : 'done',
    states: meta.states ?? {},
    ms: it.value ?? undefined,
    summary: it.description ?? undefined,
    trail: meta.trail,
    log: meta.log,
    cluster: it.cluster,
  };
}

/** فهرست پرونده‌ها با فیلتر و صفحه‌بندی؛ slug = 'all' یعنی همه‌ی خوشه‌ها */
export async function fetchRuns(slug: string, query: RunsQuery = {}): Promise<{ items: RunRecord[]; total: number }> {
  const r = await api.get(`/api/clusters/${slug}/process-runs`, { params: query });
  const items = (r.data.items ?? []) as Array<ServerRun & { cluster?: RunRecord['cluster'] }>;
  return { items: items.map(parseRun), total: Number(r.data.total ?? items.length) };
}

export async function loadRuns(slug: string): Promise<RunRecord[]> {
  try {
    return (await fetchRuns(slug, { take: 60 })).items;
  } catch {
    return [];
  }
}

/* ───────────── ربات‌ها و رویدادهای واقعی ───────────── */
export async function loadBotIndex(): Promise<BotIndex> {
  try {
    const r = await api.get('/api/bots?limit=200');
    const idx: BotIndex = {};
    for (const b of (r.data.items ?? []) as Array<{ id: string; slug: string; name: string; icon: string; isActive: boolean }>) {
      idx[b.slug] = { id: b.id, name: b.name, icon: b.icon, isActive: b.isActive };
    }
    return idx;
  } catch {
    return {};
  }
}

/** رویداد واقعی عمومی برای همه‌ی خوشه‌ها: هر گفتگوی تازه‌ی مشتری با ربات‌های همین خوشه */
export function inboxSource(botSlugs: string[], bots: BotIndex): AutoSource {
  const ids = new Set(botSlugs.map((s) => bots[s]?.id).filter((x): x is string => Boolean(x)));
  return async () => {
    if (!ids.size) return [];
    const r = await api.get('/api/inbox');
    const items = (r.data.items ?? []) as Array<{
      id: string;
      bot: { id: string };
      updatedAt: string;
      messages?: Array<{ content: string; role: string }>;
    }>;
    return items
      .filter((c) => ids.has(c.bot.id) && c.messages?.[0]?.role === 'user' && Date.now() - new Date(c.updatedAt).getTime() < 10 * 60 * 1000)
      .map((c) => ({ id: `${c.id}:${c.updatedAt}`, input: c.messages?.[0]?.content ?? '', data: c }));
  };
}

/** ورودی نمونه‌ی چرخشی برای حالت نمایشی خودکار */
export function pickScenario(def: ProcessDef, n: number): string {
  const list = def.trigger.scenarios;
  return list[n % list.length] ?? 'پرونده‌ی نمونه';
}
