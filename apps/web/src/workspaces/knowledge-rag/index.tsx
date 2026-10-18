'use client';

import { useEffect, useRef, useState } from 'react';
import { api, extractError } from '@/lib/api';
import {
  AssistantPanel,
  Badge,
  Btn,
  DataTable,
  Empty,
  ErrorBanner,
  Field,
  Modal,
  Notice,
  Panel,
  ProgressBar,
  Spinner,
  StatCard,
  ProcessConsole,
  WorkspaceShell,
  inboxSource,
  mergeSources,
  fa,
  inputCls,
  jDateTime,
  jTime,
  pct,
  useAsync,
  useInterval,
  useToast,
} from './_kit';
import type { AutoSource, BotIndex } from './_kit';
import { manifest } from './manifest';
import { processDef } from './process';

interface KB {
  id: string;
  name: string;
  description: string | null;
  botId: string | null;
  createdAt: string;
  _count: { documents: number; chunks: number };
}
interface Doc {
  id: string;
  title: string;
  sourceType: string | null;
  sourceUrl: string | null;
  chunkCount: number;
  createdAt: string;
}
interface Hit {
  content: string;
  title: string;
  score: number;
}
interface Conv {
  id: string;
  status: string;
  needsHuman: boolean;
  handoffReason: string | null;
  updatedAt: string;
  bot: { name: string; icon: string };
  _count: { messages: number };
  messages: Array<{ content: string; role: string; createdAt: string }>;
}
interface Msg {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}
interface Gap {
  question: string;
  at: number;
}

/** رویداد واقعی: گفتگوهای تازه‌ی مشتری با ربات‌های دانش‌محور */
const makeSource = (bots: BotIndex): AutoSource => mergeSources(inboxSource(processDef.stages.map((s) => s.bot), bots));

export default function KnowledgeWorkspace(props: { embedded?: boolean }) {
  const [tab, setTab] = useState('process');
  const [toast, say] = useToast();

  const kbs = useAsync<KB[]>(async () => (await api.get('/api/knowledge')).data.items as KB[]);
  const [kbId, setKbId] = useState<string>('');
  const inbox = useAsync<{ items: Conv[]; waiting: number }>(async () => (await api.get('/api/inbox')).data as { items: Conv[]; waiting: number });
  useInterval(() => void inbox.reload(true), 15000);

  const kbList = kbs.data ?? [];
  useEffect(() => {
    if (!kbId && kbList[0]) setKbId(kbList[0].id);
    if (kbId && kbList.length && !kbList.find((k) => k.id === kbId)) setKbId(kbList[0].id);
  }, [kbList, kbId]);
  const kb = kbList.find((k) => k.id === kbId);

  const totalDocs = kbList.reduce((a, k) => a + k._count.documents, 0);
  const totalChunks = kbList.reduce((a, k) => a + k._count.chunks, 0);
  const waiting = inbox.data?.waiting ?? 0;

  /* ───── منابع ───── */
  const docs = useAsync<Doc[]>(async () => (kbId ? ((await api.get(`/api/knowledge/${kbId}/documents`)).data.items as Doc[]) : []), [kbId]);
  const [kbModal, setKbModal] = useState(false);
  const [kbForm, setKbForm] = useState({ name: '', description: '' });
  const [docModal, setDocModal] = useState<null | 'text' | 'url'>(null);
  const [docForm, setDocForm] = useState({ title: '', content: '', url: '' });
  const [busy, setBusy] = useState(false);
  const [modalErr, setModalErr] = useState('');

  async function createKb() {
    if (!kbForm.name.trim()) return setModalErr('نام پایگاه را بنویسید');
    setBusy(true);
    setModalErr('');
    try {
      const r = await api.post('/api/knowledge', { name: kbForm.name.trim(), description: kbForm.description.trim() || undefined });
      setKbModal(false);
      setKbForm({ name: '', description: '' });
      await kbs.reload(true);
      setKbId((r.data as KB).id);
      say('پایگاه دانش ساخته شد ✓');
    } catch (e) {
      setModalErr(extractError(e));
    } finally {
      setBusy(false);
    }
  }
  async function removeKb() {
    if (!kb || !confirm(`پایگاه «${kb.name}» با همه‌ی منابعش حذف شود؟`)) return;
    try {
      await api.delete(`/api/knowledge/${kb.id}`);
      setKbId('');
      await kbs.reload(true);
      say('حذف شد');
    } catch (e) {
      say(extractError(e), 'err');
    }
  }
  async function addDoc() {
    if (!kbId) return;
    setBusy(true);
    setModalErr('');
    try {
      if (docModal === 'url') {
        if (!docForm.url.trim()) throw new Error('آدرس صفحه را وارد کنید');
        await api.post(`/api/knowledge/${kbId}/documents/url`, { url: docForm.url.trim() });
      } else {
        if (!docForm.title.trim() || !docForm.content.trim()) throw new Error('عنوان و متن الزامی است');
        await api.post(`/api/knowledge/${kbId}/documents`, { title: docForm.title.trim(), content: docForm.content, sourceType: 'text' });
      }
      setDocModal(null);
      setDocForm({ title: '', content: '', url: '' });
      await Promise.all([docs.reload(true), kbs.reload(true)]);
      say('منبع افزوده و برای جست‌وجو آماده شد ✓');
    } catch (e) {
      setModalErr(e instanceof Error && !('response' in e) ? e.message : extractError(e));
    } finally {
      setBusy(false);
    }
  }
  async function removeDoc(id: string) {
    if (!confirm('این منبع حذف شود؟')) return;
    try {
      await api.delete(`/api/knowledge/${kbId}/documents/${id}`);
      await Promise.all([docs.reload(true), kbs.reload(true)]);
      say('منبع حذف شد');
    } catch (e) {
      say(extractError(e), 'err');
    }
  }

  /* ───── آزمایشگاه پرسش ───── */
  const [question, setQuestion] = useState('');
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState('');
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [tested, setTested] = useState(0);

  async function ask(qText?: string) {
    const text = (qText ?? question).trim();
    if (!text || !kbId) return;
    setSearching(true);
    setSearchErr('');
    try {
      const r = await api.post(`/api/knowledge/${kbId}/search`, { query: text });
      const results = r.data.results as Hit[];
      setHits(results);
      setTested((n) => n + 1);
      if (results.length === 0) setGaps((g) => (g.find((x) => x.question === text) ? g : [{ question: text, at: Date.now() }, ...g].slice(0, 30)));
      else setGaps((g) => g.filter((x) => x.question !== text));
    } catch (e) {
      setSearchErr(extractError(e));
    } finally {
      setSearching(false);
    }
  }

  /* ───── صف انسان ───── */
  const [openConv, setOpenConv] = useState<string>('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [reply, setReply] = useState('');
  const bottom = useRef<HTMLDivElement | null>(null);
  async function loadConv(id: string) {
    try {
      setMsgs(((await api.get(`/api/inbox/${id}`)).data.messages as Msg[]) ?? []);
    } catch (e) {
      say(extractError(e), 'err');
    }
  }
  useEffect(() => {
    if (openConv) void loadConv(openConv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openConv]);
  useInterval(() => { if (openConv) void loadConv(openConv); }, openConv ? 6000 : null);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [msgs.length]);

  async function sendReply() {
    if (!openConv || !reply.trim()) return;
    try {
      await api.post(`/api/inbox/${openConv}/reply`, { message: reply.trim() });
      setReply('');
      await Promise.all([loadConv(openConv), inbox.reload(true)]);
    } catch (e) {
      say(extractError(e), 'err');
    }
  }
  async function convAction(kind: 'resume-bot' | 'close') {
    if (!openConv) return;
    try {
      await api.post(`/api/inbox/${openConv}/${kind}`, {});
      say(kind === 'close' ? 'گفتگو بسته شد' : 'گفتگو به ربات برگشت ✓');
      if (kind === 'close') setOpenConv('');
      await inbox.reload(true);
    } catch (e) {
      say(extractError(e), 'err');
    }
  }
  const queue = (inbox.data?.items ?? []).filter((c) => c.needsHuman || c.status === 'HUMAN');

  const aiContext = () =>
    `پایگاه‌های دانش: ${fa(kbList.length)} | منابع: ${fa(totalDocs)} | قطعه‌های قابل جست‌وجو: ${fa(totalChunks)} | گفتگوهای منتظر اپراتور: ${fa(waiting)}\n` +
    `شکاف‌های دانش (پرسش‌هایی که پاسخ پیدا نکردند): ${gaps.map((g) => g.question).join(' | ') || '—'}\n` +
    `دلیل‌های تحویل به انسان: ${queue.map((c) => c.handoffReason ?? '—').join(' | ') || '—'}`;

  const coverage = tested ? ((tested - gaps.length) / tested) * 100 : 0;

  return (
    <WorkspaceShell
      embedded={props.embedded}
      icon={manifest.icon}
      title={manifest.title}
      subtitle={manifest.tagline}
      accent={manifest.accent}
      tabs={[
        { id: 'process', label: '🧭 فرایند زنده' },
        { id: 'sources', label: 'منابع دانش', badge: totalDocs },
        { id: 'lab', label: 'آزمایشگاه پرسش' },
        { id: 'queue', label: 'صف اپراتور', badge: waiting },
      ]}
      tab={tab}
      onTab={setTab}
      actions={<Btn variant="primary" onClick={() => { setModalErr(''); setKbModal(true); }}>+ پایگاه جدید</Btn>}
    >
      {toast}
      <ErrorBanner message={kbs.error} onRetry={() => void kbs.reload()} />
      {tab === 'process' ? (
        <ProcessConsole slug={manifest.slug} def={processDef} makeSource={makeSource} />
      ) : kbs.loading && !kbs.data ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon="🗂️" label="پایگاه‌های دانش" value={fa(kbList.length)} />
            <StatCard icon="📄" label="منابع" value={fa(totalDocs)} hint="متن و صفحه وب" />
            <StatCard icon="🧩" label="قطعه‌های قابل جست‌وجو" value={fa(totalChunks)} tone={totalChunks ? 'ok' : 'warn'} hint={totalChunks ? 'ربات از اینها پاسخ می‌دهد' : 'ابتدا منبع اضافه کنید'} />
            <StatCard icon="🙋" label="منتظر اپراتور" value={fa(waiting)} tone={waiting ? 'bad' : 'ok'} hint="گفتگوهایی که ربات واگذار کرده" />
          </div>

          {tab === 'sources' && (
            kbList.length === 0 ? (
              <Panel><Empty icon="📚" text="هنوز پایگاه دانشی نساخته‌اید. اولین پایگاه را بسازید و منابع را اضافه کنید." action={<Btn variant="primary" onClick={() => setKbModal(true)}>ساخت پایگاه دانش</Btn>} /></Panel>
            ) : (
              <div className="grid lg:grid-cols-[260px_1fr] gap-4">
                <Panel title="پایگاه‌ها" pad={false}>
                  <ul className="p-2 space-y-1">
                    {kbList.map((k) => (
                      <li key={k.id}>
                        <button onClick={() => setKbId(k.id)} className={`w-full text-right rounded-xl px-3 py-2.5 transition ${k.id === kbId ? '' : 'hover:bg-white/5'}`} style={k.id === kbId ? { background: 'color-mix(in srgb, var(--ws) 18%, transparent)' } : undefined}>
                          <div className="font-bold text-sm">{k.name}</div>
                          <div className="text-[11px] text-white/45">{fa(k._count.documents)} منبع · {fa(k._count.chunks)} قطعه{k.botId ? ' · متصل به ربات' : ''}</div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </Panel>
                <Panel
                  title={kb ? kb.name : 'منابع'}
                  subtitle={kb?.description ?? undefined}
                  actions={kb && (
                    <>
                      <Btn size="sm" variant="primary" onClick={() => { setModalErr(''); setDocForm({ title: '', content: '', url: '' }); setDocModal('text'); }}>+ متن</Btn>
                      <Btn size="sm" onClick={() => { setModalErr(''); setDocForm({ title: '', content: '', url: '' }); setDocModal('url'); }}>+ صفحه وب</Btn>
                      <Btn size="sm" variant="danger" onClick={() => void removeKb()}>حذف پایگاه</Btn>
                    </>
                  )}
                >
                  {docs.loading ? <Spinner /> : (
                    <DataTable
                      rows={docs.data ?? []}
                      rowKey={(d) => d.id}
                      empty={<Empty icon="📄" text="این پایگاه هنوز منبعی ندارد. متن یا آدرس صفحه وب را اضافه کنید." />}
                      columns={[
                        { key: 't', header: 'عنوان', render: (d) => (<><div className="font-bold">{d.title}</div>{d.sourceUrl && <div className="text-[11px] text-white/40 truncate max-w-[280px]" dir="ltr">{d.sourceUrl}</div>}</>) },
                        { key: 'k', header: 'نوع', render: (d) => <Badge tone={d.sourceType === 'url' ? 'info' : 'mute'}>{d.sourceType === 'url' ? 'صفحه وب' : 'متن'}</Badge> },
                        { key: 'c', header: 'قطعه', render: (d) => fa(d.chunkCount) },
                        { key: 'd', header: 'افزوده‌شده', render: (d) => <span className="text-xs text-white/50">{jDateTime(d.createdAt)}</span> },
                        { key: 'x', header: '', render: (d) => <Btn size="sm" variant="danger" onClick={() => void removeDoc(d.id)}>حذف</Btn> },
                      ]}
                    />
                  )}
                </Panel>
              </div>
            )
          )}

          {tab === 'lab' && (
            <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
              <div className="space-y-4">
                <Panel title="آزمایشگاه پرسش" subtitle="ببینید ربات برای یک سؤال مشتری چه منبعی پیدا می‌کند. جست‌وجو روی پایگاه‌های بدون ربات شما انجام می‌شود.">
                  <div className="flex gap-2">
                    <input className={inputCls} placeholder="سؤال مشتری را بنویسید…" value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void ask(); }} disabled={!kbId} />
                    <Btn variant="primary" disabled={searching || !question.trim() || !kbId} onClick={() => void ask()}>{searching ? '…' : 'جست‌وجو'}</Btn>
                  </div>
                  {!kbId && <p className="text-xs text-white/40 mt-2">ابتدا یک پایگاه دانش بسازید.</p>}
                  {searchErr && <div className="mt-3"><Notice tone="bad">{searchErr}</Notice></div>}
                  {hits && (
                    <div className="mt-4 space-y-3">
                      {hits.length === 0 ? (
                        <Notice tone="warn">پاسخی پیدا نشد؛ یعنی ربات برای این سؤال به منبع تکیه نمی‌کند. این پرسش به «شکاف‌های دانش» اضافه شد.</Notice>
                      ) : (
                        hits.map((h, i) => (
                          <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                            <div className="flex items-center justify-between gap-3 mb-1.5">
                              <b className="text-sm">{h.title}</b>
                              <Badge tone={h.score > 0.5 ? 'ok' : h.score > 0.3 ? 'warn' : 'mute'}>تطابق {pct(Math.min(1, h.score) * 100)}</Badge>
                            </div>
                            <p className="text-sm text-white/65 leading-7 whitespace-pre-wrap">{h.content.length > 420 ? `${h.content.slice(0, 420)}…` : h.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </Panel>
                <Panel title="شکاف‌های دانش" subtitle="پرسش‌هایی که در این نشست پاسخ پیدا نکردند — منبع تازه اضافه کنید.">
                  {gaps.length === 0 ? (
                    <p className="text-sm text-white/45">{tested ? 'عالی! همه‌ی پرسش‌های آزمایش‌شده پاسخ داشتند.' : 'هنوز پرسشی آزمایش نشده است.'}</p>
                  ) : (
                    <ul className="space-y-2">
                      {gaps.map((g) => (
                        <li key={g.at} className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2">
                          <span className="text-sm">{g.question}</span>
                          <Btn size="sm" variant="primary" onClick={() => { setTab('sources'); setModalErr(''); setDocForm({ title: g.question, content: '', url: '' }); setDocModal('text'); }}>افزودن پاسخ</Btn>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </div>
              <div className="space-y-4">
                <Panel title="پوشش دانش این نشست">
                  <ProgressBar value={tested - gaps.length} max={tested || 1} color={coverage >= 80 ? '#4ade80' : coverage >= 50 ? '#f59e0b' : '#f87171'} label={tested ? `${pct(coverage)} از ${fa(tested)} پرسش پاسخ داشتند` : 'با چند پرسش واقعی مشتریان شروع کنید'} />
                </Panel>
                <AssistantPanel slug={manifest.slug} title="دستیار دانش" context={aiContext} quickPrompts={['چه منابعی باید اضافه کنم؟', 'برای شکاف‌های دانش پاسخ پیش‌نویس بنویس', 'بر اساس دلیل‌های تحویل، چه چیزی کم است؟']} />
              </div>
            </div>
          )}

          {tab === 'queue' && (
            <div className="grid lg:grid-cols-[320px_1fr] gap-4">
              <Panel title="گفتگوهای منتظر" pad={false}>
                {queue.length === 0 ? <Empty icon="🎉" text="گفتگوی منتظری نیست." /> : (
                  <ul className="p-2 space-y-1 max-h-[460px] overflow-y-auto">
                    {queue.map((c) => (
                      <li key={c.id}>
                        <button onClick={() => setOpenConv(c.id)} className={`w-full text-right rounded-xl px-3 py-2.5 transition ${c.id === openConv ? '' : 'hover:bg-white/5'}`} style={c.id === openConv ? { background: 'color-mix(in srgb, var(--ws) 18%, transparent)' } : undefined}>
                          <div className="flex items-center justify-between"><b className="text-sm">{c.bot.icon} {c.bot.name}</b>{c.needsHuman && <Badge tone="bad">منتظر شما</Badge>}</div>
                          <div className="text-xs text-white/50 line-clamp-1 mt-1">{c.messages[0]?.content ?? '—'}</div>
                          {c.handoffReason && <div className="text-[11px] text-amber-300/80 mt-0.5">دلیل: {c.handoffReason}</div>}
                          <div className="text-[10px] text-white/30 mt-0.5">{jDateTime(c.updatedAt)} · {fa(c._count.messages)} پیام</div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
              <Panel title={openConv ? 'گفتگو' : 'یک گفتگو را انتخاب کنید'}
                actions={openConv ? (<><Btn size="sm" onClick={() => void convAction('resume-bot')}>برگردان به ربات</Btn><Btn size="sm" variant="danger" onClick={() => void convAction('close')}>بستن</Btn></>) : undefined}>
                {!openConv ? <Empty icon="💬" text="از لیست سمت راست یک گفتگو را باز کنید." /> : (
                  <div className="space-y-3">
                    <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
                      {msgs.map((m) => {
                        const mine = m.role === 'HUMAN';
                        const user = m.role === 'USER';
                        return (
                          <div key={m.id} className={`flex ${user ? 'justify-start' : 'justify-end'}`}>
                            <div className="max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-7 whitespace-pre-wrap" style={mine ? { background: 'var(--ws)', color: '#07122e' } : { background: 'rgba(255,255,255,.08)' }}>
                              <div className="text-[10px] opacity-60 mb-0.5">{user ? 'مشتری' : mine ? 'اپراتور' : 'ربات'} · {jTime(m.createdAt)}</div>
                              {m.content}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={bottom} />
                    </div>
                    <div className="flex gap-2">
                      <input className={inputCls} placeholder="پاسخ شما به مشتری…" value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void sendReply(); }} />
                      <Btn variant="primary" disabled={!reply.trim()} onClick={() => void sendReply()}>ارسال</Btn>
                    </div>
                    <p className="text-[11px] text-white/35">با ارسال پاسخ، گفتگو در حالت «اپراتور» می‌ماند تا خودتان آن را به ربات برگردانید.</p>
                  </div>
                )}
              </Panel>
            </div>
          )}
        </>
      )}

      <Modal open={kbModal} title="پایگاه دانش جدید" onClose={() => setKbModal(false)}
        footer={<><Btn variant="ghost" onClick={() => setKbModal(false)}>انصراف</Btn><Btn variant="primary" disabled={busy} onClick={() => void createKb()}>ساخت</Btn></>}>
        {modalErr && <Notice tone="bad">{modalErr}</Notice>}
        <Field label="نام پایگاه *"><input className={inputCls} value={kbForm.name} onChange={(e) => setKbForm({ ...kbForm, name: e.target.value })} placeholder="مثلاً سؤالات متداول فروشگاه" /></Field>
        <Field label="توضیح"><input className={inputCls} value={kbForm.description} onChange={(e) => setKbForm({ ...kbForm, description: e.target.value })} /></Field>
      </Modal>

      <Modal open={docModal !== null} title={docModal === 'url' ? 'افزودن صفحه وب' : 'افزودن متن'} onClose={() => setDocModal(null)}
        footer={<><Btn variant="ghost" onClick={() => setDocModal(null)}>انصراف</Btn><Btn variant="primary" disabled={busy} onClick={() => void addDoc()}>{busy ? 'در حال پردازش…' : 'افزودن'}</Btn></>}>
        {modalErr && <Notice tone="bad">{modalErr}</Notice>}
        {docModal === 'url' ? (
          <Field label="آدرس صفحه (https) *" hint="فقط آدرس‌های عمومی https پذیرفته می‌شود."><input className={inputCls} dir="ltr" value={docForm.url} onChange={(e) => setDocForm({ ...docForm, url: e.target.value })} placeholder="https://…" /></Field>
        ) : (
          <>
            <Field label="عنوان *"><input className={inputCls} value={docForm.title} onChange={(e) => setDocForm({ ...docForm, title: e.target.value })} /></Field>
            <Field label="متن *" hint="سیاست‌ها، سؤالات متداول، مشخصات محصول…"><textarea className={inputCls} rows={8} value={docForm.content} onChange={(e) => setDocForm({ ...docForm, content: e.target.value })} /></Field>
          </>
        )}
      </Modal>
    </WorkspaceShell>
  );
}
