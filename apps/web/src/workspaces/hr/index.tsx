'use client';

import { ProcessWorkspace } from './_kit';
import { manifest } from './manifest';
import { processDef, prompts } from './process';

/** میزکار فرایندمحور «میزکار منابع انسانی»: نقشه‌ی شبکه‌ای زنده، الان/بعدی، گزارش، ربات‌ها و دستیار. */
export default function Workspace(props: { embedded?: boolean }) {
  return <ProcessWorkspace manifest={manifest} def={processDef} prompts={prompts} embedded={props.embedded} />;
}
