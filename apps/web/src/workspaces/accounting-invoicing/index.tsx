'use client';

import { useMemo, useState } from 'react';
import { API_URL, api, extractError } from '@/lib/api';
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
  GoalsPanel,
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
  jDateTime,
  jShort,
  pct,
  sameDay,
  smsLink,
  startOfDay,
  toman,
  toEnDigits,
  useAsync,
  useInterval,
  useToast,
  waLink,
} from './_kit';
import type { AutoSource, BotIndex } from './_kit';
import { manifest } from './manifest';
import { processDef } from './process';

interface Payment {
  id: string;
  amount: number;
  description: string;
  status: string;
  refId: string | null;
  paidAt: string | null;
  createdAt: string;
}
interface PaymentsResponse {
  items: Payment[];
  totalPaid: number;
  configured: boolean;
}

const STATUS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'در انتظار پرداخت', color: '#f59e0b' },
  PAID: { label: 'پرداخت‌شده', color: '#4ade80' },
  FAILED: { label: 'ناموفق', color: '#f87171' },
};
type Filter = 'ALL' | 'PENDING' | 'PAID' | 'FAILED';

const payLink = (id: string) => `${API_URL.replace(/\/$/, '')}/api/payments/pay/${id}`;
const num = (s: string) => Number(digitsOnly(s) || '0');

/** رویداد واقعی: هر فاکتور/پرداختی که در ۱۰ دقیقه‌ی اخیر ساخته شده + گفتگوهای تازه‌ی مشتری */
const makeSource = (bots: BotIndex): AutoSource =>
  mergeSources(inboxSource(processDef.stages.map((s) => s.bot), bots), async () => {
    const r = await api.get('/api/payments');
    const arr = (r.data.items ?? []) as Array<{ id: string; amount: number; description: string; createdAt: string }>;
    return arr
      .filter((p) => Date.now() - new Date(p.createdAt).getTime() < 10 * 60 * 1000 && !ownIds.has(`pay:${p.id}`))
      .map((p) => ({ id: `pay:${p.id}`, input: `فاکتور ${toman(p.amount)}: ${p.description}`, data: { existing: true } }));
  });

export default function InvoicingWorkspace(props: { embedded?: boolean }) {
  const [tab, setTab] = useState('process');
  const [toast, say] = useToast();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');

  // فاکتور جدید
  const [f, setF] = useState({ customer: '', phone: '', title: '', base: '', vat: '10', useVat: false });
  const [creating, setCreating] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [created, setCreated] = useState<{ id: string; amount: number; text: string; phone: string } | null>(null);

  const { data, loading, error, reload } = useAsync<PaymentsResponse>(async () => (await api.get('/api/payments')).data as PaymentsResponse);
  useInterval(() => void reload(true), 20000);
  const items = data?.items ?? [];

  const now = new Date();
  const paid = items.filter((p) => p.status === 'PAID');
  const pending = items.filter((p) => p.status === 'PENDING');
  const failed = items.filter((p) => p.status === 'FAILED');
  const pendingSum = pending.reduce((a, p) => a + p.amount, 0);
  const paidSum = data?.totalPaid ?? paid.reduce((a, p) => a + p.amount, 0);
  const decided = paid.length + failed.length;
  const successRate = decided ? (paid.length / decided) * 100 : 0;
  const avg = paid.length ? paidSum / paid.length : 0;
  const month = paid.filter((p) => p.paidAt && +new Date(p.paidAt) >= Date.now() - 30 * 86400_000);
  const monthSum = month.reduce((a, p) => a + p.amount, 0);

  const perDay = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: 14 }).map((_, i) => {
      const d = addDays(today, i - 13);
      return {
        label: jShort(d),
        value: paid.filter((p) => p.paidAt && sameDay(new Date(p.paidAt), d)).reduce((a, p) => a + p.amount, 0),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const base = num(f.base);
  const vatPct = Math.min(30, num(f.vat));
  const vatAmount = f.useVat ? Math.round((base * vatPct) / 100) : 0;
  const total = base + vatAmount;

  async function create() {
    setFormErr('');
    if (!f.title.trim()) return setFormErr('شرح فاکتور را بنویسید');
    if (base < 1000) return setFormErr('مبلغ باید حداقل ۱٬۰۰۰ تومان باشد');
    if (total > 500_000_000) return setFormErr('سقف هر لینک ۵۰۰ میلیون تومان است');
    const description = [f.customer.trim() && `${f.customer.trim()}`, f.title.trim(), f.useVat ? `(با ${vatPct}٪ مالیات)` : ''].filter(Boolean).join(' — ').slice(0, 200);
    setCreating(true);
    try {
      const r = await api.post('/api/payments', { amount: total, description });
      const id = r.data.id as string;
      const link = payLink(id);
      const text = `سلام${f.customer.trim() ? ` ${f.customer.trim()}` : ''} عزیز 🌿\nفاکتور «${f.title.trim()}» به مبلغ ${toman(total)} صادر شد.\nلینک پرداخت امن:\n${link}`;
      setCreated({ id, amount: total, text, phone: digitsOnly(f.phone) });
      setF({ customer: '', phone: '', title: '', base: '', vat: f.vat, useVat: f.useVat });
      say('لینک پرداخت ساخته شد ✓');
      await reload(true);
    } catch (e) {
      setFormErr(extractError(e));
    } finally {
      setCreating(false);
    }
  }

  async function copy(text: string, ok = 'کپی شد') {
    const done = await copyText(text);
    say(done ? ok : 'کپی نشد', done ? 'ok' : 'err');
  }

  const filtered = items
    .filter((p) => (filter === 'ALL' ? true : p.status === filter))
    .filter((p) => {
      const s = toEnDigits(q.trim().toLowerCase());
      if (!s) return true;
      return p.description.toLowerCase().includes(s) || (p.refId ?? '').includes(s) || String(p.amount).includes(s);
    });

  const aiContext = () =>
    `جمع وصول‌شده: ${toman(paidSum)} | ۳۰ روز اخیر: ${toman(monthSum)} | در انتظار: ${fa(pending.length)} مورد (${toman(pendingSum)}) | ناموفق: ${fa(failed.length)} | نرخ موفقیت: ${pct(successRate)} | میانگین فاکتور: ${toman(Math.round(avg))}\n` +
    `آخرین فاکتورها:\n${items.slice(0, 12).map((p) => `${jShort(p.createdAt)} | ${toman(p.amount)} | ${STATUS[p.status]?.label ?? p.status} | ${p.description}`).join('\n') || '—'}`;

  return (
    <WorkspaceShell
      embedded={props.embedded}
      icon={manifest.icon}
      title={manifest.title}
      subtitle={manifest.tagline}
      accent={manifest.accent}
      tabs={[
        { id: 'process', label: '🧭 فرایند زنده' },
    { id: 'runs', label: '📂 پرونده‌ها' },
    { id: 'goals', label: '🎯 اهداف' },
        { id: 'overview', label: 'نمای کلی' },
        { id: 'new', label: 'فاکتور جدید' },
        { id: 'list', label: 'تراکنش‌ها', badge: items.length },
      ]}
      tab={tab}
      onTab={setTab}
      actions={
        <>
          <Btn onClick={() => void reload()}>↻ تازه‌سازی</Btn>
          <Btn variant="primary" onClick={() => setTab('new')}>+ فاکتور جدید</Btn>
        </>
      }
    >
      {toast}
      <ErrorBanner message={error} onRetry={() => void reload()} />
      {data && !data.configured && (
        <Notice tone="warn">
          درگاه پرداخت هنوز وصل نیست. در تنظیمات سرور (Render) مقدار <b dir="ltr">ZARINPAL_MERCHANT_ID</b> را بگذارید. برای تست، <b dir="ltr">ZARINPAL_SANDBOX=true</b> را فعال کنید. تا آن زمان لینک‌ها ساخته می‌شوند ولی پرداخت انجام نمی‌شود.
        </Notice>
      )}
      {tab === 'process' ? (
        <ProcessConsole slug={manifest.slug} def={processDef} makeSource={makeSource} />
      ) : tab === 'runs' ? (
        <RunsExplorer slug={manifest.slug} def={processDef} />
      ) : tab === 'goals' ? (
        <GoalsPanel slug={manifest.slug} def={processDef} />
      ) : loading && !data ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon="💰" tone="ok" label="جمع وصول‌شده" value={toman(paidSum)} hint={`${fa(paid.length)} تراکنش موفق`} />
            <StatCard icon="⏳" tone="warn" label="در انتظار پرداخت" value={toman(pendingSum)} hint={`${fa(pending.length)} فاکتور باز`} />
            <StatCard icon="📈" label="۳۰ روز اخیر" value={toman(monthSum)} hint={`${fa(month.length)} پرداخت`} />
            <StatCard icon="🎯" label="نرخ موفقیت" value={pct(successRate)} tone={decided && successRate < 60 ? 'bad' : 'ok'} hint={`میانگین فاکتور ${toman(Math.round(avg))}`} />
          </div>

          {tab === 'overview' && (
            <div className="grid lg:grid-cols-[1.5fr_1fr] gap-4">
              <div className="space-y-4">
                <Panel title="وصولی ۱۴ روز اخیر (تومان)"><BarChart data={perDay} format={fa} /></Panel>
                <Panel title="فاکتورهای باز (نیازمند پیگیری)" pad={false}>
                  {pending.length === 0 ? (
                    <Empty icon="✅" text="فاکتور بازی وجود ندارد." />
                  ) : (
                    <ul className="divide-y divide-white/5">
                      {pending.slice(0, 8).map((p) => (
                        <li key={p.id} className="p-4 flex flex-wrap items-center gap-3">
                          <div className="flex-1 min-w-[180px]">
                            <div className="font-bold">{toman(p.amount)}</div>
                            <div className="text-xs text-white/50">{p.description} · {jDate(p.createdAt)}</div>
                          </div>
                          <Btn size="sm" onClick={() => void copy(payLink(p.id), 'لینک کپی شد')}>کپی لینک</Btn>
                          <Btn size="sm" variant="primary" onClick={() => void copy(`یادآوری پرداخت 🌿\nفاکتور «${p.description}» به مبلغ ${toman(p.amount)} هنوز پرداخت نشده است.\n${payLink(p.id)}`, 'متن پیگیری کپی شد')}>متن پیگیری</Btn>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </div>
              <div className="space-y-4">
                <Panel title="وضعیت فاکتورها">
                  <div className="space-y-3">
                    {Object.entries(STATUS).map(([k, v]) => {
                      const n = items.filter((p) => p.status === k).length;
                      return <ProgressBar key={k} value={n} max={items.length || 1} color={v.color} label={`${v.label} — ${fa(n)}`} />;
                    })}
                  </div>
                </Panel>
                <AssistantPanel
                  slug={manifest.slug}
                  title="دستیار مالی"
                  context={aiContext}
                  quickPrompts={['وضعیت وصولی را تحلیل کن', 'متن پیگیری مؤدبانه برای فاکتورهای باز بنویس', 'چرا نرخ موفقیت پایین است؟']}
                />
              </div>
            </div>
          )}

          {tab === 'new' && (
            <div className="grid lg:grid-cols-[1.1fr_1fr] gap-4">
              <Panel title="صدور فاکتور و لینک پرداخت" subtitle="لینک را برای مشتری بفرستید؛ پرداخت از درگاه زرین‌پال انجام می‌شود.">
                <div className="space-y-4">
                  {formErr && <Notice tone="bad">{formErr}</Notice>}
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="نام مشتری"><input className={inputCls} value={f.customer} onChange={(e) => setF({ ...f, customer: e.target.value })} /></Field>
                    <Field label="موبایل مشتری"><input className={inputCls} dir="ltr" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="09…" /></Field>
                  </div>
                  <Field label="شرح فاکتور *"><input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="مثلاً طراحی لوگو، اشتراک ماهانه…" /></Field>
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <Field label="مبلغ (تومان) *"><input className={inputCls} dir="ltr" inputMode="numeric" value={f.base} onChange={(e) => setF({ ...f, base: digitsOnly(e.target.value) })} /></Field>
                    <label className="flex items-center gap-2 text-sm pb-2.5">
                      <input type="checkbox" checked={f.useVat} onChange={(e) => setF({ ...f, useVat: e.target.checked })} />
                      افزودن مالیات
                      {f.useVat && <input className={`${inputCls} !w-16 !py-1.5 text-center`} dir="ltr" value={f.vat} onChange={(e) => setF({ ...f, vat: digitsOnly(e.target.value) })} />}
                      {f.useVat && <span>٪</span>}
                    </label>
                  </div>
                  <div className="rounded-xl bg-white/5 p-4 text-sm space-y-1.5">
                    <div className="flex justify-between"><span className="text-white/55">مبلغ پایه</span><span>{toman(base)}</span></div>
                    {f.useVat && <div className="flex justify-between"><span className="text-white/55">مالیات ({fa(vatPct)}٪)</span><span>{toman(vatAmount)}</span></div>}
                    <div className="flex justify-between font-black text-base pt-1.5 border-t border-white/10"><span>قابل پرداخت</span><span style={{ color: 'var(--ws)' }}>{toman(total)}</span></div>
                  </div>
                  <Btn variant="primary" disabled={creating} onClick={() => void create()} className="w-full">{creating ? 'در حال ساخت…' : 'ساخت لینک پرداخت'}</Btn>
                </div>
              </Panel>
              <Panel title="راهنما">
                <ul className="text-sm text-white/60 space-y-2 leading-7 list-disc pr-5">
                  <li>مبلغ‌ها به <b>تومان</b> ثبت می‌شوند و موقع اتصال به درگاه به ریال تبدیل می‌شوند.</li>
                  <li>حداقل ۱٬۰۰۰ و حداکثر ۵۰۰ میلیون تومان برای هر لینک.</li>
                  <li>وقتی مشتری پرداخت کند، وضعیت خودکار «پرداخت‌شده» می‌شود و کد پیگیری ثبت می‌شود.</li>
                  <li>لینک‌های پرداخت‌نشده را از تب «نمای کلی» پیگیری کنید.</li>
                </ul>
              </Panel>
            </div>
          )}

          {tab === 'list' && (
            <Panel
              title="همه‌ی تراکنش‌ها"
              actions={
                <Btn size="sm" onClick={() => downloadCsv('payments.csv', [['تاریخ', 'شرح', 'مبلغ (تومان)', 'وضعیت', 'کد پیگیری'], ...filtered.map((p) => [jDateTime(p.createdAt), p.description, p.amount, STATUS[p.status]?.label ?? p.status, p.refId ?? ''])])}>⬇ خروجی CSV</Btn>
              }
            >
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <input className={`${inputCls} max-w-xs`} placeholder="جست‌وجو در شرح، مبلغ یا کد پیگیری…" value={q} onChange={(e) => setQ(e.target.value)} />
                <Pills<Filter>
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { value: 'ALL', label: 'همه', count: items.length },
                    { value: 'PENDING', label: 'در انتظار', count: pending.length },
                    { value: 'PAID', label: 'پرداخت‌شده', count: paid.length },
                    { value: 'FAILED', label: 'ناموفق', count: failed.length },
                  ]}
                />
              </div>
              <DataTable
                rows={filtered}
                rowKey={(p) => p.id}
                empty={<Empty icon="🧾" text="تراکنشی پیدا نشد." />}
                columns={[
                  { key: 'd', header: 'تاریخ', render: (p) => <span className="text-xs">{jDateTime(p.createdAt)}</span> },
                  { key: 'n', header: 'شرح', render: (p) => p.description },
                  { key: 'a', header: 'مبلغ', render: (p) => <b>{toman(p.amount)}</b> },
                  { key: 's', header: 'وضعیت', render: (p) => <Badge color={STATUS[p.status]?.color}>{STATUS[p.status]?.label ?? p.status}</Badge> },
                  { key: 'r', header: 'کد پیگیری', render: (p) => <span className="text-xs text-white/50" dir="ltr">{p.refId ?? '—'}</span> },
                  { key: 'x', header: '', render: (p) => (p.status === 'PAID' ? null : <Btn size="sm" onClick={() => void copy(payLink(p.id), 'لینک کپی شد')}>کپی لینک</Btn>) },
                ]}
              />
            </Panel>
          )}
        </>
      )}

      <Modal open={!!created} title="لینک پرداخت آماده است" onClose={() => setCreated(null)}
        footer={<Btn variant="ghost" onClick={() => setCreated(null)}>بستن</Btn>}>
        {created && (
          <>
            <div className="text-center">
              <div className="text-white/50 text-xs">مبلغ قابل پرداخت</div>
              <div className="text-3xl font-black" style={{ color: 'var(--ws)' }}>{toman(created.amount)}</div>
            </div>
            <textarea readOnly className={inputCls} rows={5} value={created.text} />
            <div className="flex flex-wrap gap-2">
              <Btn variant="primary" onClick={() => void copy(created.text, 'پیام کپی شد')}>کپی پیام</Btn>
              <Btn onClick={() => void copy(payLink(created.id), 'لینک کپی شد')}>فقط لینک</Btn>
              {created.phone && <Btn onClick={() => window.open(waLink(created.phone, created.text), '_blank', 'noopener')}>واتس‌اپ</Btn>}
              {created.phone && <Btn onClick={() => { window.location.href = smsLink(created.phone, created.text); }}>پیامک</Btn>}
            </div>
          </>
        )}
      </Modal>
    </WorkspaceShell>
  );
}
