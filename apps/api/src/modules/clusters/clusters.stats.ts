import type { FastifyInstance } from 'fastify';
import { getProvider } from '../../lib/ai/factory.js';
import { ci } from '../../lib/dbmode.js';

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
        app.log.error({ err: error }, 'Cluster command AI error:');

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

  // ==================== PROCESS RUNS (میزکار فرایندمحور) ====================
  // slug = «all» → پرونده‌های همه‌ی خوشه‌ها. فیلتر: q (متن)، status، origin، صفحه‌بندی: skip/take
  app.get('/:slug/process-runs', { preHandler: [app.authenticate] }, async (request) => {
    const { slug } = request.params as { slug: string };
    const q = (request.query ?? {}) as { q?: string; status?: string; origin?: string; skip?: string; take?: string };
    const take = Math.min(100, Math.max(1, Number(q.take) || 30));
    const skip = Math.max(0, Number(q.skip) || 0);
    const where: Record<string, unknown> = { type: 'PROCESS_RUN' };
    if (slug !== 'all') {
      const cluster = await prisma.cluster.findUnique({ where: { slug } });
      if (!cluster) throw Object.assign(new Error('Cluster not found'), { statusCode: 404 });
      where.clusterId = cluster.id;
    }
    if (q.status === 'FAILED' || q.status === 'SUCCESS') where.status = q.status;
    if (q.q) where.title = { contains: String(q.q).slice(0, 100), ...ci };
    if (q.origin) where.metadata = { contains: `"origin":"${String(q.origin).replace(/[^a-z]/g, '')}"` };
    const [items, total] = await Promise.all([
      prisma.clusterOutput.findMany({
        where: where as never,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: { cluster: { select: { slug: true, name: true, icon: true, color: true } } },
      }),
      prisma.clusterOutput.count({ where: where as never }),
    ]);
    return { items, total };
  });

  app.post('/:slug/process-runs', { preHandler: [app.authenticate] }, async (request) => {
    const { slug } = request.params as { slug: string };
    const body = (request.body ?? {}) as {
      input?: string;
      status?: string;
      ms?: number;
      summary?: string;
      origin?: string;
      startedAt?: number;
      states?: unknown;
      trail?: unknown;
      log?: unknown;
    };
    const cluster = await prisma.cluster.findUnique({ where: { slug } });
    if (!cluster) throw Object.assign(new Error('Cluster not found'), { statusCode: 404 });
    const origin = ['manual', 'auto', 'event'].includes(String(body.origin)) ? String(body.origin) : 'manual';
    const base = { origin, startedAt: body.startedAt ?? Date.now() };
    // اندازه‌ی مجاز: اول گزارش متنی، بعد خروجی‌های بلند، در آخر وضعیت مرحله‌ها حذف می‌شود
    const trail = Array.isArray(body.trail) ? (body.trail as Array<Record<string, unknown>>) : [];
    const cut = (n: number) =>
      trail.map((t) => ({ ...t, output: typeof t.output === 'string' ? t.output.slice(0, n) : t.output }));
    const tries: unknown[] = [
      { ...base, states: body.states ?? {}, trail, log: body.log ?? [] },
      { ...base, states: body.states ?? {}, trail: cut(400), log: [] },
      { ...base, states: {}, trail: cut(120), log: [] },
      { ...base, states: {}, trail: [], log: [] },
    ];
    let metadata = JSON.stringify(tries[3]);
    for (const t of tries) {
      const m = JSON.stringify(t);
      if (m.length <= 90000) {
        metadata = m;
        break;
      }
    }
    const row = await prisma.clusterOutput.create({
      data: {
        clusterId: cluster.id,
        type: 'PROCESS_RUN',
        title: String(body.input ?? '').slice(0, 200) || 'پرونده',
        description: body.summary ? String(body.summary).slice(0, 500) : null,
        value: typeof body.ms === 'number' ? body.ms : null,
        unit: 'ms',
        status: body.status === 'FAILED' ? 'FAILED' : 'SUCCESS',
        metadata,
      },
    });
    return { id: row.id };
  });

  // ==================== GOALS (اهداف کاربر برای هر خوشه) ====================
  const METRICS = ['runs_done', 'success_rate', 'auto_share', 'real_actions', 'real_crm', 'real_booking', 'real_payment', 'avg_seconds', 'keyword'];
  const PERIODS = ['day', 'week', 'month'];

  app.get('/:slug/goals', { preHandler: [app.authenticate] }, async (request) => {
    const { slug } = request.params as { slug: string };
    const cluster = await prisma.cluster.findUnique({ where: { slug } });
    if (!cluster) throw Object.assign(new Error('Cluster not found'), { statusCode: 404 });
    const items = await prisma.clusterOutput.findMany({
      where: { clusterId: cluster.id, type: 'GOAL' },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
    return { items };
  });

  app.post('/:slug/goals', { preHandler: [app.authenticate] }, async (request) => {
    const { slug } = request.params as { slug: string };
    const b = (request.body ?? {}) as { title?: string; metric?: string; target?: number; period?: string; keyword?: string };
    const cluster = await prisma.cluster.findUnique({ where: { slug } });
    if (!cluster) throw Object.assign(new Error('Cluster not found'), { statusCode: 404 });
    const title = String(b.title ?? '').trim().slice(0, 160);
    const target = Number(b.target);
    if (!title) throw Object.assign(new Error('عنوان هدف لازم است'), { statusCode: 400 });
    if (!METRICS.includes(String(b.metric))) throw Object.assign(new Error('شاخص نامعتبر'), { statusCode: 400 });
    if (!Number.isFinite(target) || target <= 0) throw Object.assign(new Error('عدد هدف باید بزرگ‌تر از صفر باشد'), { statusCode: 400 });
    const period = PERIODS.includes(String(b.period)) ? String(b.period) : 'week';
    const count = await prisma.clusterOutput.count({ where: { clusterId: cluster.id, type: 'GOAL' } });
    if (count >= 20) throw Object.assign(new Error('حداکثر ۲۰ هدف برای هر خوشه'), { statusCode: 400 });
    const row = await prisma.clusterOutput.create({
      data: {
        clusterId: cluster.id,
        type: 'GOAL',
        title,
        description: period,
        value: target,
        unit: String(b.metric),
        status: 'ACTIVE',
        metadata: JSON.stringify({ keyword: String(b.keyword ?? '').trim().slice(0, 60) }),
      },
    });
    return row;
  });

  app.delete('/:slug/goals/:id', { preHandler: [app.authenticate] }, async (request) => {
    const { slug, id } = request.params as { slug: string; id: string };
    const cluster = await prisma.cluster.findUnique({ where: { slug } });
    if (!cluster) throw Object.assign(new Error('Cluster not found'), { statusCode: 404 });
    await prisma.clusterOutput.deleteMany({ where: { id, clusterId: cluster.id, type: 'GOAL' } });
    return { ok: true };
  });

  // ==================== PLANS (برنامه‌ی هوشمند رسیدن به هدف) ====================
  const parsePlanBody = (raw: unknown): string => {
    const json = JSON.stringify(raw ?? {});
    if (json.length > 60000) throw Object.assign(new Error('برنامه خیلی بزرگ است'), { statusCode: 400 });
    return json;
  };

  app.get('/:slug/plans', { preHandler: [app.authenticate] }, async (request) => {
    const { slug } = request.params as { slug: string };
    const cluster = await prisma.cluster.findUnique({ where: { slug } });
    if (!cluster) throw Object.assign(new Error('Cluster not found'), { statusCode: 404 });
    const items = await prisma.clusterOutput.findMany({
      where: { clusterId: cluster.id, type: 'PLAN' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return { items };
  });

  app.post('/:slug/plans', { preHandler: [app.authenticate] }, async (request) => {
    const { slug } = request.params as { slug: string };
    const b = (request.body ?? {}) as { title?: string; plan?: unknown };
    const cluster = await prisma.cluster.findUnique({ where: { slug } });
    if (!cluster) throw Object.assign(new Error('Cluster not found'), { statusCode: 404 });
    const title = String(b.title ?? '').trim().slice(0, 200);
    if (!title) throw Object.assign(new Error('عنوان هدف لازم است'), { statusCode: 400 });
    const count = await prisma.clusterOutput.count({ where: { clusterId: cluster.id, type: 'PLAN' } });
    if (count >= 20) throw Object.assign(new Error('حداکثر ۲۰ برنامه برای هر خوشه؛ یکی را حذف کنید'), { statusCode: 400 });
    return prisma.clusterOutput.create({
      data: { clusterId: cluster.id, type: 'PLAN', title, status: 'ACTIVE', metadata: parsePlanBody(b.plan) },
    });
  });

  app.patch('/:slug/plans/:id', { preHandler: [app.authenticate] }, async (request) => {
    const { slug, id } = request.params as { slug: string; id: string };
    const b = (request.body ?? {}) as { plan?: unknown; status?: string };
    const cluster = await prisma.cluster.findUnique({ where: { slug } });
    if (!cluster) throw Object.assign(new Error('Cluster not found'), { statusCode: 404 });
    const row = await prisma.clusterOutput.findFirst({ where: { id, clusterId: cluster.id, type: 'PLAN' } });
    if (!row) throw Object.assign(new Error('Plan not found'), { statusCode: 404 });
    return prisma.clusterOutput.update({
      where: { id },
      data: {
        ...(b.plan !== undefined ? { metadata: parsePlanBody(b.plan) } : {}),
        ...(b.status === 'ACTIVE' || b.status === 'DONE' ? { status: b.status } : {}),
      },
    });
  });

  app.delete('/:slug/plans/:id', { preHandler: [app.authenticate] }, async (request) => {
    const { slug, id } = request.params as { slug: string; id: string };
    const cluster = await prisma.cluster.findUnique({ where: { slug } });
    if (!cluster) throw Object.assign(new Error('Cluster not found'), { statusCode: 404 });
    await prisma.clusterOutput.deleteMany({ where: { id, clusterId: cluster.id, type: 'PLAN' } });
    return { ok: true };
  });
}
