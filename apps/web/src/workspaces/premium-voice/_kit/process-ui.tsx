'use client';

/* Workspace Kit — رابط فرایند: نقشه‌ی شبکه‌ای، الان/بعدی/بعد از این/نتیجه، گزارش زنده، حالت خودکار. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Badge, Btn, Empty, Notice, Panel, Pills, StatCard, TONES, inputCls } from './ui';
import { fa, jTime, pct } from './format';
import { buildExecutors } from './executors';
import {
  NODE_H,
  NODE_W,
  inboxSource,
  layoutProcess,
  loadBotIndex,
  loadRuns,
  pickScenario,
  runProcess,
  saveRun,
  stageIndex,
} from './process';
import type { AutoEvent, AutoSource, BotIndex, Executor, LogEntry, ProcessDef, RunOrigin, RunRecord, StageDef, StageState } from './process';

const clip = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

const SOURCE_LABEL = { real: 'اقدام واقعی', ai: 'ربات هوشمند', sim: 'نمایشی' } as const;
const SOURCE_TONE = { real: 'ok', ai: 'info', sim: 'mute' } as const;

/* ───────────── نقشه‌ی شبکه‌ای ───────────── */
export function ProcessMap(props: {
  def: ProcessDef;
  states: Record<string, StageState>;
  selected?: string | null;
  onSelect?: (id: string) => void;
  finished?: boolean;
}) {
  const { def, states } = props;
  const layout = useMemo(() => layoutProcess(def), [def]);
  const anyStarted = Object.values(states).some((s) => s.status !== 'idle');
  const st = (id: string): StageState['status'] => states[id]?.status ?? 'idle';

  const nodeState = (id: string): StageState['status'] => {
    if (id === '__start') return anyStarted ? 'done' : 'idle';
    if (id === '__end') return props.finished ? 'done' : 'idle';
    return st(id);
  };

  const COLOR = { idle: 'rgba(255,255,255,.18)', running: 'var(--ws)', done: TONES.ok, error: TONES.bad } as const;

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
      <style>{`
        @keyframes wsflow { to { stroke-dashoffset: -26; } }
        @keyframes wspulse { 0%,100% { box-shadow: 0 0 0 0 transparent; } 50% { box-shadow: 0 0 22px 2px color-mix(in srgb, var(--ws) 55%, transparent); } }
        .ws-flow { animation: wsflow .8s linear infinite; }
        .ws-pulse { animation: wspulse 1.4s ease-in-out infinite; }
      `}</style>
      <div style={{ position: 'relative', width: layout.width, height: layout.height, direction: 'ltr', margin: '0 auto' }}>
        <svg width={layout.width} height={layout.height} style={{ position: 'absolute', inset: 0 }} aria-hidden>
          {layout.edges.map((e) => {
            const a = nodeState(e.from);
            const b = nodeState(e.to);
            const live = b === 'running';
            const lit = a === 'done' && (b === 'running' || b === 'done');
            const color = live ? 'var(--ws)' : lit ? TONES.ok : 'rgba(255,255,255,.16)';
            return (
              <g key={e.id}>
                <path d={e.path} fill="none" stroke={color} strokeWidth={live ? 2.5 : 2} strokeDasharray={live ? '7 6' : undefined} className={live ? 'ws-flow' : undefined} />
              </g>
            );
          })}
        </svg>
        {layout.nodes.map((n) => {
          const status = nodeState(n.id);
          const color = COLOR[status];
          const isSel = props.selected === n.id;
          const common = {
            position: 'absolute' as const,
            left: n.x,
            top: n.y,
            width: NODE_W,
            height: NODE_H,
            direction: 'rtl' as const,
            borderColor: isSel ? '#fff' : color,
            background: status === 'running' ? 'color-mix(in srgb, var(--ws) 16%, #0b1020)' : status === 'done' ? 'rgba(74,222,128,.08)' : status === 'error' ? 'rgba(248,113,113,.1)' : 'rgba(255,255,255,.04)',
          };
          if (n.kind !== 'stage' || !n.stage) {
            const isStart = n.kind === 'start';
            return (
              <div key={n.id} className="rounded-2xl border-2 px-3 py-2 flex flex-col justify-center text-right" style={{ ...common, borderStyle: 'dashed' }}>
                <div className="text-lg leading-none">{isStart ? def.trigger.icon : '🏁'}</div>
                <div className="text-[11px] font-extrabold mt-1">{isStart ? def.trigger.label : 'نتیجه‌ی نهایی'}</div>
                <div className="text-[10px] text-white/45 truncate">{isStart ? 'شروع فرایند' : clip(def.outcome, 28)}</div>
              </div>
            );
          }
          const s = n.stage;
          const state = states[s.id];
          return (
            <button
              key={n.id}
              onClick={() => props.onSelect?.(s.id)}
              className={`rounded-2xl border-2 px-3 py-2 text-right flex flex-col justify-between transition ${status === 'running' ? 'ws-pulse' : ''}`}
              style={common}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-base leading-none">{s.icon}</span>
                <span className="text-[12px] font-extrabold truncate">{s.title}</span>
              </div>
              <div className="text-[10px] text-white/50 truncate">{props.states[s.id]?.by ?? (s.pick ? 'ربات تخصصی' : s.botName)}</div>
              <div className="text-[10px] font-bold flex items-center gap-1" style={{ color: status === 'idle' ? 'rgba(255,255,255,.4)' : color }}>
                {status === 'idle' && 'در انتظار'}
                {status === 'running' && 'در حال اجرا…'}
                {status === 'done' && `✓ انجام شد${state?.ms ? ` · ${fa(Math.round(state.ms / 100) / 10)}ث` : ''}`}
                {status === 'error' && '⚠ خطا'}
                {s.human && <span title="انسان هم می‌تواند وارد شود">👤</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────── الان / بعدی / بعد از این / نتیجه ───────────── */
function Cell(props: { label: string; tone?: 'ws' | 'ok' | 'info' | 'mute'; children: ReactNode }) {
  const c = props.tone === 'ws' || !props.tone ? 'var(--ws)' : TONES[props.tone];
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 min-h-[118px]" style={{ borderTop: `3px solid ${c}` }}>
      <div className="text-[11px] font-black mb-2" style={{ color: c }}>
        {props.label}
      </div>
      {props.children}
    </div>
  );
}

export function NowNext(props: {
  def: ProcessDef;
  states: Record<string, StageState>;
  running: boolean;
  finished: boolean;
  totalMs?: number;
}) {
  const { def, states } = props;
  const idx = useMemo(() => stageIndex(def), [def]);
  const running = def.stages.filter((s) => states[s.id]?.status === 'running');
  const done = def.stages.filter((s) => states[s.id]?.status === 'done');
  const started = Object.keys(states).length > 0;
  const incoming = new Set<string>();
  for (const s of def.stages) for (const n of s.next) incoming.add(n);

  let nextStages: StageDef[] = [];
  if (running.length) {
    const set = new Set<string>();
    for (const r of running) for (const n of r.next) if (states[n]?.status !== 'done' && states[n]?.status !== 'running') set.add(n);
    nextStages = [...set].map((i) => idx[i]).filter(Boolean);
  } else if (!started) {
    nextStages = def.stages.filter((s) => !incoming.has(s.id));
  }
  const lastOut = done.length ? done[done.length - 1] : undefined;
  const pivot = running[0] ?? lastOut;

  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
      <Cell label="⚡ الان" tone="ws">
        {running.length ? (
          <div className="space-y-2">
            {running.map((s) => (
              <div key={s.id}>
                <div className="font-extrabold text-sm">
                  {s.icon} {states[s.id]?.by ?? s.botName}
                </div>
                <div className="text-xs text-white/60 leading-6">{s.does}</div>
              </div>
            ))}
          </div>
        ) : props.finished ? (
          <div className="text-sm text-white/60">همه‌ی مرحله‌ها تمام شد.</div>
        ) : (
          <div className="text-sm text-white/45">{props.running ? 'در حال آماده‌سازی…' : 'منتظر پرونده‌ی جدید. با «اجرا» یا حالت خودکار شروع می‌شود.'}</div>
        )}
      </Cell>
      <Cell label="➡️ ربات بعدی" tone="info">
        {nextStages.length ? (
          <div className="space-y-2">
            {nextStages.map((s) => (
              <div key={s.id}>
                <div className="font-extrabold text-sm">
                  {s.icon} {s.pick ? 'ربات تخصصی (بر اساس نوع پرونده)' : s.botName}
                </div>
                <div className="text-xs text-white/60 leading-6">{s.does}</div>
                {running[0] && states[running[0].id]?.output && <div className="text-[11px] text-white/35 mt-0.5">ورودی: خروجی «{running[0].title}»</div>}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-white/45">{props.finished ? 'مرحله‌ی دیگری نمانده؛ فرایند به نتیجه رسید.' : 'بعد از این مرحله ربات دیگری نیست.'}</div>
        )}
      </Cell>
      <Cell label="🔮 بعد از این مرحله" tone="mute">
        <div className="text-sm leading-7 text-white/75">{pivot ? pivot.after : def.stages.find((s) => !incoming.has(s.id))?.after ?? '—'}</div>
      </Cell>
      <Cell label={props.finished ? '🏁 نتیجه‌ی نهایی' : '📌 نتیجه تا اینجا'} tone="ok">
        {props.finished ? (
          <div>
            <div className="text-sm font-extrabold leading-7">{def.outcome}</div>
            {props.totalMs ? <div className="text-[11px] text-white/40 mt-1">زمان کل: {fa(Math.round(props.totalMs / 100) / 10)} ثانیه</div> : null}
          </div>
        ) : lastOut && states[lastOut.id]?.output ? (
          <div>
            <div className="text-[11px] text-white/45 mb-1">
              {lastOut.icon} {lastOut.title}
            </div>
            <div className="text-xs leading-6 text-white/80 whitespace-pre-wrap">{clip(states[lastOut.id].output ?? '', 200)}</div>
          </div>
        ) : (
          <div className="text-sm text-white/45">هنوز نتیجه‌ای ثبت نشده است.</div>
        )}
      </Cell>
    </div>
  );
}

/* ───────────── جزئیات مرحله ───────────── */
export function StageDetail(props: { def: ProcessDef; id: string | null; states: Record<string, StageState> }) {
  const stage = props.id ? props.def.stages.find((s) => s.id === props.id) : undefined;
  if (!stage) return <Empty icon="👆" text="روی یکی از مرحله‌های نقشه بزنید تا ورودی، خروجی و وضعیتش را ببینید." />;
  const s = props.states[stage.id];
  const prev = props.def.stages.filter((p) => p.next.includes(stage.id));
  const input = prev.map((p) => props.states[p.id]?.output).filter(Boolean).join('\n— — —\n');
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="font-extrabold">
          {stage.icon} {stage.title}
        </div>
        {s?.source && <Badge tone={SOURCE_TONE[s.source]}>{SOURCE_LABEL[s.source]}</Badge>}
      </div>
      <div className="text-white/55 text-xs">ربات مسئول: {s?.by ?? (stage.pick ? 'ربات تخصصی (بر اساس نوع پرونده)' : stage.botName)}</div>
      <div className="text-white/75 leading-7">{stage.does}</div>
      <div>
        <div className="text-[11px] font-bold text-white/45 mb-1">ورودی</div>
        <div className="rounded-xl bg-white/5 p-3 text-xs leading-6 whitespace-pre-wrap max-h-32 overflow-y-auto">{input || (prev.length ? 'در انتظار مرحله‌ی قبل' : 'پرونده‌ی ورودی')}</div>
      </div>
      <div>
        <div className="text-[11px] font-bold text-white/45 mb-1">خروجی</div>
        <div className="rounded-xl bg-white/5 p-3 text-xs leading-6 whitespace-pre-wrap max-h-48 overflow-y-auto">{s?.output || (s?.status === 'running' ? 'در حال تولید…' : 'هنوز اجرا نشده')}</div>
      </div>
      {s?.note && <div className="text-[11px] text-amber-300/80">{s.note}</div>}
      <div className="text-[11px] text-white/40">بعد از این مرحله: {stage.after}</div>
    </div>
  );
}

/* ───────────── گزارش زنده ───────────── */
export function ActivityLog(props: { entries: LogEntry[] }) {
  if (!props.entries.length) return <Empty icon="🕒" text="هنوز فعالیتی ثبت نشده است." />;
  return (
    <ol className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
      {props.entries.map((e, i) => (
        <li key={`${e.t}-${i}`} className="flex gap-2 text-xs leading-6">
          <span className="text-white/35 tabular-nums shrink-0">{jTime(new Date(e.t))}</span>
          <span style={{ color: e.tone === 'mute' ? 'rgba(255,255,255,.5)' : TONES[e.tone] }}>●</span>
          <span className="text-white/80">{e.text}</span>
        </li>
      ))}
    </ol>
  );
}

/* ───────────── کنسول فرایند ───────────── */
const ls = {
  get(k: string): string | null {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string): void {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* ignore */
    }
  },
};

export function ProcessConsole(props: {
  slug: string;
  def: ProcessDef;
  executors?: Record<string, Executor>;
  /** منبع رویداد واقعی؛ پیش‌فرض: گفتگوهای تازه‌ی مشتری با ربات‌های همین خوشه */
  makeSource?: (bots: BotIndex) => AutoSource;
  headerExtra?: ReactNode;
}) {
  const { slug, def } = props;
  const [bots, setBots] = useState<BotIndex>({});
  const [states, setStates] = useState<Record<string, StageState>>({});
  const [log, setLog] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [totalMs, setTotalMs] = useState<number | undefined>(undefined);
  const [input, setInput] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [history, setHistory] = useState<RunRecord[]>([]);
  const [mode, setMode] = useState<'live' | 'demo'>(() => (ls.get(`ws-mode-${slug}`) === 'demo' ? 'demo' : 'live'));
  const [auto, setAuto] = useState<boolean>(() => ls.get(`ws-auto-${slug}`) === '1');
  const [feed, setFeed] = useState<boolean>(() => ls.get(`ws-feed-${slug}`) !== '0');
  const [current, setCurrent] = useState('');

  const busy = useRef(false);
  const mounted = useRef(true);
  const seen = useRef<Set<string>>(new Set());
  const counter = useRef(0);
  const botsRef = useRef<BotIndex>({});
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const execs = useMemo(() => ({ ...buildExecutors(def), ...(props.executors ?? {}) }), [def, props.executors]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let live = true;
    void loadBotIndex().then((b) => {
      if (!live) return;
      botsRef.current = b;
      setBots(b);
    });
    void loadRuns(slug).then((r) => live && setHistory(r));
    return () => {
      live = false;
    };
  }, [slug]);

  const startRun = useCallback(
    async (text: string, origin: RunOrigin, event?: AutoEvent): Promise<void> => {
      if (busy.current) return;
      busy.current = true;
      setRunning(true);
      setFinished(false);
      setTotalMs(undefined);
      setStates({});
      setSelected(null);
      setCurrent(text);
      const startedAt = Date.now();
      const out = await runProcess(def, text, {
        slug,
        mode: modeRef.current,
        bots: botsRef.current,
        executors: execs,
        real: origin !== 'auto',
        event,
        isCancelled: () => !mounted.current,
        onState: (id, s) => mounted.current && setStates((p) => ({ ...p, [id]: s })),
        onLog: (e) => mounted.current && setLog((l) => [e, ...l].slice(0, 150)),
      });
      const record: RunRecord = {
        id: `${startedAt}`,
        startedAt,
        input: text,
        origin,
        status: out.status,
        states: out.states,
        ms: out.ms,
        summary: def.outcome,
      };
      if (mounted.current) {
        setHistory((h) => [record, ...h].slice(0, 60));
        setFinished(true);
        setTotalMs(out.ms);
        setRunning(false);
      }
      busy.current = false;
      void saveRun(slug, record);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [def, slug, execs],
  );

  /* حالت خودکار: رویداد واقعی اول؛ اگر نبود و «ورودی نمونه» روشن بود، سناریوی نمونه */
  useEffect(() => {
    if (!auto) return;
    let stop = false;
    const tick = async (): Promise<void> => {
      if (stop || busy.current) return;
      try {
        const source = (props.makeSource ?? ((b: BotIndex) => inboxSource(def.stages.map((s) => s.bot), b)))(botsRef.current);
        const events = await source();
        const fresh = events.find((e) => !seen.current.has(e.id));
        if (fresh) {
          seen.current.add(fresh.id);
          await startRun(fresh.input, 'event', fresh);
          return;
        }
      } catch {
        /* منبع در دسترس نیست؛ ادامه با نمونه */
      }
      if (!stop && (feed || modeRef.current === 'demo')) {
        counter.current += 1;
        await startRun(pickScenario(def, counter.current), 'auto');
      }
    };
    void tick();
    const id = setInterval(() => void tick(), 9000);
    return () => {
      stop = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, feed, def, startRun]);

  const stats = useMemo(() => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    const today = history.filter((h) => h.startedAt >= day.getTime());
    const ok = today.filter((h) => h.status === 'done').length;
    const withMs = today.filter((h) => h.ms);
    const avg = withMs.length ? withMs.reduce((a, b) => a + (b.ms ?? 0), 0) / withMs.length : 0;
    const autoN = today.filter((h) => h.origin !== 'manual').length;
    return { n: today.length, ok, rate: today.length ? (ok / today.length) * 100 : 0, avg, autoPct: today.length ? (autoN / today.length) * 100 : 0 };
  }, [history]);

  const liveBots = def.stages.filter((s) => bots[s.bot]?.isActive).length;
  const missing = Object.keys(bots).length > 0 && liveBots === 0;

  return (
    <div className="space-y-4">
      {props.headerExtra}
      <Panel
        title="پرونده‌ی ورودی و کنترل"
        subtitle={`${def.trigger.inputLabel} را بنویسید یا یکی از نمونه‌ها را انتخاب کنید`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Pills
              value={mode}
              onChange={(v) => {
                setMode(v);
                ls.set(`ws-mode-${slug}`, v);
              }}
              options={[
                { value: 'live', label: 'ربات واقعی' },
                { value: 'demo', label: 'نمایشی' },
              ]}
            />
            <button
              onClick={() => {
                const v = !auto;
                setAuto(v);
                ls.set(`ws-auto-${slug}`, v ? '1' : '0');
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black border transition"
              style={auto ? { background: 'var(--ws)', color: '#07122e', borderColor: 'var(--ws)' } : { borderColor: 'rgba(255,255,255,.2)', color: 'rgba(255,255,255,.7)' }}
            >
              <span className={`w-2 h-2 rounded-full ${auto ? 'bg-[#07122e] animate-pulse' : 'bg-white/40'}`} />
              {auto ? 'خودکار روشن' : 'خودکار خاموش'}
            </button>
          </div>
        }
      >
        <div className="flex flex-col md:flex-row gap-2">
          <input
            className={inputCls}
            value={input}
            placeholder={def.trigger.scenarios[0]}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && input.trim() && !running) {
                void startRun(input.trim(), 'manual');
                setInput('');
              }
            }}
          />
          <Btn
            variant="primary"
            disabled={running || !input.trim()}
            onClick={() => {
              void startRun(input.trim(), 'manual');
              setInput('');
            }}
          >
            {running ? 'در حال اجرا…' : '▶ اجرای پرونده'}
          </Btn>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {def.trigger.scenarios.map((s) => (
            <button
              key={s}
              disabled={running}
              onClick={() => void startRun(s, 'manual')}
              className="text-xs px-3 py-1.5 rounded-full border border-white/15 text-white/70 hover:text-white hover:bg-white/5 disabled:opacity-40"
            >
              {clip(s, 46)}
            </button>
          ))}
        </div>
        {auto && (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/60">
            <span>🤖 فرایند خودکار فعال است: هر پیام تازه‌ی مشتری یا رویداد واقعی بدون دخالت شما اجرا می‌شود.</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={feed}
                onChange={(e) => {
                  setFeed(e.target.checked);
                  ls.set(`ws-feed-${slug}`, e.target.checked ? '1' : '0');
                }}
              />
              وقتی رویدادی نبود، ورودی نمونه بساز (برای نمایش)
            </label>
          </div>
        )}
        {mode === 'live' && missing && (
          <div className="mt-3">
            <Notice tone="warn">ربات‌های این فرایند در این نصب فعال نیستند؛ مرحله‌ها به‌صورت نمایشی اجرا می‌شوند.</Notice>
          </div>
        )}
      </Panel>

      <Panel
        title={`نقشه‌ی فرایند — ${def.title}`}
        subtitle={current ? `پرونده‌ی جاری: «${clip(current, 70)}»` : def.summary}
        actions={
          <div className="flex items-center gap-3 text-[11px] text-white/50">
            <span>
              <span style={{ color: TONES.ok }}>●</span> انجام‌شده
            </span>
            <span>
              <span style={{ color: 'var(--ws)' }}>●</span> در حال اجرا
            </span>
            <span>○ در انتظار</span>
          </div>
        }
      >
        <ProcessMap def={def} states={states} selected={selected} onSelect={setSelected} finished={finished} />
      </Panel>

      <NowNext def={def} states={states} running={running} finished={finished} totalMs={totalMs} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="پرونده‌های امروز" value={fa(stats.n)} icon="📂" />
        <StatCard label="نرخ موفقیت" value={stats.n ? pct(stats.rate) : '—'} icon="✅" tone="ok" />
        <StatCard label="میانگین زمان" value={stats.avg ? `${fa(Math.round(stats.avg / 100) / 10)} ث` : '—'} icon="⏱️" tone="info" />
        <StatCard label="سهم خودکار" value={stats.n ? pct(stats.autoPct) : '—'} icon="🤖" />
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <Panel title="جزئیات مرحله" className="lg:col-span-2">
          <StageDetail def={def} id={selected} states={states} />
        </Panel>
        <Panel title="گزارش فعالیت زنده" className="lg:col-span-3">
          <ActivityLog entries={log} />
        </Panel>
      </div>

      <Panel title="تاریخچه‌ی پرونده‌ها" subtitle="با کلیک روی هر پرونده، مسیر آن روی نقشه بازپخش می‌شود">
        {history.length === 0 ? (
          <Empty icon="🗂️" text="هنوز پرونده‌ای اجرا نشده است." />
        ) : (
          <ul className="divide-y divide-white/5">
            {history.slice(0, 20).map((h) => (
              <li key={h.id}>
                <button
                  disabled={running}
                  className="w-full flex items-center justify-between gap-3 py-2.5 text-right hover:bg-white/[0.03] rounded-lg px-2 disabled:opacity-60"
                  onClick={() => {
                    setStates(h.states);
                    setCurrent(h.input);
                    setFinished(true);
                    setTotalMs(h.ms);
                  }}
                >
                  <span className="text-sm text-white/85 truncate">{clip(h.input, 80)}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    <Badge tone={h.origin === 'manual' ? 'mute' : h.origin === 'event' ? 'ok' : 'info'}>{h.origin === 'manual' ? 'دستی' : h.origin === 'event' ? 'رویداد واقعی' : 'خودکار'}</Badge>
                    <Badge tone={h.status === 'done' ? 'ok' : 'bad'}>{h.status === 'done' ? 'موفق' : 'خطا'}</Badge>
                    <span className="text-[11px] text-white/35 tabular-nums">{jTime(new Date(h.startedAt))}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
