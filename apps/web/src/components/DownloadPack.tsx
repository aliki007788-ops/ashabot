'use client';

import { useEffect, useState } from 'react';

interface PackInfo {
  file: string;
  version: string;
  size: number;
}

/** دکمه‌ی دانلود بسته‌ی آماده‌ی اجرای یک خوشه (ساخته‌شده در بیلد: public/packs) */
export function DownloadPack(props: { slug: string; compact?: boolean; className?: string }) {
  const [info, setInfo] = useState<PackInfo | null | undefined>(undefined);
  const [hint, setHint] = useState(false);

  useEffect(() => {
    let live = true;
    fetch('/packs/index.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: Record<string, PackInfo> | null) => live && setInfo(j?.[props.slug] ?? null))
      .catch(() => live && setInfo(null));
    return () => {
      live = false;
    };
  }, [props.slug]);

  if (info === undefined) return null;
  const label = props.compact ? '⬇ دانلود' : '⬇ دانلود خوشه';
  const base = 'rounded-lg px-3 py-1.5 text-xs font-bold border border-white/20 hover:bg-white/10 transition whitespace-nowrap ' + (props.className ?? '');

  if (!info) {
    return (
      <>
        <button type="button" className={base + ' opacity-60'} onClick={() => setHint((h) => !h)} title="بسته هنوز ساخته نشده">
          {label}
        </button>
        {hint && <span className="text-[11px] text-amber-300 mr-2">بسته ساخته نشده؛ دستور «pnpm pack:all» را اجرا کنید.</span>}
      </>
    );
  }
  const mb = info.size / 1024;
  return (
    <a href={`/packs/${info.file}`} download className={base} title={`نسخه ${info.version} — ${Math.round(mb)} کیلوبایت — برنامه‌ی کامل و آماده‌ی اجرا برای مشتری`}>
      {label}
    </a>
  );
}
