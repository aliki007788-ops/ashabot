const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧠 Bot-Brain Connection Report\n');
  console.log('='.repeat(70));

  const clusters = await prisma.cluster.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      bots: {
        include: {
          brains: {
            include: { brain: true },
          },
        },
        orderBy: { slug: 'asc' },
      },
    },
  });

  let totalBots = 0;
  let botsWithCentral = 0;
  let botsWithSpecialist = 0;
  let botsWithBoth = 0;
  let botsWithNone = 0;
  let botsWithMultipleSpecialists = 0;

  const issues = [];

  // نقشه خوشه → مغز تخصصی مورد انتظار
  const expectedBrainMap = {
    sales: 'sales-brain',
    'lead-generation': 'sales-brain',
    support: 'support-brain',
    finance: 'finance-brain',
    inventory: 'inventory-brain',
    marketing: 'marketing-brain',
    analytics: 'analytics-brain',
    hr: 'hr-brain',
    'supply-chain': 'supply-brain',
    innovation: 'innovation-brain',
  };

  for (const cluster of clusters) {
    console.log(`\n📦 ${cluster.icon} ${cluster.name} (${cluster.slug})`);
    console.log(`   ربات‌ها: ${cluster.bots.length}`);
    const expectedBrain = expectedBrainMap[cluster.slug];
    console.log(`   مغز تخصصی مورد انتظار: ${expectedBrain}\n`);

    for (const bot of cluster.bots) {
      totalBots++;

      const brainSlugs = bot.brains.map((bb) => bb.brain.slug);
      const hasCentral = brainSlugs.includes('central');
      const specialistBrains = brainSlugs.filter((s) => s !== 'central');

      if (hasCentral) botsWithCentral++;
      if (specialistBrains.length > 0) botsWithSpecialist++;
      if (hasCentral && specialistBrains.length > 0) botsWithBoth++;
      if (brainSlugs.length === 0) botsWithNone++;
      if (specialistBrains.length > 1) botsWithMultipleSpecialists++;

      const status =
        brainSlugs.length === 0
          ? '❌ بدون مغز'
          : hasCentral && specialistBrains.length > 0
          ? '✅ کامل'
          : hasCentral
          ? '⚠️ فقط مرکزی'
          : '⚠️ بدون مرکزی';

      const brainList = brainSlugs.length > 0 ? brainSlugs.join(', ') : '—';
      console.log(
        `   ${bot.isPremium ? '⭐' : '  '} ${bot.icon} ${bot.name.padEnd(40)} ${status.padEnd(20)} [${brainList}]`,
      );

      // چک مشکل
      if (brainSlugs.length === 0) {
        issues.push(`❌ ${bot.slug} (${cluster.slug}): هیچ مغزی متصل نیست`);
      } else if (!hasCentral) {
        issues.push(`⚠️ ${bot.slug} (${cluster.slug}): مغز مرکزی متصل نیست`);
      } else if (expectedBrain && !specialistBrains.includes(expectedBrain)) {
        issues.push(
          `⚠️ ${bot.slug} (${cluster.slug}): مغز تخصصی ${expectedBrain} متصل نیست (فعلاً: ${specialistBrains.join(', ') || 'هیچ'})`,
        );
      }
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 خلاصه:\n');
  console.log(`   کل ربات‌ها:                    ${totalBots}`);
  console.log(`   با مغز مرکزی:                  ${botsWithCentral}`);
  console.log(`   با مغز تخصصی:                  ${botsWithSpecialist}`);
  console.log(`   با هر دو (مرکزی + تخصصی):      ${botsWithBoth}`);
  console.log(`   با بیش از 1 مغز تخصصی:         ${botsWithMultipleSpecialists}`);
  console.log(`   بدون هیچ مغزی:                 ${botsWithNone}`);

  console.log('\n' + '='.repeat(70));
  console.log('🚨 مشکلات:\n');

  if (issues.length === 0) {
    console.log('   ✅ هیچ مشکلی نیست! همه ربات‌ها درست متصل هستن.');
  } else {
    console.log(`   ${issues.length} مشکل پیدا شد:\n`);
    issues.forEach((i) => console.log('   ' + i));
  }

  console.log('\n' + '='.repeat(70));
  console.log('🧠 مغزها:\n');

  const brains = await prisma.brain.findMany({
    include: {
      _count: { select: { bots: true } },
    },
    orderBy: { isCentral: 'desc' },
  });

  brains.forEach((b) => {
    console.log(
      `   ${b.isCentral ? '🌐' : '  '} ${b.icon} ${b.name.padEnd(30)} → ${b._count.bots} ربات ${b.isCentral ? '[مرکزی]' : ''}`,
    );
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());