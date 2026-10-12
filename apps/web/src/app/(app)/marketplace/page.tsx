'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, extractError } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader, Spinner, ErrorBox, Empty, Badge, fieldCls } from '@/components/ui/kit';

interface Template {
  id: string; name: string; slug: string; icon: string; description: string | null; isPremium: boolean; tools: string;
  cluster: { name: string; slug: string; icon: string; color: string } | null;
}

export default function MarketplacePage() {
  const [items, setItems] = useState<Template[]>([]);
  const [q, setQ] = useState('');
  const [premium, setPremium] = useState(false);
  const [cluster, setCluster] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [installed, setInstalled] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get('/api/marketplace', { params: { q: q || undefined, premium: premium ? 'true' : undefined, cluster: cluster || undefined } });
      setItems(r.data.items || []);
    } catch (e) { setError(extractError(e)); } finally { setLoading(false); }
  }, [q, premium, cluster]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  async function install(id: string) {
    try { setBusy(id); setError(''); const r = await api.post(`/api/marketplace/${id}/install`); setInstalled((s) => ({ ...s, [id]: r.data.id })); }
    catch (e) { setError(extractError(e)); } finally { setBusy(null); }
  }

  const clusters = Array.from(new Map(items.filter((i) => i.cluster).map((i) => [i.cluster!.slug, i.cluster!])).values());

  if (loading) return <Spinner />;
  return (
    <div>
      <PageHeader title="فروشگاه قالب ربات‌ها" subtitle="یک قالب را با یک کلیک نصب کنید؛ نسخه‌ی اختصاصی شما ساخته می‌شود و می‌توانید پرامپت، دانش و کانال‌هایش را تنظیم کنید." />
      <ErrorBox message={error} />
      <div className="grid md:grid-cols-[1fr_220px_auto] gap-3 mb-6">
        <input className={fieldCls} placeholder="جست‌وجوی ربات..." value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={fieldCls} value={cluster} onChange={(e) => setCluster(e.target.value)}>
          <option value="">همه خوشه‌ها</option>
          {clusters.map((c) => <option key={c.slug} value={c.slug}>{c.icon} {c.name}</option>)}
        </select>
        <Button variant={premium ? 'primary' : 'ghost'} onClick={() => setPremium(!premium)}>⭐ فقط پرمیوم</Button>
      </div>
      {items.length === 0 ? <Empty icon="🛍️" text="قالبی پیدا نشد." /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((t) => {
            let tools: string[] = [];
            try { tools = JSON.parse(t.tools || '[]'); } catch { /* ignore */ }
            return (
              <Card key={t.id} className="flex flex-col">
                <div className="flex items-start justify-between">
                  <span className="text-4xl">{t.icon}</span>
                  {t.isPremium && <Badge color="#f59e0b">⭐ پرمیوم</Badge>}
                </div>
                <div className="font-bold mt-3">{t.name}</div>
                {t.cluster && <div className="text-[11px] mt-1" style={{ color: t.cluster.color }}>{t.cluster.icon} {t.cluster.name}</div>}
                <p className="text-xs text-white/60 mt-2 flex-1">{t.description}</p>
                {tools.length > 0 && <div className="flex flex-wrap gap-1 mt-3">{tools.map((x) => <Badge key={x} color="#22d3ee">{x}</Badge>)}</div>}
                <div className="mt-4">
                  {installed[t.id] ? (
                    <Link href={`/bots/${installed[t.id]}`}><Button size="sm" variant="ghost" className="w-full">✓ نصب شد — مشاهده</Button></Link>
                  ) : (
                    <Button size="sm" className="w-full" loading={busy === t.id} onClick={() => install(t.id)}>نصب برای من</Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
