'use client';

import { useMemo, useState } from 'react';
import { api, extractError } from '@/lib/api';
import {
  AssistantPanel,
  BarChart,
  Badge,
  Btn,
  DataTable,
  Empty,
  ErrorBanner,
  Field,
  Modal,
  Notice,
  Panel,
  Pills,
  ProgressBar,
  Spinner,
  StatCard,
  ProcessConsole,
  RunsExplorer,
  PlannerPanel,
  WorkspaceShell,
  inboxSource,
  ownIds,
  mergeSources,
  addDays,
  copyText,
  digitsOnly,
  downloadCsv,
  fa,
  inputCls,
  jDate,
  jShort,
  jTime,
  jWeekday,
  jWeekdayShort,
  pct,
  sameDay,
  startOfDay,
  startOfWeek,
  toLocalInput,
  useAsync,
  useInterval,
  useToast,
  waLink,
} from './_kit';
import type { AutoSource, BotIndex } from './_kit';
import { manifest } from './manifest';
import { processDef } from './process';

interface Booking {
  id: string;
  customerName: string;
  customerPhone: string | null;
  service: string;
  startsAt: string;
  durationMin: number;
  status: string;
  notes: string | null;
}

const STATUS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'در انتظار', color: '#f59e0b' },
  CONFIRMED: { label: 'تأیید‌شده', color: '#4ade80' },
  DONE: { label: 'انجام‌شده', color: '#22d3ee' },
  CANCELLED: { label: 'لغو‌شده', color: '#f87171' },
  NO_SHOW: { label: 'غیبت', color: '#94a3b8' },
};
type Filter = 'ALL' | 'PENDING' | 'CONFIRMED' | 'DONE' | 'CANCELLED' | 'NO_SHOW';

const emptyForm = (base?: Date) => ({
  customerName: '',
  customerPhone: '',
  service: '',
  when: toLocalInput(base ?? new Date(Date.now() + 3600_000)),
  durationMin: '30',
  notes: '',
});

function reminderText(b: Booking): string {
  const d = new Date(b.startsAt);
  return (
    `سلام ${b.customerName} عزیز 🌿\n` +
    `یادآوری نوبت «${b.service}» شما: ${jWeekday(d)} ${jDate(d)} ساعت ${jTime(d)}.\n` +
    `اگر نیاز به تغییر زمان دارید، لطفاً همین‌جا اطلاع بدهید. منتظر دیدار شما هستیم.`
  );
}

/** رویداد واقعی: هر نوبتی که در ۱۰ دقیقه‌ی اخیر (مثلاً توسط ربات) ثبت شده + گفتگوهای تازه‌ی مشتری */
const makeSource = (bots: BotIndex): AutoSource =>
  mergeSources(inboxSource(processDef.stages.map((s) => s.bot), bots), async () => {
    const r = await api.get('/api/bookings');
    const arr = (r.data.items ?? []) as Array<{ id: string; customerName: string; service: string; startsAt: string; createdAt: string }>;
    return arr
      .filter((b) => Date.now() - new Date(b.createdAt).getTime() < 10 * 60 * 1000 && !ownIds.has(`bk:${b.id}`))
      .map((b) => ({ id: `bk:${b.id}`, input: `نوبت ${b.service} برای ${b.customerName} در ${jDate(b.startsAt)} ساعت ${jTime(b.startsAt)} (ثبت‌شده توسط ربات)`, data: { existing: true } }));
  });

export default function BookingWorkspace(props: { embedded?: boolean }) {
  const [tab, setTab] = useState('process');
  const [toast, say] = useToast();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');

  const { data, loading, error, reload } = useAsync<Booking[]>(
    async () => (await api.get('/api/bookings')).data.items as Booking[],
  );
  useInterval(() => void reload(true), 30000);
  const items = data ?? [];

  const now = new Date();
  const today = startOfDay(now);

  const todays = useMemo(
    () =>
      items
        .filter((b) => sameDay(new Date(b.startsAt), today) && b.status !== 'CANCELLED')
        .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items],
  );
  const upcoming = useMemo(
    () =>
      items
        .filter((b) => +new Date(b.startsAt) >= Date.now() && (b.status === 'PENDING' || b.status === 'CONFIRMED'))
        .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt)),
    [items],
  );
  const pending = items.filter((b) => b.status === 'PENDING' && +new Date(b.startsAt) >= Date.now() - 86400_000);
  const weekStart = startOfWeek(now);
  const weekCount = items.filter((b) => {
    const t = +new Date(b.startsAt);
    return b.status !== 'CANCELLED' && t >= +weekStart && t < +addDays(weekStart, 7);
  }).length;
  const last30 = items.filter((b) => +new Date(b.startsAt) >= Date.now() - 30 * 86400_000 && +new Date(b.startsAt) <= Date.now());
  const noShow = last30.filter((b) => b.status === 'NO_SHOW').length;
  const finished = last30.filter((b) => b.status === 'DONE' || b.status === 'NO_SHOW').length;
  const noShowRate = finished ? (noShow / finished) * 100 : 0;

  async function setStatus(id: string, status: string) {
    try {
      await api.patch(`/api/bookings/${id}`, { status });
      say(`وضعیت: ${STATUS[status]?.label ?? status}`);
      await reload(true);
    } catch (e) {
      say(extractError(e), 'err');
    }
  }
  async function remove(id: string) {
    if (!confirm('این نوبت حذف شود؟')) return;
    try {
      await api.delete(`/api/bookings/${id}`);
      say('حذف شد');
      await reload(true);
    } catch (e) {
      say(extractError(e), 'err');
    }
  }
  function openNew(base?: Date) {
    setForm(emptyForm(base));
    setFormErr('');
    setModal(true);
  }
  async function save() {
    if (!form.customerName.trim() || !form.service.trim() || !form.when) {
      setFormErr('نام مشتری، خدمت و زمان الزامی است');
      return;
    }
    const dur = Number(digitsOnly(form.durationMin) || '30');
    setSaving(true);
    setFormErr('');
    try {
      await api.post('/api/bookings', {
        customerName: form.customerName.trim(),
        customerPhone: digitsOnly(form.customerPhone) || undefined,
        service: form.service.trim(),
        startsAt: new Date(form.when).toISOString(),
        durationMin: Math.min(600, Math.max(5, dur)),
        notes: form.notes.trim() || undefined,
      });
      setModal(false);
      say('نوبت ثبت شد ✓');
      await reload(true);
    } catch (e) {
      setFormErr(extractError(e));
    } finally {
      setSaving(false);
    }
  }
  async function remind(b: Booking, how: 'copy' | 'wa') {
    const text = reminderText(b);
    if (how === 'wa' && b.customerPhone) {
      window.open(waLink(b.customerPhone, text), '_blank', 'noopener');
      return;
    }
    const ok = await copyText(text);
    say(ok ? 'متن یادآوری کپی شد' : 'کپی نشد', ok ? 'ok' : 'err');
  }

  const filtered = items
    .filter((b) => (filter === 'ALL' ? true : b.status === filter))
    .filter((b) => {
      const s = q.trim().toLowerCase();
      if (!s) return true;
      return b.customerName.toLowerCase().includes(s) || b.service.toLowerCase().includes(s) || (b.customerPhone ?? '').includes(digitsOnly(s));
    })
    .sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt));

  const aiContext = () => {
    const line = (b: Booking) => `${jShort(b.startsAt)} ${jTime(b.startsAt)} | ${b.customerName} | ${b.service} | ${STATUS[b.status]?.label ?? b.status}`;
    return (
      `امروز: ${jWeekday(now)} ${jDate(now)}\n` +
      `نوبت‌های امروز (${todays.length}):\n${todays.map(line).join('\n') || '—'}\n` +
      `نوبت‌های پیش‌رو (۱۰ تای اول):\n${upcoming.slice(0, 10).map(line).join('\n') || '—'}\n` +
      `در انتظار تأیید: ${pending.length} | نرخ غیبت ۳۰ روز: ${pct(noShowRate)}`
    );
  };

  /* ───── tabs ───── */
  const tabs = [
    { id: 'process', label: '🧭 فرایند زنده' },
    { id: 'runs', label: '📂 پرونده‌ها' },
    { id: 'goals', label: '🎯 هدف و برنامه' },
    { id: 'today', label: 'امروز', badge: todays.length },
    { id: 'week', label: 'تقویم هفتگی' },
    { id: 'all', label: 'همه نوبت‌ها', badge: items.length },
    { id: 'insights', label: 'تحلیل' },
  ];

  return (
    <WorkspaceShell
      embedded={props.embedded}
      icon={manifest.icon}
      title={manifest.title}
      subtitle={manifest.tagline}
      accent={manifest.accent}
      tabs={tabs}
      tab={tab}
      onTab={setTab}
      actions={
        <>
          <Btn onClick={() => void reload()}>↻ تازه‌سازی</Btn>
          <Btn variant="primary" onClick={() => openNew()}>
            + نوبت جدید
          </Btn>
        </>
      }
    >
      {toast}
      <ErrorBanner message={error} onRetry={() => void reload()} />
      {tab === 'process' ? (
        <ProcessConsole slug={manifest.slug} def={processDef} makeSource={makeSource} />
      ) : tab === 'runs' ? (
        <RunsExplorer slug={manifest.slug} def={processDef} />
      ) : tab === 'goals' ? (
        <PlannerPanel slug={manifest.slug} def={processDef} />
      ) : loading && !data ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon="🗓️" label="نوبت‌های امروز" value={fa(todays.length)} hint={todays.length ? `بعدی: ${upcoming[0] ? jTime(upcoming[0].startsAt) : '—'}` : 'امروز نوبتی نیست'} />
            <StatCard icon="⏳" label="در انتظار تأیید" value={fa(pending.length)} tone={pending.length ? 'warn' : 'ok'} hint="باید تأیید یا لغو شوند" />
            <StatCard icon="📆" label="نوبت‌های این هفته" value={fa(weekCount)} hint="از شنبه تا جمعه" />
            <StatCard icon="🚫" label="نرخ غیبت (۳۰ روز)" value={pct(noShowRate)} tone={noShowRate > 15 ? 'bad' : 'ok'} hint={`${fa(noShow)} غیبت از ${fa(finished)} نوبت پایان‌یافته`} />
          </div>

          {tab === 'today' && (
            <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
              <Panel title={`برنامه امروز — ${jWeekday(now)} ${jDate(now)}`} pad={false}>
                {todays.length === 0 ? (
                  <Empty icon="🌿" text="برای امروز نوبتی ثبت نشده است." action={<Btn variant="primary" onClick={() => openNew()}>ثبت نوبت</Btn>} />
                ) : (
                  <ul className="divide-y divide-white/5">
                    {todays.map((b) => {
                      const st = STATUS[b.status];
                      const past = +new Date(b.startsAt) < Date.now();
                      return (
                        <li key={b.id} className={`p-4 flex flex-wrap items-center gap-3 ${past && b.status !== 'PENDING' && b.status !== 'CONFIRMED' ? 'opacity-60' : ''}`}>
                          <div className="w-16 text-center">
                            <div className="text-lg font-black" style={{ color: 'var(--ws)' }}>{jTime(b.startsAt)}</div>
                            <div className="text-[10px] text-white/40">{fa(b.durationMin)} دقیقه</div>
                          </div>
                          <div className="flex-1 min-w-[160px]">
                            <div className="font-bold">{b.customerName}</div>
                            <div className="text-xs text-white/50">{b.service}{b.customerPhone ? ` · ${b.customerPhone}` : ''}</div>
                            {b.notes && <div className="text-[11px] text-white/35 mt-0.5">📝 {b.notes}</div>}
                          </div>
                          <Badge color={st?.color}>{st?.label ?? b.status}</Badge>
                          <div className="flex gap-1.5 flex-wrap">
                            {b.status === 'PENDING' && <Btn size="sm" variant="primary" onClick={() => void setStatus(b.id, 'CONFIRMED')}>تأیید</Btn>}
                            {(b.status === 'CONFIRMED' || b.status === 'PENDING') && (
                              <>
                                <Btn size="sm" onClick={() => void setStatus(b.id, 'DONE')}>انجام شد</Btn>
                                <Btn size="sm" onClick={() => void setStatus(b.id, 'NO_SHOW')}>غیبت</Btn>
                                <Btn size="sm" variant="danger" onClick={() => void setStatus(b.id, 'CANCELLED')}>لغو</Btn>
                              </>
                            )}
                            <Btn size="sm" variant="ghost" title="کپی متن یادآوری" onClick={() => void remind(b, 'copy')}>📋</Btn>
                            {b.customerPhone && <Btn size="sm" variant="ghost" title="ارسال در واتس‌اپ" onClick={() => void remind(b, 'wa')}>💬</Btn>}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Panel>
              <div className="space-y-4">
                <Panel title="نوبت بعدی">
                  {upcoming[0] ? (
                    <div className="space-y-2">
                      <div className="text-xl font-black">{upcoming[0].customerName}</div>
                      <div className="text-sm text-white/60">{upcoming[0].service}</div>
                      <div className="text-sm">{jWeekday(upcoming[0].startsAt)} {jDate(upcoming[0].startsAt)} — ساعت {jTime(upcoming[0].startsAt)}</div>
                      <div className="flex gap-2 pt-1">
                        <Btn size="sm" onClick={() => void remind(upcoming[0], 'copy')}>کپی یادآوری</Btn>
                        {upcoming[0].customerPhone && <Btn size="sm" variant="primary" onClick={() => void remind(upcoming[0], 'wa')}>واتس‌اپ</Btn>}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-white/45">نوبت پیش‌رویی وجود ندارد.</p>
                  )}
                </Panel>
                <AssistantPanel
                  slug={manifest.slug}
                  title="دستیار نوبت‌دهی"
                  context={aiContext}
                  quickPrompts={['خلاصه‌ی برنامه امروز', 'کدام نوبت‌ها ریسک غیبت دارند؟', 'یک پیام یادآوری برای نوبت بعدی بنویس']}
                />
              </div>
            </div>
          )}

          {tab === 'week' && (
            <Panel
              title={`هفته ${weekOffset === 0 ? 'جاری' : weekOffset > 0 ? `+${fa(weekOffset)}` : fa(weekOffset)} — از ${jDate(addDays(weekStart, weekOffset * 7))}`}
              actions={
                <>
                  <Btn size="sm" onClick={() => setWeekOffset((w) => w - 1)}>‹ هفته قبل</Btn>
                  <Btn size="sm" onClick={() => setWeekOffset(0)}>امروز</Btn>
                  <Btn size="sm" onClick={() => setWeekOffset((w) => w + 1)}>هفته بعد ›</Btn>
                </>
              }
            >
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                {Array.from({ length: 7 }).map((_, i) => {
                  const day = addDays(weekStart, weekOffset * 7 + i);
                  const list = items
                    .filter((b) => sameDay(new Date(b.startsAt), day) && b.status !== 'CANCELLED')
                    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
                  const isToday = sameDay(day, now);
                  return (
                    <div key={i} className="rounded-xl border p-2 min-h-[150px] flex flex-col gap-1.5" style={{ borderColor: isToday ? 'var(--ws)' : 'rgba(255,255,255,.1)', background: isToday ? 'color-mix(in srgb, var(--ws) 8%, transparent)' : 'rgba(255,255,255,.02)' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{jWeekdayShort(day)} {jShort(day)}</span>
                        <button className="text-white/40 hover:text-white text-lg leading-none" title="نوبت جدید این روز" onClick={() => { const d = new Date(day); d.setHours(10, 0, 0, 0); openNew(d); }}>+</button>
                      </div>
                      {list.length === 0 && <span className="text-[11px] text-white/25">—</span>}
                      {list.map((b) => (
                        <div key={b.id} className="rounded-lg px-2 py-1 text-[11px] leading-5" style={{ background: `${STATUS[b.status]?.color ?? '#94a3b8'}22`, borderRight: `3px solid ${STATUS[b.status]?.color ?? '#94a3b8'}` }}>
                          <b>{jTime(b.startsAt)}</b> {b.customerName}
                          <div className="text-white/50 truncate">{b.service}</div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}

          {tab === 'all' && (
            <Panel
              title="همه نوبت‌ها"
              actions={
                <Btn size="sm" onClick={() => downloadCsv('bookings.csv', [['مشتری', 'موبایل', 'خدمت', 'زمان', 'مدت (دقیقه)', 'وضعیت'], ...filtered.map((b) => [b.customerName, b.customerPhone ?? '', b.service, `${jDate(b.startsAt)} ${jTime(b.startsAt)}`, b.durationMin, STATUS[b.status]?.label ?? b.status])])}>
                  ⬇ خروجی CSV
                </Btn>
              }
            >
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <input className={`${inputCls} max-w-xs`} placeholder="جست‌وجوی نام، خدمت یا موبایل…" value={q} onChange={(e) => setQ(e.target.value)} />
                <Pills<Filter>
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { value: 'ALL', label: 'همه', count: items.length },
                    ...(['PENDING', 'CONFIRMED', 'DONE', 'CANCELLED', 'NO_SHOW'] as const).map((k) => ({ value: k as Filter, label: STATUS[k].label, count: items.filter((b) => b.status === k).length })),
                  ]}
                />
              </div>
              <DataTable
                rows={filtered}
                rowKey={(b) => b.id}
                empty={<Empty icon="🔎" text="نوبتی با این فیلتر پیدا نشد." />}
                columns={[
                  { key: 'c', header: 'مشتری', render: (b) => (<><div className="font-bold">{b.customerName}</div><div className="text-xs text-white/40" dir="ltr">{b.customerPhone}</div></>) },
                  { key: 's', header: 'خدمت', render: (b) => b.service },
                  { key: 't', header: 'زمان', render: (b) => <span className="text-xs">{jDate(b.startsAt)} — {jTime(b.startsAt)}</span> },
                  {
                    key: 'st',
                    header: 'وضعیت',
                    render: (b) => (
                      <div className="flex items-center gap-2">
                        <Badge color={STATUS[b.status]?.color}>{STATUS[b.status]?.label ?? b.status}</Badge>
                        <select className="bg-transparent text-xs border border-white/15 rounded-lg px-1.5 py-1" value={b.status} onChange={(e) => void setStatus(b.id, e.target.value)}>
                          {Object.entries(STATUS).map(([k, v]) => (<option key={k} value={k} className="text-black">{v.label}</option>))}
                        </select>
                      </div>
                    ),
                  },
                  { key: 'a', header: '', render: (b) => <Btn size="sm" variant="danger" onClick={() => void remove(b.id)}>حذف</Btn> },
                ]}
              />
            </Panel>
          )}

          {tab === 'insights' && <Insights items={items} now={now} />}
        </>
      )}

      <Modal
        open={modal}
        title="نوبت جدید"
        onClose={() => setModal(false)}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setModal(false)}>انصراف</Btn>
            <Btn variant="primary" disabled={saving} onClick={() => void save()}>{saving ? 'در حال ثبت…' : 'ثبت نوبت'}</Btn>
          </>
        }
      >
        {formErr && <Notice tone="bad">{formErr}</Notice>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="نام مشتری *"><input className={inputCls} value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} /></Field>
          <Field label="موبایل"><input className={inputCls} dir="ltr" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="09…" /></Field>
        </div>
        <Field label="خدمت *"><input className={inputCls} value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} placeholder="مثلاً ویزیت، مشاوره، کوتاهی مو…" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="زمان *"><input type="datetime-local" className={inputCls} value={form.when} onChange={(e) => setForm({ ...form, when: e.target.value })} /></Field>
          <Field label="مدت (دقیقه)"><input className={inputCls} dir="ltr" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: e.target.value })} /></Field>
        </div>
        <Field label="یادداشت"><textarea className={inputCls} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        <p className="text-[11px] text-white/35">اگر همان زمان قبلاً رزرو شده باشد، سیستم ثبت را رد می‌کند.</p>
      </Modal>
    </WorkspaceShell>
  );
}

function Insights({ items, now }: { items: Booking[]; now: Date }) {
  const today = startOfDay(now);
  const days = Array.from({ length: 14 }).map((_, i) => addDays(today, i - 13));
  const perDay = days.map((d) => ({
    label: jShort(d),
    value: items.filter((b) => sameDay(new Date(b.startsAt), d) && b.status !== 'CANCELLED').length,
  }));
  const hours = Array.from({ length: 13 }).map((_, i) => 8 + i);
  const active = items.filter((b) => b.status !== 'CANCELLED');
  const perHour = hours.map((h) => ({ label: fa(h), value: active.filter((b) => new Date(b.startsAt).getHours() === h).length }));
  const bySvc = new Map<string, number>();
  active.forEach((b) => bySvc.set(b.service, (bySvc.get(b.service) ?? 0) + 1));
  const top = [...bySvc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = top[0]?.[1] ?? 1;
  const total = items.length || 1;
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Panel title="نوبت‌ها در ۱۴ روز اخیر"><BarChart data={perDay} format={fa} /></Panel>
      <Panel title="ساعات شلوغی" subtitle="بر اساس همه‌ی نوبت‌های ثبت‌شده"><BarChart data={perHour} format={fa} /></Panel>
      <Panel title="پرتقاضاترین خدمات">
        {top.length === 0 ? <Empty icon="📊" text="هنوز داده‌ای نیست." /> : (
          <div className="space-y-3">
            {top.map(([name, n]) => (<ProgressBar key={name} value={n} max={max} label={`${name} — ${fa(n)}`} />))}
          </div>
        )}
      </Panel>
      <Panel title="توزیع وضعیت‌ها">
        <div className="space-y-3">
          {Object.entries(STATUS).map(([k, v]) => {
            const n = items.filter((b) => b.status === k).length;
            return <ProgressBar key={k} value={n} max={total} color={v.color} label={`${v.label} — ${fa(n)}`} />;
          })}
        </div>
      </Panel>
    </div>
  );
}
