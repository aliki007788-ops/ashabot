export const toman = (n: number): string => `${new Intl.NumberFormat('fa-IR').format(Math.round(n))} تومان`;
export const num = (n: number): string => new Intl.NumberFormat('fa-IR').format(n);
export const dateFa = (d: string | Date | null | undefined, time = false): string => {
  if (!d) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR', time ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }).format(new Date(d));
  } catch {
    return String(d);
  }
};
export const ORDER_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'در انتظار پرداخت', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  PAID: { label: 'پرداخت‌شده', cls: 'bg-green-500/15 text-green-300 border-green-500/30' },
  FAILED: { label: 'ناموفق', cls: 'bg-red-500/15 text-red-300 border-red-500/30' },
  CANCELED: { label: 'لغو‌شده', cls: 'bg-white/10 text-white/50 border-white/15' },
};
export const priceWithDiscount = (unit: number, months: number, discountPct: number): number =>
  Math.round(unit * months * (1 - discountPct / 100));
