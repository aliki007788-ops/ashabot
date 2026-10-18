'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Empty } from '@/components/ui/kit';
import { workspaces } from '@/workspaces/registry';

export default function WorkspacePage() {
  const params = useParams();
  const slug = String(params?.slug ?? '');
  const entry = workspaces[slug];
  if (!entry) {
    return (
      <div>
        <Empty icon="🧭" text="برای این خوشه هنوز میزکار اختصاصی ساخته نشده است." />
        <div className="text-center">
          <Link href="/w" className="text-sm underline text-white/60">بازگشت به فهرست میزکارها</Link>
        </div>
      </div>
    );
  }
  const { Component } = entry;
  return <Component />;
}
