import type { FastifyInstance } from 'fastify';
import { getProvider } from '../../lib/ai/factory.js';

export async function clusterStatsRoutes(app: FastifyInstance) {
  const prisma = app.prisma;

  // ==================== STATS ====================
  app.get('/:slug/stats', async (request) => {
    const { slug } = request.params as { slug: string };

    const cluster = await prisma.cluster.findUnique({
      where: { slug },
      include: { bots: { select: { id: true, isActive: true } } },
    });

    if (!cluster) throw new Error('Cluster not found');

    const botIds = cluster.bots.map((b) => b.id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [activeRuns, queuedRuns, messagesToday, outputsToday, commandsToday] =
      await Promise.all([
        prisma.botRun.count({ where: { botId: { in: botIds }, status: 'ACTIVE' } }),
        prisma.botRun.count({ where: { botId: { in: botIds }, status: 'QUEUED' } }),
        prisma.message.count({
          where: {
            conversation: { botId: { in: botIds } },
            createdAt: { gte: today },
          },
        }),
        prisma.clusterOutput.count({
          where: { clusterId: cluster.id, createdAt: { gte: today } },
        }),
        prisma.clusterCommand.count({
          where: { clusterId: cluster.id, createdAt: { gte: today } },
        }),
      ]);

    return {
      clusterId: cluster.id,
      botCount: cluster.bots.length,
      activeBots: activeRuns,
      queuedBots: queuedRuns,
      idleBots: Math.max(0, cluster.bots.length - activeRuns - queuedRuns),
      messagesToday,
      outputsToday,
      commandsToday,
    };
  });

  // ==================== BOTS STATUS ====================
  app.get('/:slug/bots-status', async (request) => {
    const { slug } = request.params as { slug: string };

    const cluster = await prisma.cluster.findUnique({
      where: { slug },
      include: {
        bots: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            description: true,
            isActive: true,
            isPremium: true,
          },
        },
      },
    });

    if (!cluster) throw new Error('Cluster not found');

    const botIds = cluster.bots.map((b) => b.id);
    const runs = await prisma.botRun.findMany({
      where: { botId: { in: botIds } },
      orderBy: { createdAt: 'desc' },
    });

    const runMap = new Map<string, (typeof runs)[0]>();
    for (const r of runs) {
      if (!runMap.has(r.botId)) runMap.set(r.botId, r);
    }

    return cluster.bots.map((bot) => {
      const run = runMap.get(bot.id);
      return {
        ...bot,
        runStatus: run?.status || (bot.isActive ? 'IDLE' : 'DISABLED'),
        lastTask: run?.taskType || null,
        lastRunAt: run?.createdAt || null,
        durationMs: run?.durationMs || null,
      };
    });
  });

  // ==================== OUTPUTS ====================
  app.get('/:slug/outputs', async (request) => {
    const { slug } = request.params as { slug: string };
    const query = request.query as { limit?: string; type?: string };

    const cluster = await prisma.cluster.findUnique({ where: { slug } });
    if (!cluster) throw new Error('Cluster not found');

    const outputs = await prisma.clusterOutput.findMany({
      where: {
        clusterId: cluster.id,
        ...(query.type ? { type: query.type } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(query.limit || '20'),
    });

    return { items: outputs };
  });

  // ==================== COMMAND WITH AI ====================
  app.post(
    '/:slug/command',
    { preHandler: [app.authenticate] },
    async (request) => {
      const { slug } = request.params as { slug: string };
      const { command } = request.body as { command: string };
      const userId = (request.user as any).sub;

      const cluster = await prisma.cluster.findUnique({
        where: { slug },
        include: {
          bots: {
            select: {
              id: true,
              name: true,
              slug: true,
              icon: true,
              description: true,
              isActive: true,
              isPremium: true,
            },
          },
        },
      });

      if (!cluster) throw new Error('Cluster not found');

      const clusterBotIds = cluster.bots.map((b) => b.id);

      // ذخیره فرمان در حالت PENDING
      const cmd = await prisma.clusterCommand.create({
        data: {
          clusterId: cluster.id,
          userId,
          command,
          status: 'PENDING',
        },
      });

      try {
        // ============ جمع‌آوری Context ============
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
          activeRuns,
          queuedRuns,
          messagesToday,
          outputsToday,
          recentOutputs,
          recentRuns,
          centralBrain,
        ] = await Promise.all([
          prisma.botRun.count({
            where: { botId: { in: clusterBotIds }, status: 'ACTIVE' },
          }),
          prisma.botRun.count({
            where: { botId: { in: clusterBotIds }, status: 'QUEUED' },
          }),
          prisma.message.count({
            where: {
              conversation: { botId: { in: clusterBotIds } },
              createdAt: { gte: today },
            },
          }),
          prisma.clusterOutput.count({
            where: { clusterId: cluster.id, createdAt: { gte: today } },
          }),
          prisma.clusterOutput.findMany({
            where: { clusterId: cluster.id },
            orderBy: { createdAt: 'desc' },
            take: 10,
          }),
          prisma.botRun.findMany({
            where: { botId: { in: clusterBotIds } },
            orderBy: { createdAt: 'desc' },
            take: 15,
          }),
          prisma.brain.findFirst({
            where: { isCentral: true },
            select: { name: true, description: true },
          }),
        ]);

        // ============ ساخت System Prompt ============
        const botsList = cluster.bots
          .slice(0, 15)
          .map(
            (b, i) =>
              `${i + 1}. ${b.icon} ${b.name}${b.isPremium ? ' ⭐' : ''} — ${b.description || 'بدون توضیح'}`,
          )
          .join('\n');

        const outputsList =
          recentOutputs.length > 0
            ? recentOutputs
                .slice(0, 8)
                .map(
                  (o) =>
                    `- [${o.type}] ${o.title}${
                      o.value
                        ? ` (${o.value.toLocaleString('fa-IR')} ${o.unit || ''})`
                        : ''
                    } — ${new Date(o.createdAt).toLocaleDateString('fa-IR')}`,
                )
                .join('\n')
            : '(بدون خروجی)';

        const runsList =
          recentRuns.length > 0
            ? recentRuns
                .slice(0, 10)
                .map(
                  (r) =>
                    `- ${r.status}${r.taskType ? `: ${r.taskType}` : ''}`,
                )
                .join('\n')
            : '(بدون فعالیت)';

        const systemPrompt = `تو **دستیار مرکز فرمان خوشه "${cluster.name}"** هستی.
${cluster.description ? `\nتوضیح خوشه: ${cluster.description}` : ''}

## اطلاعات خوشه:
- تعداد ربات‌ها: ${cluster.bots.length}
- ربات‌های فعال (در حال کار): ${activeRuns}
- ربات‌های در صف: ${queuedRuns}
- پیام‌های امروز: ${messagesToday}
- خروجی‌های امروز: ${outputsToday}

## ربات‌های این خوشه:
${botsList}

## خروجی‌های اخیر:
${outputsList}

## وضعیت اخیر ربات‌ها:
${runsList}

## دستورالعمل:
- پاسخ کوتاه، دقیق، و مفید بده
- از داده‌های بالا برای تحلیل و پیشنهاد استفاده کن
- اگر کاربر درخواست گزارش کرد، آمار واقعی رو ارائه بده
- اگر پیشنهاد خواست، بر اساس وضعیت واقعی پیشنهاد بده
- فارسی پاسخ بده و لحن حرفه‌ای داشته باش
- از markdown استفاده کن (لیست، بولد، جدول)`;

        // ============ ارسال به AI ============
        const provider = getProvider('gpt-4o-mini');
        const aiResponse = await provider.chat(
          [{ role: 'user', content: command }],
          {
            model: 'gpt-4o-mini',
            systemPrompt,
            temperature: 0.7,
            maxTokens: 1500,
          },
        );

        // ============ ذخیره پاسخ ============
        const updated = await prisma.clusterCommand.update({
          where: { id: cmd.id },
          data: {
            response: aiResponse.content,
            status: 'SUCCESS',
            metadata: JSON.stringify({
              tokensIn: aiResponse.tokensIn,
              tokensOut: aiResponse.tokensOut,
              costUsd: aiResponse.costUsd,
              model: aiResponse.model,
            }),
          },
        });

        return {
          id: updated.id,
          command: updated.command,
          response: updated.response,
          status: updated.status,
          createdAt: updated.createdAt,
          usage: {
            tokensIn: aiResponse.tokensIn,
            tokensOut: aiResponse.tokensOut,
            costUsd: aiResponse.costUsd,
          },
        };
      } catch (error: any) {
        app.log.error('Cluster command AI error:', error);

        await prisma.clusterCommand.update({
          where: { id: cmd.id },
          data: {
            response: `خطا: ${error.message || 'مشکلی در پردازش پیش آمد'}`,
            status: 'FAILED',
          },
        });

        throw new Error(`AI processing failed: ${error.message}`);
      }
    },
  );

  // ==================== COMMANDS LIST ====================
  app.get('/:slug/commands', async (request) => {
    const { slug } = request.params as { slug: string };
    const cluster = await prisma.cluster.findUnique({ where: { slug } });
    if (!cluster) throw new Error('Cluster not found');

    const commands = await prisma.clusterCommand.findMany({
      where: { clusterId: cluster.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return { items: commands };
  });
}