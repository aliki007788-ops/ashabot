'use client';

/* Workspace Kit — دستیار هوشمند هر خوشه: با اولین ربات فعال همان خوشه گفتگو می‌کند. */
import { useEffect, useRef, useState } from 'react';
import { api, extractError } from '@/lib/api';
import { Btn, Panel, inputCls } from './ui';

interface ClusterBotInfo {
  id: string;
  name: string;
  icon: string;
  isActive: boolean;
}

export function useClusterBot(slug: string) {
  const [bot, setBot] = useState<ClusterBotInfo | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'none'>('loading');
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const list = await api.get('/api/clusters');
        const c = (list.data.items as Array<{ id: string; slug: string }>).find((x) => x.slug === slug);
        if (!c) throw new Error('cluster');
        const detail = await api.get(`/api/clusters/${c.id}`);
        const bots = (detail.data.bots as ClusterBotInfo[]).filter((b) => b.isActive);
        if (!live) return;
        setBot(bots[0] ?? null);
        setState(bots[0] ? 'ready' : 'none');
      } catch {
        if (live) setState('none');
      }
    })();
    return () => {
      live = false;
    };
  }, [slug]);
  return { bot, state };
}

interface Msg {
  role: 'user' | 'assistant';
  text: string;
}

const GUIDE =
  'تو دستیار میزکار هستی. فقط با متن کوتاه، دقیق و فارسی پاسخ بده. از ابزارها برای ثبت یا تغییر چیزی استفاده نکن و فقط تحلیل و پیشنهاد بده.';

export function AssistantPanel(props: {
  slug: string;
  title?: string;
  /** خلاصه‌ی داده‌های لحظه‌ای میزکار که به ربات داده می‌شود */
  context: () => string;
  quickPrompts: string[];
  placeholder?: string;
}) {
  const { bot, state } = useClusterBot(props.slug);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const session = useRef(`ws-${props.slug}-${Math.random().toString(36).slice(2, 10)}`);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [msgs, busy]);

  async function send(q: string) {
    const question = q.trim();
    if (!question || !bot || busy) return;
    setErr('');
    setMsgs((m) => [...m, { role: 'user', text: question }]);
    setText('');
    setBusy(true);
    try {
      const message = `${GUIDE}\n\n[داده‌های لحظه‌ای میزکار]\n${props.context()}\n\n[پرسش]\n${question}`;
      const r = await api.post('/api/ai/chat', { botId: bot.id, sessionId: session.current, message });
      const answer: string = r.data.message ?? r.data.reply ?? r.data.content ?? '';
      setMsgs((m) => [...m, { role: 'assistant', text: answer || '—' }]);
    } catch (e) {
      setErr(extractError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title={props.title ?? 'دستیار هوشمند'}
      subtitle={bot ? `${bot.icon} ${bot.name}` : state === 'loading' ? 'در حال اتصال…' : 'ربات فعالی در این خوشه نیست'}
    >
      {state === 'none' ? (
        <p className="text-sm text-white/45">برای استفاده از دستیار، یک ربات این خوشه را فعال کنید و کلید هوش مصنوعی را تنظیم کنید.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {props.quickPrompts.map((q) => (
              <button
                key={q}
                disabled={busy || !bot}
                onClick={() => void send(q)}
                className="text-xs px-3 py-1.5 rounded-full border border-white/15 text-white/70 hover:text-white hover:bg-white/5 disabled:opacity-40"
              >
                {q}
              </button>
            ))}
          </div>
          {msgs.length > 0 && (
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {msgs.map((m, i) => (
                <div
                  key={i}
                  className={`text-sm rounded-xl px-3 py-2 whitespace-pre-wrap leading-7 ${m.role === 'user' ? 'bg-white/10 mr-8' : 'ml-8'}`}
                  style={m.role === 'assistant' ? { background: 'color-mix(in srgb, var(--ws) 14%, transparent)' } : undefined}
                >
                  {m.text}
                </div>
              ))}
              {busy && <div className="text-xs text-white/40">در حال فکر کردن…</div>}
              <div ref={endRef} />
            </div>
          )}
          {err && <div className="text-xs text-red-300">{err}</div>}
          <div className="flex gap-2">
            <input
              className={inputCls}
              value={text}
              placeholder={props.placeholder ?? 'از دستیار بپرسید…'}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void send(text);
              }}
            />
            <Btn variant="primary" disabled={busy || !text.trim() || !bot} onClick={() => void send(text)}>
              ارسال
            </Btn>
          </div>
        </div>
      )}
    </Panel>
  );
}
