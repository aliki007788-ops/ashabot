/**
 * pnpm ws:gen
 * از روی تعریف‌های scripts/specs/*.cjs برای هر خوشه این فایل‌ها را می‌سازد:
 *   apps/web/src/workspaces/<slug>/{process.ts, manifest.ts, index.tsx*}  و  registry.ts
 * (index.tsx فقط برای میزکارهای عمومی ساخته می‌شود؛ میزکارهای سفارشی دست‌نویس‌اند.)
 * بعد از آن «pnpm kit:sync» را بزنید تا _kit همه‌جا یکی شود.
 * ربات‌ها و خوشه‌ها با scripts/bots-catalog.json و clusters-catalog.json اعتبارسنجی می‌شوند.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const wsRoot = path.join(root, 'apps', 'web', 'src', 'workspaces');
const bots = JSON.parse(fs.readFileSync(path.join(__dirname, 'bots-catalog.json'), 'utf8'));
const clusters = JSON.parse(fs.readFileSync(path.join(__dirname, 'clusters-catalog.json'), 'utf8'));
const specs = [...require('./specs/part1.cjs'), ...require('./specs/part2.cjs'), ...require('./specs/part3.cjs')];

/** میزکارهای سفارشی (index.tsx دست‌نویس دارند و فقط process/manifest از اینجا می‌آید) */
const CUSTOM = new Set(['booking-appointments', 'accounting-invoicing', 'knowledge-rag']);
const ACTS = new Set(['crm', 'booking', 'payment', 'kb']);
const WS_VERSION = '2.0.0';

const errors = [];
const err = (slug, msg) => errors.push(`[${slug}] ${msg}`);

/* ───── اعتبارسنجی ───── */
const seen = new Set();
for (const w of specs) {
  const { slug, process: p } = w;
  if (seen.has(slug)) err(slug, 'خوشه‌ی تکراری');
  seen.add(slug);
  if (!clusters[slug]) err(slug, 'در clusters-catalog.json نیست');
  const ids = new Set();
  for (const s of p.stages) {
    if (ids.has(s.id)) err(slug, `شناسه‌ی تکراری ${s.id}`);
    ids.add(s.id);
    if (!bots[s.bot]) err(slug, `ربات «${s.bot}» در کاتالوگ نیست (${s.id})`);
    for (const [, b, n] of s.pick || []) {
      if (!bots[b]) err(slug, `ربات pick «${b}» در کاتالوگ نیست (${s.id})`);
      if (!n) err(slug, `نام ربات pick خالی است (${s.id})`);
    }
    if (s.act && !ACTS.has(s.act.split(':')[0])) err(slug, `act ناشناخته: ${s.act}`);
    for (const f of ['title', 'does', 'sample', 'after']) if (!s[f]) err(slug, `${s.id}: «${f}» خالی است`);
  }
  for (const s of p.stages) for (const n of s.next) if (!ids.has(n)) err(slug, `${s.id} → ${n} ناموجود`);
  const incoming = new Set(p.stages.flatMap((s) => s.next));
  const starts = p.stages.filter((s) => !incoming.has(s.id));
  if (starts.length !== 1) err(slug, `باید دقیقاً یک مرحله‌ی شروع باشد (الان ${starts.length}: ${starts.map((s) => s.id).join(',')})`);
  // حلقه
  const st = {};
  const idx = Object.fromEntries(p.stages.map((s) => [s.id, s]));
  const visit = (id) => {
    if (st[id] === 2) return;
    if (st[id] === 1) return err(slug, `حلقه در ${id}`);
    st[id] = 1;
    for (const n of idx[id]?.next || []) visit(n);
    st[id] = 2;
  };
  p.stages.forEach((s) => visit(s.id));
  // دسترسی‌پذیری از شروع
  const reach = new Set();
  const walk = (id) => {
    if (reach.has(id)) return;
    reach.add(id);
    (idx[id]?.next || []).forEach(walk);
  };
  starts.forEach((s) => walk(s.id));
  for (const s of p.stages) if (!reach.has(s.id)) err(slug, `${s.id} از شروع قابل دسترسی نیست`);
  if (p.trigger.scenarios.length < 3) err(slug, 'حداقل ۳ سناریوی نمونه لازم است');
  if (w.prompts.length < 3) err(slug, 'حداقل ۳ پرسش سریع لازم است');
}
for (const slug of Object.keys(clusters)) if (!seen.has(slug)) err(slug, 'تعریف فرایند ندارد');
if (errors.length) {
  console.error('✘ خطا در تعریف فرایندها:\n' + errors.map((e) => ' - ' + e).join('\n'));
  process.exit(1);
}

/* ───── تولید فایل‌ها ───── */
const q = (s) => JSON.stringify(s);
const esc = (o) => JSON.stringify(o, null, 2).replace(/^/gm, '');

function stageObj(s) {
  const b = bots[s.bot];
  const o = {
    id: s.id,
    bot: s.bot,
    botName: b.name,
    icon: b.icon,
    title: s.title,
    does: s.does,
    sample: s.sample,
    after: s.after,
    next: s.next,
  };
  if (s.human) o.human = true;
  if (s.act) o.act = s.act;
  if (s.pick) o.pick = s.pick;
  return o;
}

for (const w of specs) {
  const dir = path.join(wsRoot, w.slug);
  fs.mkdirSync(dir, { recursive: true });
  const c = clusters[w.slug];
  const p = w.process;
  const def = {
    id: p.id,
    title: p.title,
    summary: p.summary,
    trigger: p.trigger,
    stages: p.stages.map(stageObj),
    outcome: p.outcome,
  };
  fs.writeFileSync(
    path.join(dir, 'process.ts'),
    `/* تعریف فرایند «${w.title}» — تولیدشده از scripts/specs با «pnpm ws:gen». ویرایش دستی نکنید؛ تعریف را در specs تغییر دهید. */
import type { ProcessDef } from './_kit/process';

export const processDef: ProcessDef = ${esc(def)};

export const prompts: string[] = ${esc(w.prompts)};
`,
  );
  fs.writeFileSync(
    path.join(dir, 'manifest.ts'),
    `import type { WorkspaceManifest } from './_kit/types';

export const manifest: WorkspaceManifest = {
  slug: ${q(w.slug)},
  title: ${q(w.title)},
  icon: ${q(c.icon)},
  accent: ${q(c.color)},
  version: ${q(WS_VERSION)},
  tagline: ${q(w.tagline)},
};
`,
  );
  if (!CUSTOM.has(w.slug)) {
    fs.writeFileSync(
      path.join(dir, 'index.tsx'),
      `'use client';

import { ProcessWorkspace } from './_kit';
import { manifest } from './manifest';
import { processDef, prompts } from './process';

/** میزکار فرایندمحور «${w.title}»: نقشه‌ی شبکه‌ای زنده، الان/بعدی، گزارش، ربات‌ها و دستیار. */
export default function Workspace(props: { embedded?: boolean }) {
  return <ProcessWorkspace manifest={manifest} def={processDef} prompts={prompts} embedded={props.embedded} />;
}
`,
    );
  }
}

/* ───── رجیستری ───── */
const order = Object.keys(clusters).sort((a, b) => clusters[a].sort - clusters[b].sort);
const varOf = (slug) => 'm_' + slug.replace(/-/g, '_');
const imports = order.map((s) => `import { manifest as ${varOf(s)} } from './${s}/manifest';`).join('\n');
const entries = order
  .map((s) => `  [${varOf(s)}.slug]: { manifest: ${varOf(s)}, Component: dynamic(() => import('./${s}'), { ssr: false }) },`)
  .join('\n');
fs.writeFileSync(
  path.join(wsRoot, 'registry.ts'),
  `'use client';

/**
 * ثبت میزکارها — تولیدشده با «pnpm ws:gen»؛ ویرایش دستی نکنید.
 * هر میزکار یک پوشه‌ی مستقل (manifest + process + index + _kit) است.
 */
import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import type { WorkspaceManifest } from './booking-appointments/_kit/types';
${imports}

export interface WorkspaceEntry {
  manifest: WorkspaceManifest;
  /** embedded=true وقتی داخل صفحه‌ی خوشه نمایش داده می‌شود */
  Component: ComponentType<{ embedded?: boolean }>;
}

export const workspaces: Record<string, WorkspaceEntry> = {
${entries}
};

export const hasWorkspace = (slug: string): boolean => slug in workspaces;
`,
);

const stageCount = specs.reduce((a, w) => a + w.process.stages.length, 0);
console.log(`✔ ${specs.length} میزکار تولید شد (${stageCount} مرحله، ${specs.filter((w) => !CUSTOM.has(w.slug)).length} عمومی + ${CUSTOM.size} سفارشی)`);
