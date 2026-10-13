'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, extractError } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader, Spinner, ErrorBox, Empty, Badge, Field, fieldCls } from '@/components/ui/kit';

type Action = { type: string; text?: string; tag?: string; stage?: string; reason?: string; url?: string };
interface Workflow { id: string; name: string; botId: string | null; triggerType: string; triggerValue: string | null; actions: Action[]; isActive: boolean; runCount: number }
interface BotLite { id: string; name: string; icon: string; userId: string | null }

const TRIGGERS: Record<string, string> = {
  KEYWORD: 'وقتی پیام شامل کلمه‌ای باشد',
  NEW_MESSAGE: 'با هر پیام جدید',
  NEW_LEAD: 'وقتی سرنخ جدید ثبت شد',
  HANDOFF: 'وقتی گفتگو به اپراتور منتقل شد',
};
const ACTIONS: Record<string, string> = {
  reply: 'پاسخ ثابت (بدون هزینه هوش مصنوعی)',
  tag: 'افزودن برچسب به مخاطب',
  set_stage: 'تغییر مرحله CRM',
  handoff: 'انتقال به اپراتور',
  webhook: 'ارسال به webhook (https)',
};

function describe(a: Action) {
  return a.type === 'reply' ? `پاسخ: «${a.text}»` : a.type === 'tag' ? `برچسب: ${a.tag}` : a.type === 'set_stage' ? `مرحله: ${a.stage}` : a.type === 'handoff' ? 'انتقال به اپراتور' : `webhook: ${a.url}`;
}

export default function WorkflowsPage() {
  const [items, setItems] = useState<Workflow[]>([]);
  const [bots, setBots] = useState<BotLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [f, setF] = useState({ name: '', botId: '', triggerType: 'KEYWORD', triggerValue: '' });
  const [actions, setActions] = useState<Action[]>([]);
  const [draft, setDraft] = useState<Action>({ type: 'reply' });

  const load = useCallback(async () => {
    try {
      const [w, b] = await Promise.all([api.get('/api/workflows'), api.get('/api/bots', { params: { limit: 200 } })]);
      setItems(w.data.items || []); setBots(b.data.items || []);
    } catch (e) { setError(extractError(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function addAction() {
    const a = { ...draft };
    if (a.type === 'reply' && !a.text?.trim()) return;
    if (a.type === 'tag' && !a.tag?.trim()) return;
    if (a.type === 'set_stage' && !a.stage) return;
    if (a.type === 'webhook' && !a.url?.trim()) return;
    setActions([...actions, a]); setDraft({ type: 'reply' });
  }
  async function save() {
    if (!f.name.trim() || actions.length === 0) return setError('نام و حداقل یک اقدام لازم است');
    try {
      setError('');
      await api.post('/api/workflows', { name: f.name, botId: f.botId || null, triggerType: f.triggerType, triggerValue: f.triggerValue || null, actions });
      setF({ name: '', botId: '', triggerType: 'KEYWORD', triggerValue: '' }); setActions([]);
      await load();
    } catch (e) { setError(extractError(e)); }
  }
  async function toggle(w: Workflow) {
    try { await api.patch(`/api/workflows/${w.id}`, { isActive: !w.isActive }); await load(); } catch (e) { setError(extractError(e)); }
  }
  async function remove(id: string) {
    if (!confirm('حذف شود؟')) return;
    try { await api.delete(`/api/workflows/${id}`); await load(); } catch (e) { setError(extractError(e)); }
  }

  if (loading) return <Spinner />;
  return (
    <div>
      <PageHeader title="اتوماسیون (بدون کد)" subtitle="قانون بسازید: «اگر این اتفاق افتاد، این کار را انجام بده». پاسخ‌های ثابت هزینه‌ی هوش مصنوعی ندارند." />
      <ErrorBox message={error} />
      <Card className="mb-6 space-y-4">
        <div className="grid md:grid-cols-3 gap-3">
          <Field label="نام قانون"><input className={fieldCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="مثلاً: پاسخ ساعت کاری" /></Field>
          <Field label="ربات">
            <select className={fieldCls} value={f.botId} onChange={(e) => setF({ ...f, botId: e.target.value })}>
              <option value="">همه ربات‌های من</option>
              {bots.filter((b) => b.userId).map((b) => <option key={b.id} value={b.id}>{b.icon} {b.name}</option>)}
            </select>
          </Field>
          <Field label="شرط">
            <select className={fieldCls} value={f.triggerType} onChange={(e) => setF({ ...f, triggerType: e.target.value })}>
              {Object.entries(TRIGGERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </div>
        {f.triggerType === 'KEYWORD' && (
          <Field label="کلمه‌ها (با کاما جدا کنید)"><input className={fieldCls} value={f.triggerValue} onChange={(e) => setF({ ...f, triggerValue: e.target.value })} placeholder="ساعت کاری, آدرس, قیمت" /></Field>
        )}
        <div>
          <div className="text-xs font-semibold text-white/70 mb-2">اقدام‌ها</div>
          {actions.map((a, i) => (
            <div key={i} className="flex items-center justify-between text-sm bg-white/5 rounded-lg px-3 py-2 mb-2">
              <span>{i + 1}. {describe(a)}</span>
              <button className="text-red-400 text-xs" onClick={() => setActions(actions.filter((_, j) => j !== i))}>حذف</button>
            </div>
          ))}
          <div className="grid md:grid-cols-[1fr_2fr_auto] gap-3 items-end">
            <select className={fieldCls} value={draft.type} onChange={(e) => setDraft({ type: e.target.value })}>
              {Object.entries(ACTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            {draft.type === 'reply' && <input className={fieldCls} placeholder="متن پاسخ" value={draft.text || ''} onChange={(e) => setDraft({ ...draft, text: e.target.value })} />}
            {draft.type === 'tag' && <input className={fieldCls} placeholder="نام برچسب" value={draft.tag || ''} onChange={(e) => setDraft({ ...draft, tag: e.target.value })} />}
            {draft.type === 'set_stage' && (
              <select className={fieldCls} value={draft.stage || ''} onChange={(e) => setDraft({ ...draft, stage: e.target.value })}>
                <option value="">مرحله...</option>
                {['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            {draft.type === 'handoff' && <input className={fieldCls} placeholder="دلیل (اختیاری)" value={draft.reason || ''} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} />}
            {draft.type === 'webhook' && <input className={fieldCls} dir="ltr" placeholder="https://..." value={draft.url || ''} onChange={(e) => setDraft({ ...draft, url: e.target.value })} />}
            <Button size="sm" variant="ghost" onClick={addAction}>+ افزودن اقدام</Button>
          </div>
        </div>
        <Button onClick={save}>ذخیره قانون</Button>
      </Card>
      {items.length === 0 ? <Empty icon="⚙️" text="هنوز قانونی نساخته‌اید." /> : (
        <div className="space-y-3">
          {items.map((w) => (
            <Card key={w.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-bold">{w.name} {w.isActive ? <Badge color="#4ade80">فعال</Badge> : <Badge color="#94a3b8">غیرفعال</Badge>}</div>
                  <div className="text-xs text-white/50 mt-1">{TRIGGERS[w.triggerType]}{w.triggerValue ? ` : ${w.triggerValue}` : ''} · {w.runCount} بار اجرا</div>
                  <div className="text-xs text-white/70 mt-2">{w.actions.map(describe).join(' ← ')}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => toggle(w)}>{w.isActive ? 'غیرفعال' : 'فعال'}</Button>
                  <Button size="sm" variant="danger" onClick={() => remove(w.id)}>حذف</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
