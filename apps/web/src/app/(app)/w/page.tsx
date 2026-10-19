'use client';

import Link from 'next/link';
import { DownloadPack } from '@/components/DownloadPack';
import { PageHeader } from '@/components/ui/kit';
import { workspaces } from '@/workspaces/registry';

export default function WorkspacesPage() {
  const list = Object.values(workspaces);
  return (
    <div>
      <PageHeader title="میزکارها" subtitle="هر خوشه میزکار اختصاصی خودش را دارد؛ از صفر تا صد فرایند، ربات به ربات، روی یک نقشه‌ی زنده — داخل صفحه‌ی همان خوشه" />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map(({ manifest: m }) => (
          <div key={m.slug} className="rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] transition" style={{ borderTop: `3px solid ${m.accent}` }}>
          <Link href={`/clusters/${m.slug}`} className="block p-5 pb-3">
            <div className="text-4xl mb-3">{m.icon}</div>
            <h3 className="font-extrabold text-lg">{m.title}</h3>
            <p className="text-sm text-white/55 mt-1.5 leading-7">{m.tagline}</p>
            <div className="text-[11px] text-white/35 mt-3">نسخه {m.version} · ورود به میزکار ←</div>
          </Link>
          <div className="px-5 pb-4">
            <DownloadPack slug={m.slug} />
          </div>
          </div>
        ))}
      </div>
    </div>
  );
}
