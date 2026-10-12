import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { KnowledgeService } from './knowledge.service.js';

const kbSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  botId: z.string().optional(),
});
const docSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(500_000),
  sourceType: z.string().optional(),
});
const urlSchema = z.object({ url: z.string().url() });

function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/h\d|\/li)\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
}

export async function knowledgeRoutes(app: FastifyInstance) {
  const service = new KnowledgeService(app);
  const auth = { preHandler: [app.authenticate] };

  async function ownKb(id: string, userId: string) {
    const kb = await app.prisma.knowledgeBase.findUnique({ where: { id } });
    if (!kb || kb.userId !== userId) {
      throw Object.assign(new Error('پایگاه دانش یافت نشد'), { statusCode: 404 });
    }
    return kb;
  }

  app.get('/', auth, async (request) => {
    const items = await app.prisma.knowledgeBase.findMany({
      where: { userId: request.user.sub },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { documents: true, chunks: true } } },
    });
    return { items };
  });

  app.post('/', auth, async (request) => {
    const input = kbSchema.parse(request.body);
    return app.prisma.knowledgeBase.create({ data: { ...input, userId: request.user.sub } });
  });

  app.delete('/:id', auth, async (request) => {
    const { id } = request.params as { id: string };
    await ownKb(id, request.user.sub);
    await app.prisma.knowledgeBase.delete({ where: { id } });
    return { ok: true };
  });

  app.get('/:id/documents', auth, async (request) => {
    const { id } = request.params as { id: string };
    await ownKb(id, request.user.sub);
    const items = await app.prisma.knowledgeDocument.findMany({
      where: { knowledgeBaseId: id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, sourceType: true, sourceUrl: true, chunkCount: true, createdAt: true },
    });
    return { items };
  });

  app.post('/:id/documents', auth, async (request) => {
    const { id } = request.params as { id: string };
    await ownKb(id, request.user.sub);
    const input = docSchema.parse(request.body);
    return service.addDocument({ knowledgeBaseId: id, ...input });
  });

  // افزودن محتوای یک صفحه وب
  app.post('/:id/documents/url', auth, async (request) => {
    const { id } = request.params as { id: string };
    await ownKb(id, request.user.sub);
    const { url } = urlSchema.parse(request.body);
    const { isSafeWebhookUrl } = await import('../../lib/guardrails.js');
    if (!isSafeWebhookUrl(url)) {
      throw Object.assign(new Error('فقط آدرس https عمومی مجاز است'), { statusCode: 400 });
    }
    const res = await fetch(url, { headers: { 'User-Agent': 'AshaBot/1.0' } });
    if (!res.ok) throw Object.assign(new Error(`دریافت صفحه ناموفق بود (${res.status})`), { statusCode: 400 });
    const html = (await res.text()).slice(0, 2_000_000);
    const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || url;
    return service.addDocument({
      knowledgeBaseId: id,
      title,
      content: htmlToText(html).slice(0, 400_000),
      sourceType: 'url',
      sourceUrl: url,
    });
  });

  app.delete('/:id/documents/:docId', auth, async (request) => {
    const { id, docId } = request.params as { id: string; docId: string };
    await ownKb(id, request.user.sub);
    await app.prisma.knowledgeDocument.deleteMany({ where: { id: docId, knowledgeBaseId: id } });
    return { ok: true };
  });

  // تست جست‌وجو
  app.post('/:id/search', auth, async (request) => {
    const { id } = request.params as { id: string };
    const kb = await ownKb(id, request.user.sub);
    const { query } = z.object({ query: z.string().min(1) }).parse(request.body);
    const chunks = await app.prisma.knowledgeChunk.count({ where: { knowledgeBaseId: id } });
    const results = kb.botId
      ? await service.search(kb.botId, request.user.sub, query)
      : await (async () => {
          // پایگاه عمومی کاربر: با یک botId ساختگی فقط KBهای بدون ربات جست‌وجو می‌شوند
          return service.search('__none__', request.user.sub, query);
        })();
    return { chunks, results };
  });
}
