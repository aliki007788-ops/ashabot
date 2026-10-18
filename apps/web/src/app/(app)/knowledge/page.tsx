'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, extractError } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader, Spinner, ErrorBox, Empty, Field, fieldCls, formatDate } from '@/components/ui/kit';

interface KB { id: string; name: string; description: string | null; botId: string | null; createdAt: string; _count: { documents: number; chunks: number } }
interface Doc { id: string; title: string; sourceType: string; sourceUrl: string | null; chunkCount: number; createdAt: string }
interface BotLite { id: string; name: string; icon: string; userId: string | null }

export default function KnowledgePage() {
  const [kbs, setKbs] = useState<KB[]>([]);
  const [bots, setBots] = useState<BotLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [botId, setBotId] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [k, b] = await Promise.all([api.get('/api/knowledge'), api.get('/api/bots', { params: { limit: 200 } })]);
      setKbs(k.data.items || []);
      setBots(b.data.items || []);
    } catch (e) { setError(extractError(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!name.trim()) return;
    try {
      setError('');
      await api.post('/api/knowledge', { name, botId: botId || undefined });
      setName(''); setBotId('');
      await load();
    } catch (e) { setError(extractError(e)); }
  }
  async function remove(id: string) {
    if (!confirm('این پایگاه دانش و همه اسنادش حذف شود؟')) return;
    try { await api.delete(`/api/knowledge/${id}`); if (openId === id) setOpenId(null); await load(); }
    catch (e) { setError(extractError(e)); }
  }

  if (loading) return <Spinner />;
  return (
    <div>
      <PageHeader
        title="پایگاه دانش"
        subtitle="سند، متن یا آدرس سایت اضافه کنید؛ ربات فقط از روی همین‌ها و با دقت پاسخ می‌دهد (RAG)"
      />
      <ErrorBox message={error} />
      <Card className="mb-6">
        <div className="grid md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <Field label="نام پایگاه دانش"><input className={fieldCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً: سؤالات متداول فروشگاه" /></Field>
          <Field label="اتصال به ربات (اختیاری)">
            <select className={fieldCls} value={botId} onChange={(e) => setBotId(e.target.value)}>
              <option value="">برای همه ربات‌های من</option>
              {bots.filter((b) => b.userId).map((b) => <option key={b.id} value={b.id}>{b.icon} {b.name}</option>)}
            </select>
          </Field>
          <Button onClick={create}>ساخت</Button>
        </div>
        <p className="text-xs text-white/40 mt-3">برای اتصال به یک ربات، اول آن را از «فروشگاه قالب» نصب کنید یا خودتان بسازید.</p>
      </Card>

      {kbs.length === 0 ? <Empty icon="📚" text="هنوز پایگاه دانشی نساخته‌اید." /> : (
        <div className="space-y-4">
          {kbs.map((kb) => (
            <Card key={kb.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-bold">{kb.name}</div>
                  <div className="text-xs text-white/50 mt-1">
                    {kb._count.documents} سند · {kb._count.chunks} تکه · {kb.botId ? 'متصل به یک ربات' : 'برای همه ربات‌ها'} · {formatDate(kb.createdAt)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setOpenId(openId === kb.id ? null : kb.id)}>{openId === kb.id ? 'بستن' : 'مدیریت اسناد'}</Button>
                  <Button size="sm" variant="danger" onClick={() => remove(kb.id)}>حذف</Button>
                </div>
              </div>
              {openId === kb.id && <KbDetail id={kb.id} onChanged={load} />}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function KbDetail({ id, onChanged }: { id: string; onChanged: () => void }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<{ title: string; content: string; score: number }[] | null>(null);

  const loadDocs = useCallback(async () => {
    try { const r = await api.get(`/api/knowledge/${id}/documents`); setDocs(r.data.items || []); }
    catch (e) { setErr(extractError(e)); }
  }, [id]);
  useEffect(() => { loadDocs(); }, [loadDocs]);

  async function run<T>(fn: () => Promise<T>) {
    try { setBusy(true); setErr(''); await fn(); await loadDocs(); onChanged(); }
    catch (e) { setErr(extractError(e)); } finally { setBusy(false); }
  }

  return (
    <div className="mt-5 border-t border-white/10 pt-5 space-y-5">
      <ErrorBox message={err} />
      <div className="grid md:grid-cols-2 gap-5">
        <div className="space-y-3">
          <div className="font-bold text-sm">افزودن متن</div>
          <input className={fieldCls} placeholder="عنوان سند" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className={fieldCls + ' min-h-[140px]'} placeholder="متن را اینجا بچسبانید (قوانین، قیمت‌ها، توضیح محصول، ...)" value={content} onChange={(e) => setContent(e.target.value)} />
          <Button size="sm" loading={busy} onClick={() => run(async () => { await api.post(`/api/knowledge/${id}/documents`, { title: title || 'بدون عنوان', content }); setTitle(''); setContent(''); })}>افزودن متن</Button>
        </div>
        <div className="space-y-3">
          <div className="font-bold text-sm">افزودن از آدرس سایت</div>
          <input className={fieldCls} dir="ltr" placeholder="https://example.com/faq" value={url} onChange={(e) => setUrl(e.target.value)} />
          <Button size="sm" loading={busy} onClick={() => run(async () => { await api.post(`/api/knowledge/${id}/documents/url`, { url }); setUrl(''); })}>دریافت و افزودن</Button>
          <div className="font-bold text-sm pt-3">آزمایش جست‌وجو</div>
          <div className="flex gap-2">
            <input className={fieldCls} placeholder="یک سؤال بپرسید" value={q} onChange={(e) => setQ(e.target.value)} />
            <Button size="sm" variant="ghost" onClick={async () => { try { const r = await api.post(`/api/knowledge/${id}/search`, { query: q }); setHits(r.data.results); } catch (e) { setErr(extractError(e)); } }}>جست‌وجو</Button>
          </div>
          {hits && (hits.length === 0 ? <p className="text-xs text-white/40">نتیجه‌ای پیدا نشد.</p> : hits.map((h, i) => (
            <div key={i} className="text-xs bg-white/5 rounded-lg p-3"><b>{h.title}</b> <span className="text-white/40">({h.score.toFixed(2)})</span><p className="mt-1 text-white/70 line-clamp-3">{h.content}</p></div>
          )))}
        </div>
      </div>
      <div>
        <div className="font-bold text-sm mb-2">اسناد</div>
        {docs.length === 0 ? <p className="text-xs text-white/40">سندی ثبت نشده.</p> : (
          <ul className="divide-y divide-white/10">
            {docs.map((d) => (
              <li key={d.id} className="py-2 flex items-center justify-between text-sm">
                <span>{d.title} <span className="text-white/40 text-xs">· {d.chunkCount} تکه · {d.sourceType}</span></span>
                <button className="text-red-400 text-xs hover:underline" onClick={() => run(() => api.delete(`/api/knowledge/${id}/documents/${d.id}`))}>حذف</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
