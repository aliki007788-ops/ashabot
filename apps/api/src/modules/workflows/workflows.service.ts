import type { FastifyInstance } from 'fastify';
import { isSafeWebhookUrl } from '../../lib/guardrails.js';

export type WorkflowAction =
  | { type: 'reply'; text: string }
  | { type: 'tag'; tag: string }
  | { type: 'set_stage'; stage: string }
  | { type: 'handoff'; reason?: string }
  | { type: 'webhook'; url: string };

export interface WorkflowContext {
  botId: string;
  ownerId: string | null;
  conversationId: string;
  message?: string;
}

export interface WorkflowResult {
  reply?: string;
  handoff?: string;
}

export class WorkflowService {
  constructor(private app: FastifyInstance) {}

  /** اجرای workflowهای فعال برای یک رویداد. اگر action از نوع reply باشد، پاسخ مستقیم (بدون LLM) برمی‌گردد. */
  async run(
    trigger: 'KEYWORD' | 'NEW_MESSAGE' | 'NEW_LEAD' | 'HANDOFF',
    ctx: WorkflowContext
  ): Promise<WorkflowResult> {
    const flows = await this.app.prisma.workflow.findMany({
      where: {
        isActive: true,
        triggerType: trigger === 'KEYWORD' ? { in: ['KEYWORD', 'NEW_MESSAGE'] } : trigger,
        OR: [{ botId: ctx.botId }, ...(ctx.ownerId ? [{ botId: null, userId: ctx.ownerId }] : [])],
      },
    });
    const result: WorkflowResult = {};
    const text = (ctx.message || '').toLowerCase();

    for (const wf of flows) {
      if (wf.triggerType === 'KEYWORD') {
        const kws = (wf.triggerValue || '')
          .split(/[,،\n]/)
          .map((k) => k.trim().toLowerCase())
          .filter(Boolean);
        if (!kws.some((k) => text.includes(k))) continue;
      }
      let actions: WorkflowAction[] = [];
      try {
        actions = JSON.parse(wf.actions);
      } catch {
        continue;
      }
      for (const a of actions) {
        try {
          await this.exec(a, ctx, result);
        } catch (e: any) {
          this.app.log.warn(`workflow ${wf.id} action ${a.type} failed: ${e.message}`);
        }
      }
      await this.app.prisma.workflow.update({ where: { id: wf.id }, data: { runCount: { increment: 1 } } });
    }
    return result;
  }

  private async exec(a: WorkflowAction, ctx: WorkflowContext, out: WorkflowResult) {
    const { prisma } = this.app;
    switch (a.type) {
      case 'reply':
        if (!out.reply) out.reply = a.text;
        break;
      case 'handoff':
        out.handoff = a.reason || 'workflow';
        break;
      case 'tag':
      case 'set_stage': {
        const contact = await prisma.contact.findFirst({ where: { conversationId: ctx.conversationId } });
        if (!contact) break;
        if (a.type === 'set_stage') {
          await prisma.contact.update({ where: { id: contact.id }, data: { stage: a.stage } });
        } else {
          const tags: string[] = JSON.parse(contact.tags || '[]');
          if (!tags.includes(a.tag)) tags.push(a.tag);
          await prisma.contact.update({ where: { id: contact.id }, data: { tags: JSON.stringify(tags) } });
        }
        break;
      }
      case 'webhook':
        if (isSafeWebhookUrl(a.url)) {
          const ctl = new AbortController();
          const timer = setTimeout(() => ctl.abort(), 5000);
          await fetch(a.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'workflow', ...ctx }),
            signal: ctl.signal,
          }).finally(() => clearTimeout(timer));
        }
        break;
    }
  }
}
