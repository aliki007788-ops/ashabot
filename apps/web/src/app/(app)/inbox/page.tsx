'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, extractError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { PageHeader, Spinner, ErrorBox, Empty, Badge, fieldCls, formatDate } from '@/components/ui/kit';

interface Conv {
  id: string; status: string; needsHuman: boolean; handoffReason: string | null; title: string | null; updatedAt: string;
  bot: { id: string; name: string; icon: string };
  _count: { messages: number };
  messages: { content: string; role: string }[];
}
interface Msg { id: string; role: string; content: string; createdAt: string }

export default function InboxPage() {
  const [items, setItems] = useState<Conv[]>([]);
  const [waiting, setWaiting] = useState(0);
  const [filter, setFilter] = useState<'' | 'HUMAN' | 'BOT' | 'CLOSED'>('HUMAN');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const bottom = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    try {
      const r = await api.get('/api/inbox', { params: filter ? { status: filter } : {} });
      setItems(r.data.items || []); setWaiting(r.data.waiting || 0);
    } catch (e) { setError(extractError(e)); } finally { setLoading(false); }
  }, [filter]);

  const loadThread = useCallback(async (id: string) => {
    try { const r = await api.get(`/api/inbox/${id}`); setMessages(r.data.messages || []); } catch (e) { setError(extractError(e)); }
  }, []);

  useEffect(() => { loadList(); const t = setInterval(loadList, 6000); return () => clearInterval(t); }, [loadList]);
  useEffect(() => {
    if (!selected) return;
    loadThread(selected);
    const t = setInterval(() => loadThread(selected), 4000);
    return () => clearInterval(t);
  }, [selected, loadThread]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const current = items.find((c) => c.id === selected);

  async function act(path: string, body?: object) {
    if (!selected) return;
    try { setError(''); await api.post(`/api/inbox/${selected}/${path}`, body); await Promise.all([loadList(), loadThread(selected)]); }
    catch (e) { setError(extractError(e)); }
  }
  async function send() {
    if (!text.trim()) return;
    const m = text; setText('');
    await act('reply', { message: m });
  }

  if (loading) return <Spinner />;
  return (
    <div>
      <PageHeader title="صندوق گفتگو" subtitle={`${waiting} گفتگو منتظر پاسخ اپراتور`} />
      <ErrorBox message={error} />
      <div className="flex gap-2 mb-4">
        {([['HUMAN', 'نیازمند اپراتور'], ['BOT', 'دست ربات'], ['CLOSED', 'بسته‌شده'], ['', 'همه']] as const).map(([v, l]) => (
          <Button key={v} size="sm" variant={filter === v ? 'primary' : 'ghost'} onClick={() => setFilter(v as any)}>{l}</Button>
        ))}
      </div>
      <div className="grid md:grid-cols-[340px_1fr] gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-y-auto max-h-[70vh]">
          {items.length === 0 ? <Empty text="گفتگویی نیست." /> : items.map((c) => (
            <button key={c.id} onClick={() => setSelected(c.id)} className={'w-full text-right p-3 border-b border-white/5 hover:bg-white/5 transition ' + (selected === c.id ? 'bg-white/10' : '')}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-sm">{c.bot.icon} {c.bot.name}</span>
                {c.needsHuman ? <Badge color="#f59e0b">منتظر</Badge> : c.status === 'HUMAN' ? <Badge color="#22d3ee">اپراتور</Badge> : c.status === 'CLOSED' ? <Badge color="#94a3b8">بسته</Badge> : <Badge color="#4ade80">ربات</Badge>}
              </div>
              <p className="text-xs text-white/50 mt-1 line-clamp-1">{c.messages[0]?.content || '—'}</p>
              <p className="text-[10px] text-white/30 mt-1">{formatDate(c.updatedAt)} · {c._count.messages} پیام</p>
            </button>
          ))}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] flex flex-col min-h-[50vh] max-h-[70vh]">
          {!selected ? <Empty icon="💬" text="یک گفتگو را انتخاب کنید" /> : (
            <>
              <div className="p-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm">
                  <b>{current?.bot.icon} {current?.bot.name}</b>
                  {current?.handoffReason && <span className="text-xs text-amber-400 mr-2">دلیل انتقال: {current.handoffReason}</span>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => act('resume-bot')}>برگرداندن به ربات</Button>
                  <Button size="sm" variant="outline" onClick={() => act('close')}>بستن</Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m) => {
                  const mine = m.role === 'HUMAN';
                  const user = m.role === 'USER';
                  return (
                    <div key={m.id} className={'flex ' + (user ? 'justify-start' : 'justify-end')}>
                      <div className={'max-w-[75%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ' + (user ? 'bg-white/10' : mine ? 'bg-[#22d3ee]/20 border border-[#22d3ee]/30' : 'bg-[#6a8dff]/20 border border-[#6a8dff]/30')}>
                        <div className="text-[10px] text-white/40 mb-1">{user ? 'مشتری' : mine ? 'اپراتور' : 'ربات'} · {formatDate(m.createdAt)}</div>
                        {m.content}
                      </div>
                    </div>
                  );
                })}
                <div ref={bottom} />
              </div>
              <div className="p-3 border-t border-white/10 flex gap-2">
                <input className={fieldCls} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="پاسخ اپراتور..." />
                <Button onClick={send}>ارسال</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
