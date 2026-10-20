'use client';

import { useEffect, useState } from 'react';
import { api } from './api';

export interface PublicConfig {
  storeName: string;
  announcement: string;
  registrationOpen: boolean;
  landingsEnabled: boolean;
  supportLink: string;
  disabledModules: string[];
}

let cached: PublicConfig | null = null;
let inflight: Promise<PublicConfig | null> | null = null;

async function load(): Promise<PublicConfig | null> {
  if (cached) return cached;
  inflight = inflight ?? api.get<PublicConfig>('/api/public/config').then((r) => (cached = r.data)).catch(() => null).finally(() => { inflight = null; });
  return inflight;
}

export function usePublicConfig(): PublicConfig | null {
  const [cfg, setCfg] = useState<PublicConfig | null>(cached);
  useEffect(() => {
    let live = true;
    void load().then((c) => live && setCfg(c));
    return () => { live = false; };
  }, []);
  return cfg;
}
