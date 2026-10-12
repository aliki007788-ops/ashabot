'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, extractError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader, Spinner, ErrorBox, Empty, Badge, Field, fieldCls } from '@/components/ui/kit';

interface BotLite { id: string; name: string; icon: string; userId: string | null }
interface Case { id: string; input: string; mustContain: string | null; mustNotContain: string | null }
interface Result { id: string; input: string; output: string; error?: string; passed: boolean }

export default function EvalsPage() {
  const { user } = useAuth();
  const [bots, setBots] = useState<BotLite[]>([]);
  const [botId, setBotId] = useState('');
  const [cases, setCases] = useState<Case[]>([]);
  const [results, setResults] = useState<{ total: number; passed: number; results: Result[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [f, setF] = useState({ input: '', mustContain: '', mustNotContain: '' });

  useEffect(() => {
    api.get('/api/bots', { params: { limit: 200 } })
      .then((r) => { const mine = (r.data.items || []).filter((b: BotLite) => b.userId === user?.id); setBots(mine); if (mine[0]) setBotId(mine[0].id); })
      .catch((e) => setError(extractError(e))).finally(() => setLoading(false));
  }, [user?.id]);

  const loadCases = useCallback(async () => {
    if (!botId) return;
    try { const r = await api.get(`/api/evals/${botId}`); setCases(r.data.items || []); setResults(null); } catch (e) { setError(extractError(e)); }
  }, [botId]);
  useEffect(() => { loadCases(); }, [loadCases]);

  async function add() {
    if (!f.input.trim()) return;
    try { await api.post('/api/evals', { botId, input: f.input, mustContain: f.mustContain || undefined, mustNotContain: f.mustNotContain || undefined }); setF({ input: '', mustContain: '', mustNotContain: '' }); await loadCases(); }
    catch (e) { setError(extractError(e)); }
  }
  async function run() {
    try { setRunning(true); setError(''); const r = await api.post(`/api/evals/${botId}/run`); setResults(r.data); }
    catch (e) { setError(extractError(e)); } finally { setRunning(false); }
  }

  if (loading) return <Spinner />;
  return (
    <div>
      <PageHeader title="تست کیفیت ربات" subtitle="چند پرسش با پاسخ مورد انتظار تعریف کنید و قبل از انتشار، کیفیت ربات را بسنجید." />
      <ErrorBox message={error} />
      {bots.length === 0 ? <Empty icon="🧪" text="ربات اختصاصی ندارید. اول از «فروشگاه قالب» یک ربات نصب کنید." /> : (
        <>
          <div className="mb-4 max-w-sm">
            <select className={fieldCls} value={botId} onChange={(e) => setBotId(e.target.value)}>
              {bots.map((b) => <option key={b.id} value={b.id}>{b.icon} {b.name}</option>)}
            </select>
          </div>
          <Card className="mb-6">
            <div className="grid md:grid-cols-[2fr_1fr_1fr_auto] gap-3 items-end">
              <Field label="پرسش آزمایشی"><input className={fieldCls} value={f.input} onChange={(e) => setF({ ...f, input: e.target.value })} placeholder="ساعت کاری شما چیست؟" /></Field>
              <Field label="باید شامل باشد"><input className={fieldCls} value={f.mustContain} onChange={(e) => setF({ ...f, mustContain: e.target.value })} /></Field>
              <Field label="نباید شامل باشد"><input className={fieldCls} value={f.mustNotContain} onChange={(e) => setF({ ...f, mustNotContain: e.target.value })} /></Field>
              <Button onClick={add}>افزودن</Button>
            </div>
          </Card>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-white/60">{cases.length} مورد آزمایشی</div>
            <Button loading={running} disabled={cases.length === 0} onClick={run}>▶ اجرای همه</Button>
          </div>
          {results && (
            <div className="mb-4 text-lg font-black">
              نتیجه: <span className={results.passed === results.total ? 'text-[#4ade80]' : 'text-amber-400'}>{results.passed} از {results.total} موفق</span>
            </div>
          )}
          <div className="space-y-3">
            {cases.map((c) => {
              const r = results?.results.find((x) => x.id === c.id);
              return (
                <Card key={c.id}>
                  <div className="flex justify-between gap-3">
                    <div>
                      <div className="font-bold text-sm">{c.input}</div>
                      <div className="text-xs text-white/50 mt-1">{c.mustContain && `شامل: «${c.mustContain}» `}{c.mustNotContain && `· نباید: «${c.mustNotContain}»`}</div>
                    </div>
                    <div className="flex items-start gap-2">
                      {r && (r.passed ? <Badge color="#4ade80">موفق</Badge> : <Badge color="#f87171">ناموفق</Badge>)}
                      <button className="text-red-400 text-xs" onClick={async () => { await api.delete(`/api/evals/case/${c.id}`); loadCases(); }}>حذف</button>
                    </div>
                  </div>
                  {r && <p className="text-xs text-white/70 bg-white/5 rounded-lg p-3 mt-3 whitespace-pre-wrap">{r.error ? `خطا: ${r.error}` : r.output}</p>}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
