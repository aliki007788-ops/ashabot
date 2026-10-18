'use client';

import { cn } from '@/lib/utils';

export const fieldCls =
  'w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white placeholder:text-white/30 text-sm ' +
  'focus:outline-none focus:border-[#6a8dff] focus:ring-2 focus:ring-[#6a8dff]/30 transition';

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">{title}</h1>
        {subtitle && <p className="text-white/50 mt-2 text-sm">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center h-40">
      <div className="w-8 h-8 border-2 border-white/20 border-t-[#6a8dff] rounded-full animate-spin" />
    </div>
  );
}

export function ErrorBox({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm mb-4">
      {message}
    </div>
  );
}

export function Empty({ icon = '📭', text }: { icon?: string; text: string }) {
  return (
    <div className="text-center py-16 text-white/40">
      <div className="text-5xl mb-3">{icon}</div>
      <p className="text-sm">{text}</p>
    </div>
  );
}

export function Badge({ children, color = '#6a8dff' }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: color + '22', color, border: `1px solid ${color}44` }}
    >
      {children}
    </span>
  );
}

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block', className)}>
      <span className="block mb-1.5 text-xs font-semibold text-white/70">{label}</span>
      {children}
    </label>
  );
}

export function formatDate(iso?: string | null) {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatToman(n: number) {
  return new Intl.NumberFormat('fa-IR').format(n) + ' تومان';
}
