'use client';

/* Workspace Kit — پرونده‌ها: فهرست با جست‌وجو و فیلتر، و جزئیات کامل هر پرونده (از کجا شروع شد، کدام ربات چه کرد، به چه انجامید، سازگاری با اهداف). */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, extractError } from '@/lib/api';
import { Badge, Btn, Empty, ErrorBanner, Panel, Pills, Spinner, TONES, inputCls } from './ui';
import { downloadCsv, fa, jDateTime, pct } from './format';
import { useDebounced } from './hooks';
import { buildTrail, fetchRuns, loadBotIndex } from './process';
import type { ProcessDef, RunOrigin, RunRecord, TrailItem } from './process';
import { ProcessMap } from './process-ui';
import { fetchGoals, fitLabel, runFit } from './goals';
import type { Goal } from './goals';

const clip = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const ORIGIN_LABEL: Record<RunOrigin, string> = { manual: 'دستی', auto: 'خودکار (نمونه)', event: 'رویداد واقعی' };
const SOURCE_LABEL = { real: 'اقدام واقعی', ai: 'ربات هوشمند', sim: 'نمایشی' } as const;
const SOURCE_TONE = { real: 'ok', ai: 'info', sim: 'mute' } as const;
const PAGE = 25;

type StatusFilter = 'all' | 'SUCCESS' | 'FAILED';
type OriginFilter = 'all' | RunOrigin;

export function RunsExplorer(props: {
  slug: string;
  def?: ProcessDef;
  /** نمای «همه‌ی خوشه‌ها»: نام خوشه هم در فهرست نشان داده می‌شود */
  showCluster?: boolean;
}) {
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 350);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [origin, setOrigin] = useState<OriginFilter>('all');
  const [items, setItems] = useState<RunRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState('');
  const [selId, setSelId] = useState<string | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);

  const query = useMemo(
    () => ({ q: dq.trim() || undefined, status: status === 'all' ? undefined : status, origin: origin === 'all' ? undefined : origin }),
    [dq, status, origin],
  );

  const load = useCallback(
    async (append: boolean, skip: number): Promise<void> => {
      if (append) setMore(true);
      else setLoading(true);
      try {
        const r = await fetchRuns(props.slug, { ...query, skip, take: PAGE });
        setItems((prev) => (append ? [...prev, ...r.items] : r.items));
        setTotal(r.total);
        setError('');
      } catch (e) {
        setError(extractError(e));
      } finally {
        setLoading(false);
        setMore(false);
      }
    },
    [props.slug, query],
  );

  useEffect(() => {
    void load(false, 0);
  }, [load]);

  useEffect(() => {
    if (props.slug === 'all') return;
    let live = true;
    fetchGoals(props.slug)
      .then((g) => live && setGoals(g))
      .catch(() => live && setGoals([]));
    return () => {
      live = false;
    };
  }, [props.slug]);

  const selected = items.find((r) => r.id === selId) ?? null;

  function exportCsv(): void {
    const rows: (string | number)[][] = [['تاریخ', 'خوشه', 'ورودی', 'منبع', 'وضعیت', 'مدت (ثانیه)', 'ربات‌ها']];
    for (const r of items) {
      rows.push([
        jDateTime(new Date(r.startedAt)),
        r.cluster?.name ?? props.slug,
        r.input,
        ORIGIN_LABEL[r.origin],
        r.status === 'done' ? 'موفق' : 'خطا',
        r.ms ? Math.round(r.ms / 100) / 10 : '',
        Array.from(new Set((r.trail ?? []).map((t) => t.botName))).join('، '),
      ]);
    }
    downloadCsv(`runs-${props.slug}.csv`, rows);
  }

  return (
    <div className="space-y-4">
      <Panel
        title="پرونده‌ها"
        subtitle="هر درخواست از لحظه‌ی ورود تا نتیجه‌ی نهایی؛ برای دیدن مسیر کامل یکی را انتخاب کنید"
        actions={
          <Btn size="sm" onClick={exportCsv} disabled={!items.length}>
            ⬇ خروجی CSV
          </Btn>
        }
      >
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <input className={inputCls + ' lg:max-w-sm'} value={q} onChange={(e) => setQ(e.target.value)} placeholder="جست‌وجو در متن درخواست…" />
          <Pills<StatusFilter>
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'همه' },
              { value: 'SUCCESS', label: 'موفق' },
              { value: 'FAILED', label: 'خطا' },
            ]}
          />
          <Pills<OriginFilter>
            value={origin}
            onChange={setOrigin}
            options={[
              { value: 'all', label: 'هر منبع' },
              { value: 'manual', label: 'دستی' },
              { value: 'event', label: 'رویداد واقعی' },
              { value: 'auto', label: 'خودکار' },
            ]}
          />
        </div>
      </Panel>

      <ErrorBanner message={error} onRetry={() => void load(false, 0)} />

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-4 items-start">
        <Panel title={`فهرست (${fa(total)})`} pad={false}>
          {loading ? (
            <Spinner />
          ) : items.length === 0 ? (
            <Empty icon="🗂️" text="پرونده‌ای با این فیلتر پیدا نشد." />
          ) : (
            <>
              <ul className="divide-y divide-white/5 max-h-[640px] overflow-y-auto">
                {items.map((r) => {
                  const on = r.id === selId;
                  return (
                    <li key={r.id}>
                      <button
                        onClick={() => setSelId(r.id)}
                        className={`w-full text-right px-4 py-3 hover:bg-white/[0.04] transition ${on ? 'bg-white/[0.07]' : ''}`}
                        style={on ? { boxShadow: 'inset -3px 0 0 var(--ws)' } : undefined}
                      >
                        <div className="text-sm text-white/90 leading-6">{clip(r.input, 90)}</div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          {props.showCluster && r.cluster && <Badge color={r.cluster.color}>{r.cluster.icon} {r.cluster.name}</Badge>}
                          <Badge tone={r.origin === 'event' ? 'ok' : r.origin === 'auto' ? 'info' : 'mute'}>{ORIGIN_LABEL[r.origin]}</Badge>
                          <Badge tone={r.status === 'done' ? 'ok' : 'bad'}>{r.status === 'done' ? 'موفق' : 'خطا'}</Badge>
                          {r.ms ? <span className="text-[11px] text-white/35 tabular-nums">{fa(Math.round(r.ms / 100) / 10)} ث</span> : null}
                          <span className="text-[11px] text-white/35 tabular-nums mr-auto">{jDateTime(new Date(r.startedAt))}</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {items.length < total && (
                <div className="p-3 text-center border-t border-white/5">
                  <Btn size="sm" disabled={more} onClick={() => void load(true, items.length)}>
                    {more ? '…' : `نمایش بیشتر (${fa(total - items.length)} مورد دیگر)`}
                  </Btn>
                </div>
              )}
            </>
          )}
        </Panel>

        <div className="lg:sticky lg:top-4">
          {selected ? (
            <RunDetail run={selected} def={props.def} goals={goals} />
          ) : (
            <Panel>
              <Empty icon="👈" text="یک پرونده را از فهرست انتخاب کنید تا مسیر کامل آن (از شروع تا نتیجه) را ببینید." />
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────── جزئیات یک پرونده ───────────── */
function RunDetail(props: { run: RunRecord; def?: ProcessDef; goals: Goal[] }) {
  const { run, def } = props;
  const trail: TrailItem[] = useMemo(() => run.trail ?? (def && Object.keys(run.states).length ? buildTrail(def, run.states) : []), [run, def]);
  const fit = useMemo(() => runFit({ ...run, trail: run.trail ?? (trail.length ? trail : undefined) }, props.goals), [run, trail, props.goals]);
  const lab = fitLabel(fit.pct);
  const bots = useMemo(() => {
    const m = new Map<string, { icon: string; n: number }>();
    for (const t of trail) {
      const cur = m.get(t.botName);
      m.set(t.botName, { icon: t.icon, n: (cur?.n ?? 0) + 1 });
    }
    return Array.from(m.entries());
  }, [trail]);
  const [judge, setJudge] = useState<{ id: string; text: string; busy?: boolean } | null>(null);
  const [showLog, setShowLog] = useState(false);
  const verdict = judge && judge.id === run.id ? judge : null;
  const doneN = trail.filter((t) => t.status === 'done').length;
  const lastDone = [...trail].reverse().find((t) => t.status === 'done');

  async function askJudge(): Promise<void> {
    if (!def) return;
    setJudge({ id: run.id, text: '', busy: true });
    try {
      const idx = await loadBotIndex();
      const stage = def.stages.find((s) => idx[s.bot]?.isActive);
      if (!stage) throw new Error('ربات فعالی برای ارزیابی در این خوشه پیدا نشد');
      const goalsText = props.goals.length
        ? props.goals.map((g, i) => `${i + 1}. ${g.title}`).join('\n')
        : `هدف کلی فرایند: ${def.outcome}`;
      const steps = trail.map((t) => `- ${t.botName} (${t.title}): ${clip(t.output ?? '', 160)}`).join('\n');
      const message =
        'تو ارزیاب کیفیت یک پرونده‌ی میزکار هستی؛ ابزاری اجرا نکن.\n' +
        `[اهداف کاربر]\n${goalsText}\n\n[درخواست]\n${run.input}\n\n[مسیر انجام‌شده]\n${steps || '(ندارد)'}\n\n` +
        'بگو این پرونده از ۰ تا ۱۰۰ چقدر با اهداف کاربر سازگار است و چقدر به آن‌ها کمک کرد. ' +
        'جواب باید با یک عدد شروع شود و بعد حداکثر دو جمله‌ی فارسی دلیل.';
      const r = await api.post('/api/ai/chat', { botId: idx[stage.bot].id, sessionId: `ws-judge-${run.id}`, message });
      const d = r.data as { message?: string; reply?: string; content?: string };
      const text = String(d.message ?? d.reply ?? d.content ?? '').trim();
      if (!text) throw new Error('پاسخی دریافت نشد');
      setJudge({ id: run.id, text });
    } catch (e) {
      setJudge({ id: run.id, text: `ارزیابی هوشمند انجام نشد: ${extractError(e)}` });
    }
  }

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge tone={run.status === 'done' ? 'ok' : 'bad'}>{run.status === 'done' ? 'پرونده با موفقیت پایان یافت' : 'پرونده با خطا پایان یافت'}</Badge>
          <Badge tone={run.origin === 'event' ? 'ok' : run.origin === 'auto' ? 'info' : 'mute'}>{ORIGIN_LABEL[run.origin]}</Badge>
          {run.cluster && <Badge color={run.cluster.color}>{run.cluster.icon} {run.cluster.name}</Badge>}
        </div>
        <div className="text-[11px] font-bold text-white/45">🚩 شروع — {jDateTime(new Date(run.startedAt))}</div>
        <div className="mt-1 text-sm leading-7 text-white/90 whitespace-pre-wrap">{run.input}</div>
        <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-[11px] font-bold text-white/45 mb-1">🏁 به چه انجامید</div>
          <div className="text-sm leading-7 text-white/85">
            {run.status === 'done' ? run.summary || 'فرایند کامل شد.' : 'فرایند در یکی از مرحله‌ها متوقف شد.'}
          </div>
          <div className="text-[11px] text-white/40 mt-1">
            {trail.length ? `${fa(doneN)} مرحله انجام شد` : ''}
            {run.ms ? `${trail.length ? ' · ' : ''}${fa(Math.round(run.ms / 100) / 10)} ثانیه` : ''}
            {lastDone ? ` · آخرین گام: ${lastDone.botName}` : ''}
          </div>
        </div>
      </Panel>

      <Panel title="سازگاری با اهداف شما" subtitle={props.goals.length ? 'این پرونده چقدر به اهداف تعریف‌شده‌ی خوشه کمک کرد' : undefined}>
        {props.goals.length === 0 ? (
          <div className="text-sm text-white/55 leading-7">برای این خوشه هدفی تعریف نشده است. از تب «اهداف» هدف بسازید تا هر پرونده با آن سنجیده شود.</div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="text-3xl font-black" style={{ color: TONES[lab.tone] }}>
                {fit.pct === null ? '—' : pct(fit.pct)}
              </div>
              <Badge tone={lab.tone}>{lab.label}</Badge>
            </div>
            <ul className="space-y-1.5">
              {fit.lines.map((l) => (
                <li key={l.goal.id} className="flex items-start gap-2 text-xs leading-6">
                  <span style={{ color: l.hit === null ? TONES.mute : l.hit ? TONES.ok : TONES.bad }}>{l.hit === null ? '•' : l.hit ? '✔' : '✘'}</span>
                  <span className="text-white/80">
                    <b>{l.goal.title}</b> — <span className="text-white/55">{l.why}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {def && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <Btn size="sm" disabled={verdict?.busy} onClick={() => void askJudge()}>
              {verdict?.busy ? 'در حال ارزیابی…' : '🤖 ارزیابی هوشمند با ربات'}
            </Btn>
            {verdict && !verdict.busy && <div className="mt-2 text-xs leading-7 text-white/80 whitespace-pre-wrap rounded-xl bg-white/5 p-3">{verdict.text}</div>}
          </div>
        )}
      </Panel>

      {def && Object.keys(run.states).length > 0 && (
        <Panel title="مسیر روی نقشه">
          <ProcessMap def={def} states={run.states} finished />
        </Panel>
      )}

      <Panel title="خط زمانی: کدام ربات چه کرد" subtitle={bots.length ? `${fa(bots.length)} ربات در این پرونده کار کردند` : undefined}>
        {trail.length === 0 ? (
          <div className="text-sm text-white/50 leading-7">جزئیات مرحله‌های این پرونده ذخیره نشده است (پرونده‌ی قدیمی‌تر از این نسخه). پرونده‌های تازه با همه‌ی جزئیات ثبت می‌شوند.</div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {bots.map(([name, v]) => (
                <Badge key={name} color="#94a3b8">
                  {v.icon} {name}
                </Badge>
              ))}
            </div>
            <ol className="relative space-y-4 pr-1">
              {trail.map((t, i) => (
                <li key={t.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-7 h-7 rounded-full grid place-items-center text-xs font-black shrink-0"
                      style={{ background: t.status === 'error' ? `${TONES.bad}22` : `${TONES.ok}22`, color: t.status === 'error' ? TONES.bad : TONES.ok, border: `1px solid ${t.status === 'error' ? TONES.bad : TONES.ok}55` }}
                    >
                      {t.status === 'error' ? '✘' : fa(i + 1)}
                    </div>
                    {i < trail.length - 1 && <div className="flex-1 w-px bg-white/10 mt-1" />}
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-sm">
                        {t.icon} {t.botName}
                      </span>
                      <span className="text-xs text-white/55">— {t.title}</span>
                      {t.source && <Badge tone={SOURCE_TONE[t.source]}>{SOURCE_LABEL[t.source]}</Badge>}
                      {t.ms ? <span className="text-[11px] text-white/35 tabular-nums">{fa(Math.round(t.ms / 100) / 10)} ث</span> : null}
                    </div>
                    {t.output && <div className="mt-1.5 rounded-xl bg-white/5 p-3 text-xs leading-6 whitespace-pre-wrap text-white/80">{t.output}</div>}
                    {t.note && <div className="mt-1 text-[11px] text-amber-300/80">{t.note}</div>}
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </Panel>

      {run.log && run.log.length > 0 && (
        <Panel
          title="گزارش فعالیت"
          actions={
            <Btn size="sm" variant="ghost" onClick={() => setShowLog((v) => !v)}>
              {showLog ? 'بستن' : 'نمایش'}
            </Btn>
          }
        >
          {showLog && (
            <ol className="space-y-1 text-xs leading-6 max-h-72 overflow-y-auto">
              {run.log.map((l, i) => (
                <li key={`${l.t}-${i}`} className="flex gap-2">
                  <span className="text-white/30 tabular-nums shrink-0">{new Date(l.t).toLocaleTimeString('fa-IR')}</span>
                  <span style={{ color: l.tone === 'bad' ? TONES.bad : l.tone === 'warn' ? TONES.warn : l.tone === 'ok' ? TONES.ok : 'rgba(255,255,255,.7)' }}>{l.text}</span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      )}
    </div>
  );
}
