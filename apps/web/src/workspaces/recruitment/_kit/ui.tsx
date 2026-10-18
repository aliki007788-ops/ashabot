'use client';

/* Workspace Kit — اجزای رابط. رنگ تأکید هر خوشه از CSS variable با نام --ws می‌آید. */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

const cx = (...a: Array<string | false | null | undefined>): string => a.filter(Boolean).join(' ');

export const inputCls =
  'w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white placeholder:text-white/30 text-sm ' +
  'focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/10 transition';

export const TONES = {
  ok: '#4ade80',
  warn: '#f59e0b',
  bad: '#f87171',
  info: '#22d3ee',
  mute: '#94a3b8',
} as const;
export type Tone = keyof typeof TONES;

/* ───────────── Shell ───────────── */
export function WorkspaceShell(props: {
  icon: string;
  title: string;
  subtitle?: string;
  accent: string;
  tabs?: Array<{ id: string; label: string; badge?: number | string }>;
  tab?: string;
  onTab?: (id: string) => void;
  actions?: ReactNode;
  /** داخل صفحه‌ی خوشه: هدر بزرگ حذف می‌شود و فقط نوار تب‌ها می‌ماند */
  embedded?: boolean;
  children: ReactNode;
}) {
  const style = {
    '--ws': props.accent,
  } as CSSProperties;
  if (props.embedded) {
    return (
      <div style={style} className="space-y-4" dir="rtl">
        <div className="rounded-2xl border border-white/10 px-4 pt-3 pb-1" style={{ background: `linear-gradient(135deg, ${props.accent}1f 0%, transparent 70%)` }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-extrabold text-sm">
              <span>{props.icon}</span>
              <span>{props.title}</span>
            </div>
            {props.actions && <div className="flex items-center gap-2 flex-wrap">{props.actions}</div>}
          </div>
          {props.tabs && props.tabs.length > 0 && <Tabs tabs={props.tabs} value={props.tab ?? props.tabs[0].id} onChange={props.onTab ?? (() => {})} />}
        </div>
        {props.children}
      </div>
    );
  }
  return (
    <div style={style} className="space-y-5" dir="rtl">
      <div
        className="rounded-3xl border border-white/10 p-5 md:p-6"
        style={{ background: `linear-gradient(135deg, ${props.accent}26 0%, transparent 65%)` }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl grid place-items-center text-3xl"
              style={{ background: `${props.accent}22`, border: `1px solid ${props.accent}55` }}
            >
              {props.icon}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">{props.title}</h1>
              {props.subtitle && <p className="text-white/55 text-sm mt-1">{props.subtitle}</p>}
            </div>
          </div>
          {props.actions && <div className="flex items-center gap-2 flex-wrap">{props.actions}</div>}
        </div>
        {props.tabs && props.tabs.length > 0 && (
          <Tabs tabs={props.tabs} value={props.tab ?? props.tabs[0].id} onChange={props.onTab ?? (() => {})} />
        )}
      </div>
      {props.children}
    </div>
  );
}

export function Tabs(props: {
  tabs: Array<{ id: string; label: string; badge?: number | string }>;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="mt-5 flex gap-1 overflow-x-auto pb-1">
      {props.tabs.map((t) => {
        const on = t.id === props.value;
        return (
          <button
            key={t.id}
            onClick={() => props.onChange(t.id)}
            className={cx(
              'px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition flex items-center gap-2',
              on ? 'text-white' : 'text-white/55 hover:text-white hover:bg-white/5',
            )}
            style={on ? { background: 'var(--ws)', color: '#07122e' } : undefined}
          >
            {t.label}
            {t.badge !== undefined && t.badge !== 0 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-black"
                style={on ? { background: '#07122e', color: 'var(--ws)' } : { background: 'rgba(255,255,255,.12)' }}
              >
                {t.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ───────────── Layout blocks ───────────── */
export function Panel(props: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <section className={cx('rounded-2xl border border-white/10 bg-white/[0.04]', props.className)}>
      {(props.title || props.actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-1">
          <div>
            {props.title && <h2 className="font-extrabold text-base">{props.title}</h2>}
            {props.subtitle && <p className="text-white/45 text-xs mt-0.5">{props.subtitle}</p>}
          </div>
          {props.actions && <div className="flex items-center gap-2">{props.actions}</div>}
        </header>
      )}
      <div className={props.pad === false ? 'mt-3' : 'p-5 pt-3'}>{props.children}</div>
    </section>
  );
}

export function StatCard(props: { label: string; value: string; hint?: string; icon?: string; tone?: Tone }) {
  const color = props.tone ? TONES[props.tone] : 'var(--ws)';
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between">
        <span className="text-white/55 text-xs font-bold">{props.label}</span>
        {props.icon && <span className="text-lg">{props.icon}</span>}
      </div>
      <div className="mt-2 text-2xl font-black" style={{ color }}>
        {props.value}
      </div>
      {props.hint && <div className="text-[11px] text-white/40 mt-1">{props.hint}</div>}
    </div>
  );
}

export function Badge(props: { children: ReactNode; tone?: Tone; color?: string }) {
  const c = props.color ?? (props.tone ? TONES[props.tone] : '#94a3b8');
  return (
    <span
      className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: `${c}22`, color: c, border: `1px solid ${c}44` }}
    >
      {props.children}
    </span>
  );
}

export function Empty(props: { icon?: string; text: string; action?: ReactNode }) {
  return (
    <div className="text-center py-12 text-white/40">
      <div className="text-5xl mb-3">{props.icon ?? '📭'}</div>
      <p className="text-sm">{props.text}</p>
      {props.action && <div className="mt-4">{props.action}</div>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center h-40">
      <div className="w-8 h-8 border-2 border-white/20 rounded-full animate-spin" style={{ borderTopColor: 'var(--ws)' }} />
    </div>
  );
}

export function ErrorBanner(props: { message?: string; onRetry?: () => void }) {
  if (!props.message) return null;
  return (
    <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-3 text-sm flex items-center justify-between gap-3">
      <span>{props.message}</span>
      {props.onRetry && (
        <button onClick={props.onRetry} className="text-xs underline whitespace-nowrap">
          تلاش دوباره
        </button>
      )}
    </div>
  );
}

export function Notice(props: { tone?: Tone; children: ReactNode }) {
  const c = TONES[props.tone ?? 'warn'];
  return (
    <div className="rounded-xl p-3 text-sm" style={{ background: `${c}14`, border: `1px solid ${c}40`, color: c }}>
      {props.children}
    </div>
  );
}

/* ───────────── Controls ───────────── */
export function Btn(
  props: {
    variant?: 'primary' | 'soft' | 'ghost' | 'danger';
    size?: 'sm' | 'md';
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: 'button' | 'submit';
    title?: string;
    className?: string;
  },
) {
  const v = props.variant ?? 'soft';
  const size = props.size ?? 'md';
  const base =
    'rounded-xl font-bold transition disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap ' +
    (size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm');
  const style: CSSProperties | undefined =
    v === 'primary'
      ? { background: 'var(--ws)', color: '#07122e' }
      : v === 'danger'
        ? { background: '#f8717122', color: '#f87171', border: '1px solid #f8717144' }
        : undefined;
  const cls =
    v === 'soft'
      ? 'bg-white/10 hover:bg-white/15 text-white'
      : v === 'ghost'
        ? 'text-white/70 hover:text-white hover:bg-white/5'
        : 'hover:brightness-110';
  return (
    <button
      type={props.type ?? 'button'}
      title={props.title}
      disabled={props.disabled}
      onClick={props.onClick}
      className={cx(base, cls, props.className)}
      style={style}
    >
      {props.children}
    </button>
  );
}

export function Field(props: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block', props.className)}>
      <span className="block text-xs font-bold text-white/60 mb-1.5">{props.label}</span>
      {props.children}
      {props.hint && <span className="block text-[11px] text-white/35 mt-1">{props.hint}</span>}
    </label>
  );
}

export function Pills<T extends string>(props: {
  options: Array<{ value: T; label: string; count?: number }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {props.options.map((o) => {
        const on = o.value === props.value;
        return (
          <button
            key={o.value}
            onClick={() => props.onChange(o.value)}
            className={cx('px-3 py-1.5 rounded-full text-xs font-bold border transition', on ? '' : 'border-white/15 text-white/60 hover:text-white')}
            style={on ? { background: 'var(--ws)', color: '#07122e', borderColor: 'var(--ws)' } : undefined}
          >
            {o.label}
            {o.count !== undefined && <span className="opacity-60 mr-1">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Modal(props: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!props.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [props.open, props.onClose]);
  if (!props.open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/60 backdrop-blur-sm" onClick={props.onClose}>
      <div
        dir="rtl"
        className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#0d1a3f] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="font-extrabold">{props.title}</h3>
          <button onClick={props.onClose} className="text-white/50 hover:text-white text-lg leading-none">
            ×
          </button>
        </header>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">{props.children}</div>
        {props.footer && <footer className="px-5 py-4 border-t border-white/10 flex justify-end gap-2">{props.footer}</footer>}
      </div>
    </div>
  );
}

/* ───────────── Data ───────────── */
export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T>(props: {
  columns: Array<Column<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  empty?: ReactNode;
}) {
  if (props.rows.length === 0) return <>{props.empty ?? <Empty text="موردی یافت نشد" />}</>;
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-sm">
        <thead className="bg-white/5 text-white/55 text-xs">
          <tr>
            {props.columns.map((c) => (
              <th key={c.key} className={cx('text-right p-3 font-bold', c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((r) => (
            <tr key={props.rowKey(r)} className="border-t border-white/5 hover:bg-white/[0.03]">
              {props.columns.map((c) => (
                <td key={c.key} className={cx('p-3 align-middle', c.className)}>
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BarChart(props: {
  data: Array<{ label: string; value: number }>;
  height?: number;
  format?: (n: number) => string;
  color?: string;
}) {
  const h = props.height ?? 140;
  const max = Math.max(1, ...props.data.map((d) => d.value));
  const fmt = props.format ?? ((n: number) => String(n));
  return (
    <div className="flex items-end gap-1.5 w-full" style={{ height: h + 36 }}>
      {props.data.map((d, i) => {
        const bh = Math.max(d.value > 0 ? 4 : 1, (d.value / max) * h);
        return (
          <div key={`${d.label}-${i}`} className="flex-1 min-w-0 flex flex-col items-center justify-end gap-1 group" title={`${d.label}: ${fmt(d.value)}`}>
            <span className="text-[10px] text-white/0 group-hover:text-white/70 transition truncate max-w-full">{fmt(d.value)}</span>
            <div
              className="w-full rounded-t-md transition-all"
              style={{ height: bh, background: props.color ?? 'var(--ws)', opacity: d.value > 0 ? 0.9 : 0.15 }}
            />
            <span className="text-[10px] text-white/40 truncate max-w-full">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function ProgressBar(props: { value: number; max: number; color?: string; label?: string }) {
  const p = props.max > 0 ? Math.min(100, (props.value / props.max) * 100) : 0;
  return (
    <div>
      {props.label && <div className="text-xs text-white/60 mb-1">{props.label}</div>}
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${p}%`, background: props.color ?? 'var(--ws)' }} />
      </div>
    </div>
  );
}

/* ───────────── Toast ───────────── */
export function useToast(): [ReactNode, (msg: string, kind?: 'ok' | 'err') => void] {
  const [t, setT] = useState<{ msg: string; kind: 'ok' | 'err' } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((msg: string, kind: 'ok' | 'err' = 'ok') => {
    setT({ msg, kind });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setT(null), 3200);
  }, []);
  const el = t ? (
    <div
      dir="rtl"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl text-sm font-bold shadow-xl"
      style={{ background: t.kind === 'ok' ? '#16a34a' : '#dc2626', color: '#fff' }}
    >
      {t.msg}
    </div>
  ) : null;
  return [el, show];
}
