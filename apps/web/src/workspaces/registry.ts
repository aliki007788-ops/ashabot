'use client';

/**
 * ثبت میزکارها — تولیدشده با «pnpm ws:gen»؛ ویرایش دستی نکنید.
 * هر میزکار یک پوشه‌ی مستقل (manifest + process + index + _kit) است.
 */
import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import type { WorkspaceManifest } from './booking-appointments/_kit/types';
import { manifest as m_sales } from './sales/manifest';
import { manifest as m_lead_generation } from './lead-generation/manifest';
import { manifest as m_support } from './support/manifest';
import { manifest as m_finance } from './finance/manifest';
import { manifest as m_inventory } from './inventory/manifest';
import { manifest as m_marketing } from './marketing/manifest';
import { manifest as m_analytics } from './analytics/manifest';
import { manifest as m_hr } from './hr/manifest';
import { manifest as m_supply_chain } from './supply-chain/manifest';
import { manifest as m_innovation } from './innovation/manifest';
import { manifest as m_education } from './education/manifest';
import { manifest as m_legal } from './legal/manifest';
import { manifest as m_security } from './security/manifest';
import { manifest as m_premium_learning } from './premium-learning/manifest';
import { manifest as m_premium_legal } from './premium-legal/manifest';
import { manifest as m_premium_security } from './premium-security/manifest';
import { manifest as m_premium_multilang } from './premium-multilang/manifest';
import { manifest as m_premium_voice } from './premium-voice/manifest';
import { manifest as m_knowledge_rag } from './knowledge-rag/manifest';
import { manifest as m_conversational_commerce } from './conversational-commerce/manifest';
import { manifest as m_instagram_automation } from './instagram-automation/manifest';
import { manifest as m_booking_appointments } from './booking-appointments/manifest';
import { manifest as m_voice_agents } from './voice-agents/manifest';
import { manifest as m_recruitment } from './recruitment/manifest';
import { manifest as m_accounting_invoicing } from './accounting-invoicing/manifest';
import { manifest as m_content_factory } from './content-factory/manifest';
import { manifest as m_real_estate_auto } from './real-estate-auto/manifest';

export interface WorkspaceEntry {
  manifest: WorkspaceManifest;
  /** embedded=true وقتی داخل صفحه‌ی خوشه نمایش داده می‌شود */
  Component: ComponentType<{ embedded?: boolean }>;
}

export const workspaces: Record<string, WorkspaceEntry> = {
  [m_sales.slug]: { manifest: m_sales, Component: dynamic(() => import('./sales'), { ssr: false }) },
  [m_lead_generation.slug]: { manifest: m_lead_generation, Component: dynamic(() => import('./lead-generation'), { ssr: false }) },
  [m_support.slug]: { manifest: m_support, Component: dynamic(() => import('./support'), { ssr: false }) },
  [m_finance.slug]: { manifest: m_finance, Component: dynamic(() => import('./finance'), { ssr: false }) },
  [m_inventory.slug]: { manifest: m_inventory, Component: dynamic(() => import('./inventory'), { ssr: false }) },
  [m_marketing.slug]: { manifest: m_marketing, Component: dynamic(() => import('./marketing'), { ssr: false }) },
  [m_analytics.slug]: { manifest: m_analytics, Component: dynamic(() => import('./analytics'), { ssr: false }) },
  [m_hr.slug]: { manifest: m_hr, Component: dynamic(() => import('./hr'), { ssr: false }) },
  [m_supply_chain.slug]: { manifest: m_supply_chain, Component: dynamic(() => import('./supply-chain'), { ssr: false }) },
  [m_innovation.slug]: { manifest: m_innovation, Component: dynamic(() => import('./innovation'), { ssr: false }) },
  [m_education.slug]: { manifest: m_education, Component: dynamic(() => import('./education'), { ssr: false }) },
  [m_legal.slug]: { manifest: m_legal, Component: dynamic(() => import('./legal'), { ssr: false }) },
  [m_security.slug]: { manifest: m_security, Component: dynamic(() => import('./security'), { ssr: false }) },
  [m_premium_learning.slug]: { manifest: m_premium_learning, Component: dynamic(() => import('./premium-learning'), { ssr: false }) },
  [m_premium_legal.slug]: { manifest: m_premium_legal, Component: dynamic(() => import('./premium-legal'), { ssr: false }) },
  [m_premium_security.slug]: { manifest: m_premium_security, Component: dynamic(() => import('./premium-security'), { ssr: false }) },
  [m_premium_multilang.slug]: { manifest: m_premium_multilang, Component: dynamic(() => import('./premium-multilang'), { ssr: false }) },
  [m_premium_voice.slug]: { manifest: m_premium_voice, Component: dynamic(() => import('./premium-voice'), { ssr: false }) },
  [m_knowledge_rag.slug]: { manifest: m_knowledge_rag, Component: dynamic(() => import('./knowledge-rag'), { ssr: false }) },
  [m_conversational_commerce.slug]: { manifest: m_conversational_commerce, Component: dynamic(() => import('./conversational-commerce'), { ssr: false }) },
  [m_instagram_automation.slug]: { manifest: m_instagram_automation, Component: dynamic(() => import('./instagram-automation'), { ssr: false }) },
  [m_booking_appointments.slug]: { manifest: m_booking_appointments, Component: dynamic(() => import('./booking-appointments'), { ssr: false }) },
  [m_voice_agents.slug]: { manifest: m_voice_agents, Component: dynamic(() => import('./voice-agents'), { ssr: false }) },
  [m_recruitment.slug]: { manifest: m_recruitment, Component: dynamic(() => import('./recruitment'), { ssr: false }) },
  [m_accounting_invoicing.slug]: { manifest: m_accounting_invoicing, Component: dynamic(() => import('./accounting-invoicing'), { ssr: false }) },
  [m_content_factory.slug]: { manifest: m_content_factory, Component: dynamic(() => import('./content-factory'), { ssr: false }) },
  [m_real_estate_auto.slug]: { manifest: m_real_estate_auto, Component: dynamic(() => import('./real-estate-auto'), { ssr: false }) },
};

export const hasWorkspace = (slug: string): boolean => slug in workspaces;
