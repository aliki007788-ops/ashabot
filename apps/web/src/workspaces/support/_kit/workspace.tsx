'use client';

/* Workspace Kit — میزکار عمومی فرایندمحور: فرایند زنده + ربات‌های خوشه + دستیار. برای خوشه‌های بدون میزکار سفارشی. */
import { useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '@/lib/api';
import { AssistantPanel } from './assistant';
import { ProcessConsole } from './process-ui';
import type { AutoSource, BotIndex, Executor, ProcessDef } from './process';
import { Badge, Empty, ErrorBanner, Panel, Spinner, WorkspaceShell } from './ui';
import type { Tone } from './ui';
import { useAsync, useInterval } from './hooks';
import { jTime } from './format';
import type { WorkspaceManifest } from './types';

interface BotStatus {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string | null;
  isActive: boolean;
  runStatus: string;
  lastTask: string | null;
  lastRunAt: string | null;
}

const RUN: Record<string, { label: string; tone: Tone }> = {
  ACTIVE: { label: 'در حال کار', tone: 'ok' },
  QUEUED: { label: 'در صف', tone: 'warn' },
  IDLE: { label: 'آماده', tone: 'mute' },
  DISABLED: { label: 'غیرفعال', tone: 'bad' },
  FAILED: { label: 'خطا', tone: 'bad' },
};

/** فهرست ربات‌های خوشه و نقش هرکدام در فرایند */
export function ClusterBots(props: { slug: string; def: ProcessDef }) {
  const { data, loading, error, reload } = useAsync<BotStatus[]>(async () => (await api.get(`/api/clusters/${props.slug}/bots-status`)).data, [props.slug]);
  useInterval(() => void reload(true), 15000);
  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} onRetry={() => void reload()} />;
  const bots = data ?? [];
  const role = (slug: string): string | null => {
    const i = props.def.stages.findIndex((s) => s.bot === slug);
    return i >= 0 ? `مرحله‌ی ${i + 1}: ${props.def.stages[i].title}` : null;
  };
  if (!bots.length) return <Empty icon="🤖" text="این خوشه ربات ندارد." />;
  const sorted = [...bots].sort((a, b) => Number(Boolean(role(b.slug))) - Number(Boolean(role(a.slug))));
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
      {sorted.map((b) => {
        const st = RUN[b.runStatus] ?? RUN.IDLE;
        const r = role(b.slug);
        return (
          <div key={b.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="font-extrabold text-sm">
                {b.icon} {b.name}
              </div>
              <Badge tone={st.tone}>{st.label}</Badge>
            </div>
            <p className="text-xs text-white/50 mt-1.5 leading-6 line-clamp-2">{b.description ?? '—'}</p>
            <div className="mt-2 text-[11px]" style={{ color: r ? 'var(--ws)' : 'rgba(255,255,255,.35)' }}>
              {r ?? 'ربات پشتیبان (خارج از مسیر اصلی فرایند)'}
            </div>
            {b.lastRunAt && <div className="text-[10px] text-white/30 mt-1">آخرین فعالیت: {jTime(new Date(b.lastRunAt))}</div>}
          </div>
        );
      })}
    </div>
  );
}

export function ProcessWorkspace(props: {
  manifest: WorkspaceManifest;
  def: ProcessDef;
  prompts: string[];
  executors?: Record<string, Executor>;
  makeSource?: (bots: BotIndex) => AutoSource;
  /** تب‌های اضافه‌ی خاص همین خوشه */
  extraTabs?: Array<{ id: string; label: string; render: () => ReactNode }>;
  /** نمایش بدون هدر (وقتی داخل صفحه‌ی خوشه جاسازی شده) */
  embedded?: boolean;
}) {
  const { manifest, def } = props;
  const [tab, setTab] = useState('process');
  const tabs = [
    { id: 'process', label: '🧭 فرایند زنده' },
    ...(props.extraTabs ?? []).map((t) => ({ id: t.id, label: t.label })),
    { id: 'bots', label: '🤖 ربات‌های خوشه' },
    { id: 'assistant', label: '💬 دستیار' },
  ];
  const extra = (props.extraTabs ?? []).find((t) => t.id === tab);
  return (
    <WorkspaceShell icon={manifest.icon} title={manifest.title} subtitle={manifest.tagline} accent={manifest.accent} tabs={tabs} tab={tab} onTab={setTab} embedded={props.embedded}>
      {tab === 'process' && <ProcessConsole slug={manifest.slug} def={def} executors={props.executors} makeSource={props.makeSource} />}
      {extra && extra.render()}
      {tab === 'bots' && (
        <Panel title="ربات‌های این خوشه" subtitle="هر ربات و جایگاهش در مسیر فرایند">
          <ClusterBots slug={manifest.slug} def={def} />
        </Panel>
      )}
      {tab === 'assistant' && (
        <AssistantPanel
          slug={manifest.slug}
          title={`دستیار ${manifest.title.replace('میزکار ', '')}`}
          quickPrompts={props.prompts}
          context={() => `فرایند: ${def.title}\nمرحله‌ها: ${def.stages.map((s) => `${s.title} (${s.botName})`).join(' ← ')}\nنتیجه‌ی هدف: ${def.outcome}`}
        />
      )}
    </WorkspaceShell>
  );
}
