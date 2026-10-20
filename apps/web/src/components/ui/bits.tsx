'use client';

import { ORDER_STATUS } from '@/lib/fmt';

export function StatusBadge({ status }: { status: string }) {
  const s = ORDER_STATUS[status] ?? { label: status, cls: 'bg-white/10 text-white/60 border-white/15' };
  return <span className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full border ${s.cls}`}>{s.label}</span>;
}

export function Stat({ label, value, hint, color = '#6a8dff' }: { label: string; value: string; hint?: string; color?: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5" style={{ borderTop: `3px solid ${color}` }}>
      <div className="text-xs text-white/50 mb-1">{label}</div>
      <div className="text-2xl font-black">{value}</div>
      {hint && <div className="text-[11px] text-white/40 mt-1">{hint}</div>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="py-16 grid place-items-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-[#6a8dff] rounded-full animate-spin" />
    </div>
  );
}

export function ErrorBox({ msg, onRetry }: { msg: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 text-red-300 p-4 text-sm flex items-center justify-between gap-3">
      <span>{msg}</span>
      {onRetry && (
        <button onClick={onRetry} className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs">
          تلاش دوباره
        </button>
      )}
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <div className="text-center text-white/40 text-sm py-10">{text}</div>;
}

export const selectCls = 'px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-sm text-white focus:outline-none focus:border-[#6a8dff]';
export const inputCls = 'px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#6a8dff]';

export function Pager({ skip, take, total, onChange }: { skip: number; take: number; total: number; onChange: (s: number) => void }) {
  if (total <= take) return null;
  return (
    <div className="flex items-center justify-between text-xs text-white/50 pt-3">
      <span>
        {skip + 1}–{Math.min(skip + take, total)} از {total}
      </span>
      <div className="flex gap-2">
        <button disabled={skip === 0} onClick={() => onChange(Math.max(0, skip - take))} className="px-3 py-1.5 rounded-lg bg-white/10 disabled:opacity-30">
          قبلی
        </button>
        <button disabled={skip + take >= total} onClick={() => onChange(skip + take)} className="px-3 py-1.5 rounded-lg bg-white/10 disabled:opacity-30">
          بعدی
        </button>
      </div>
    </div>
  );
}
