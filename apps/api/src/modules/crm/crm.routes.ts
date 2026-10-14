import type { FastifyInstance } from 'fastify';
import { ci } from '../../lib/dbmode.js';
import { z } from 'zod';

export const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'] as const;

const contactSchema = z.object({
  name: z.string().max(120).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().max(160).optional(),
  stage: z.enum(STAGES).optional(),
  score: z.number().int().min(0).max(100).optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  notes: z.string().max(2000).optional(),
  source: z.string().max(80).optional(),
});

export async function crmRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  async function own(id: string, userId: string) {
    const c = await app.prisma.contact.findUnique({ where: { id } });
    if (!c || c.userId !== userId) throw Object.assign(new Error('مخاطب یافت نشد'), { statusCode: 404 });
    return c;
  }

  app.get('/', auth, async (request) => {
    const q = z.object({ q: z.string().optional(), stage: z.string().optional() }).parse(request.query);
    const items = await app.prisma.contact.findMany({
      where: {
        userId: request.user.sub,
        ...(q.stage ? { stage: q.stage } : {}),
        ...(q.q
          ? { OR: [
              { name: { contains: q.q, ...ci } },
              { phone: { contains: q.q } },
              { email: { contains: q.q, ...ci } },
            ] }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    const counts = await app.prisma.contact.groupBy({
      by: ['stage'],
      where: { userId: request.user.sub },
      _count: true,
    });
    return { items, counts: Object.fromEntries(counts.map((c) => [c.stage, c._count])) };
  });

  app.post('/', auth, async (request) => {
    const input = contactSchema.parse(request.body);
    return app.prisma.contact.create({
      data: { ...input, tags: JSON.stringify(input.tags || []), userId: request.user.sub, source: input.source || 'manual' },
    });
  });

  app.patch('/:id', auth, async (request) => {
    const { id } = request.params as { id: string };
    await own(id, request.user.sub);
    const input = contactSchema.partial().parse(request.body);
    const { tags, ...rest } = input;
    return app.prisma.contact.update({
      where: { id },
      data: { ...rest, ...(tags ? { tags: JSON.stringify(tags) } : {}) },
    });
  });

  app.delete('/:id', auth, async (request) => {
    const { id } = request.params as { id: string };
    await own(id, request.user.sub);
    await app.prisma.contact.delete({ where: { id } });
    return { ok: true };
  });

  // خروجی CSV
  app.get('/export.csv', auth, async (request, reply) => {
    const items = await app.prisma.contact.findMany({ where: { userId: request.user.sub }, orderBy: { createdAt: 'desc' } });
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [['name', 'phone', 'email', 'stage', 'score', 'source', 'createdAt'].join(',')].concat(
      items.map((c) => [c.name, c.phone, c.email, c.stage, c.score, c.source, c.createdAt.toISOString()].map(esc).join(','))
    );
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', 'attachment; filename="contacts.csv"');
    return '﻿' + rows.join('\n');
  });
}
