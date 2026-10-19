'use client';

import { RunsExplorer } from '@/workspaces/booking-appointments/_kit';

/** همه‌ی پرونده‌های همه‌ی خوشه‌ها در یک‌جا */
export default function AllRunsPage() {
  return (
    <div className="space-y-4" style={{ ['--ws' as string]: '#6a8dff' }}>
      <div>
        <h1 className="text-xl font-extrabold">پرونده‌ها</h1>
        <p className="text-sm text-white/55 mt-1">هر درخواست از کجا شروع شد، کدام رباتی چه کرد و به چه انجامید؛ برای همه‌ی خوشه‌ها.</p>
      </div>
      <RunsExplorer slug="all" showCluster />
    </div>
  );
}
