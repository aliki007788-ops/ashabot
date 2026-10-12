const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding cluster mock data...\n');

  const clusters = await prisma.cluster.findMany({ include: { bots: true } });
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  await prisma.clusterOutput.deleteMany();
  await prisma.botRun.deleteMany();
  await prisma.clusterCommand.deleteMany();

  const outputTypes = {
    sales: { type: 'ORDER', title: 'سفارش جدید ثبت شد', unit: 'تومان' },
    'lead-generation': { type: 'LEAD', title: 'سرنخ جدید', unit: 'نفر' },
    support: { type: 'TICKET', title: 'تیکت حل شد', unit: 'تیکت' },
    finance: { type: 'PAYMENT', title: 'پرداخت دریافت شد', unit: 'تومان' },
    inventory: { type: 'STOCK', title: 'موجودی به‌روز شد', unit: 'قلم' },
    marketing: { type: 'CAMPAIGN', title: 'کمپین اجرا شد', unit: 'نفر' },
    analytics: { type: 'REPORT', title: 'گزارش تهیه شد', unit: 'گزارش' },
    hr: { type: 'TASK', title: 'وظیفه تکمیل شد', unit: 'وظیفه' },
    'supply-chain': { type: 'SHIPMENT', title: 'محموله تحویل شد', unit: 'محموله' },
    innovation: { type: 'IDEA', title: 'ایده ثبت شد', unit: 'ایده' },
  };

  for (const cluster of clusters) {
    console.log(`📊 ${cluster.name} (${cluster.bots.length} bots)`);

    for (const bot of cluster.bots) {
      const statuses = ['ACTIVE', 'QUEUED', 'IDLE', 'IDLE', 'IDLE'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      const tasks = {
        ACTIVE: ['در حال پردازش پیام', 'تحلیل داده', 'پاسخ به مشتری'],
        QUEUED: ['در صف پردازش', 'انتظار برای داده'],
        IDLE: [null],
      };

      const taskList = tasks[status] || [null];
      const taskType = taskList[Math.floor(Math.random() * taskList.length)];

      await prisma.botRun.create({
        data: {
          botId: bot.id,
          status,
          taskType,
          startedAt: status === 'ACTIVE' ? new Date(now.getTime() - 60000) : null,
          durationMs: status !== 'IDLE' ? Math.floor(Math.random() * 5000) : null,
        },
      });
    }

    const cfg = outputTypes[cluster.slug] || { type: 'MESSAGE', title: 'خروجی', unit: 'مورد' };
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const randomBot = cluster.bots[Math.floor(Math.random() * cluster.bots.length)];
      await prisma.clusterOutput.create({
        data: {
          clusterId: cluster.id,
          type: cfg.type,
          title: cfg.title,
          description: `تولید شده توسط ${randomBot?.name || 'سیستم'}`,
          value: Math.floor(Math.random() * 1000000) + 100000,
          unit: cfg.unit,
          status: 'SUCCESS',
          botId: randomBot?.id,
          createdAt: new Date(today.getTime() + Math.random() * 86400000),
        },
      });
    }

    const sampleCmds = [
      'گزارش امروز رو بده',
      'مشتریان در خطر ریزش رو لیست کن',
      'عملکرد هفته گذشته چطور بود؟',
      'پیشنهاد بهبود بده',
    ];
    for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
      await prisma.clusterCommand.create({
        data: {
          clusterId: cluster.id,
          command: sampleCmds[Math.floor(Math.random() * sampleCmds.length)],
          response: 'در حال پردازش...',
          status: 'SUCCESS',
        },
      });
    }
  }

  const counts = {
    runs: await prisma.botRun.count(),
    outputs: await prisma.clusterOutput.count(),
    commands: await prisma.clusterCommand.count(),
  };
  console.log('\n✅ Done!', counts);
}

main().catch(console.error).finally(() => prisma.$disconnect());