import type { FastifyInstance } from 'fastify';
import { getEmbeddingProvider } from '../../lib/ai/index.js';

/** تکه‌تکه کردن متن با هم‌پوشانی (حدود ۸۰۰ نویسه) */
export function chunkText(text: string, size = 800, overlap = 120): string[] {
  const clean = text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
  if (!clean) return [];
  const paragraphs = clean.split(/\n{2,}/);
  const chunks: string[] = [];
  let cur = '';
  for (const p of paragraphs) {
    if ((cur + '\n\n' + p).length <= size) {
      cur = cur ? cur + '\n\n' + p : p;
      continue;
    }
    if (cur) chunks.push(cur);
    if (p.length <= size) {
      cur = p;
    } else {
      let i = 0;
      while (i < p.length) {
        chunks.push(p.slice(i, i + size));
        i += size - overlap;
      }
      cur = '';
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

export class KnowledgeService {
  constructor(private app: FastifyInstance) {}

  async addDocument(input: {
    knowledgeBaseId: string;
    title: string;
    content: string;
    sourceType?: string;
    sourceUrl?: string;
  }) {
    const pieces = chunkText(input.content);
    if (!pieces.length) throw Object.assign(new Error('متن خالی است'), { statusCode: 400 });

    const doc = await this.app.prisma.knowledgeDocument.create({
      data: {
        knowledgeBaseId: input.knowledgeBaseId,
        title: input.title,
        content: input.content,
        sourceType: input.sourceType || 'text',
        sourceUrl: input.sourceUrl,
        chunkCount: pieces.length,
      },
    });

    const embedder = getEmbeddingProvider();
    let idx = 0;
    for (const piece of pieces) {
      let embedding: string | null = null;
      if (embedder?.embed) {
        try {
          embedding = JSON.stringify(await embedder.embed(piece));
        } catch (e: any) {
          this.app.log.warn(`embedding failed: ${e.message}`);
        }
      }
      await this.app.prisma.knowledgeChunk.create({
        data: {
          documentId: doc.id,
          knowledgeBaseId: input.knowledgeBaseId,
          idx: idx++,
          content: piece,
          embedding,
        },
      });
    }
    return doc;
  }

  /** جست‌وجوی معنایی (embedding) با fallback به امتیازدهی کلیدواژه */
  async search(botId: string, ownerId: string | null, query: string, topK = 4) {
    const kbs = await this.app.prisma.knowledgeBase.findMany({
      where: {
        OR: [{ botId }, ...(ownerId ? [{ botId: null, userId: ownerId }] : [])],
      },
      select: { id: true },
    });
    if (!kbs.length) return [];

    const chunks = await this.app.prisma.knowledgeChunk.findMany({
      where: { knowledgeBaseId: { in: kbs.map((k) => k.id) } },
      include: { document: { select: { title: true } } },
      take: 3000,
    });
    if (!chunks.length) return [];

    let qEmb: number[] | null = null;
    const embedder = getEmbeddingProvider();
    if (embedder?.embed && chunks.some((c) => c.embedding)) {
      try {
        qEmb = await embedder.embed(query);
      } catch {
        qEmb = null;
      }
    }

    const qTokens = new Set(tokenize(query));
    const scored = chunks.map((c) => {
      let score = 0;
      if (qEmb && c.embedding) {
        try {
          score = cosine(qEmb, JSON.parse(c.embedding));
        } catch {
          score = 0;
        }
      } else {
        const toks = tokenize(c.content);
        if (toks.length && qTokens.size) {
          let hit = 0;
          for (const t of toks) if (qTokens.has(t)) hit++;
          score = hit / Math.sqrt(toks.length) / Math.sqrt(qTokens.size);
        }
      }
      return { content: c.content, title: c.document.title, score };
    });

    return scored
      .filter((s) => s.score > (qEmb ? 0.2 : 0.05))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}
