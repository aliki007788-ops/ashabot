import type { FastifyInstance } from 'fastify';
import { ci } from '../../lib/dbmode.js';
import { Prisma } from '@prisma/client';

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
    .replace(/^-|-$/g, '');

export class BotsService {
  constructor(private app: FastifyInstance) {}

  async list(params: {
    q?: string;
    clusterId?: string;
    isActive?: boolean;
    page: number;
    limit: number;
  }) {
    const where: Prisma.BotWhereInput = {};
    if (params.q) {
      where.OR = [
        { name: { contains: params.q, ...ci } },
        { description: { contains: params.q, ...ci } },
      ];
    }
    if (params.clusterId) where.clusterId = params.clusterId;
    if (typeof params.isActive === 'boolean') where.isActive = params.isActive;

    const [items, total] = await Promise.all([
      this.app.prisma.bot.findMany({
        where,
        include: { cluster: true, brains: { include: { brain: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.app.prisma.bot.count({ where }),
    ]);

    return {
      items,
      total,
      page: params.page,
      limit: params.limit,
      pages: Math.ceil(total / params.limit),
    };
  }

  async getById(id: string) {
    const bot = await this.app.prisma.bot.findUnique({
      where: { id },
      include: {
        cluster: true,
        brains: { include: { brain: true } },
        botChannels: { include: { channel: true } },
      },
    });
    if (!bot) throw Object.assign(new Error('Bot not found'), { statusCode: 404 });
    return bot;
  }

  async create(input: any, userId?: string) {
    const slug = input.slug || slugify(input.name) || `bot-${Date.now()}`;
    const exists = await this.app.prisma.bot.findUnique({ where: { slug } });
    if (exists) throw Object.assign(new Error('Slug already exists'), { statusCode: 409 });

    const { brainIds, ...data } = input;
    const bot = await this.app.prisma.bot.create({
      data: {
        ...data,
        slug,
        userId,
        brains: brainIds?.length
          ? { create: brainIds.map((brainId: string) => ({ brainId })) }
          : undefined,
      },
      include: { cluster: true, brains: { include: { brain: true } } },
    });
    await this.logActivity('bot.created', `ربات «${bot.name}» ساخته شد`, bot.id, userId);
    return bot;
  }

  async update(id: string, input: any) {
    await this.getById(id);
    const { brainIds, ...data } = input;

    const bot = await this.app.prisma.bot.update({
      where: { id },
      data,
      include: { cluster: true, brains: { include: { brain: true } } },
    });

    if (brainIds) {
      await this.app.prisma.botBrain.deleteMany({ where: { botId: id } });
      if (brainIds.length) {
        await this.app.prisma.botBrain.createMany({
          data: brainIds.map((brainId: string) => ({ botId: id, brainId })),
          skipDuplicates: true,
        });
      }
    }

    await this.logActivity('bot.updated', `ربات «${bot.name}» ویرایش شد`, bot.id);
    return bot;
  }

  async toggle(id: string) {
    const bot = await this.getById(id);
    const updated = await this.app.prisma.bot.update({
      where: { id },
      data: { isActive: !bot.isActive },
      include: { cluster: true },
    });
    await this.logActivity(
      updated.isActive ? 'bot.activated' : 'bot.deactivated',
      `ربات «${updated.name}» ${updated.isActive ? 'فعال' : 'غیرفعال'} شد`,
      updated.id
    );
    return updated;
  }

  async remove(id: string) {
    const bot = await this.getById(id);
    await this.app.prisma.bot.delete({ where: { id } });
    await this.logActivity('bot.deleted', `ربات «${bot.name}» حذف شد`);
    return { ok: true };
  }

  private async logActivity(type: string, message: string, botId?: string, userId?: string) {
    try {
      await this.app.prisma.activityLog.create({
        data: { type, message, botId, userId },
      });
      this.app.io?.emit('activity:new', {
        type,
        message,
        botId,
        createdAt: new Date().toISOString(),
      });
    } catch {}
  }
}
