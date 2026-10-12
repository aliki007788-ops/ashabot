const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║  🔧 ASHA — Fix All Bots as Templates              ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  // آمار قبل
  const before = {
    total: await prisma.bot.count(),
    templates: await prisma.bot.count({ where: { isTemplate: true } }),
    nonTemplates: await prisma.bot.count({ where: { isTemplate: false } }),
  };

  console.log('📊 قبل از آپدیت:');
  console.log(`   کل ربات‌ها:        ${before.total}`);
  console.log(`   Template:          ${before.templates}`);
  console.log(`   غیر-Template:      ${before.nonTemplates}\n`);

  // آپدیت همه ربات‌ها
  console.log('🔄 در حال آپدیت...');
  const result = await prisma.bot.updateMany({
    where: { isTemplate: false },
    data: { isTemplate: true },
  });
  console.log(`✅ ${result.count} ربات آپدیت شد\n`);

  // آمار بعد
  const after = {
    total: await prisma.bot.count(),
    templates: await prisma.bot.count({ where: { isTemplate: true } }),
    nonTemplates: await prisma.bot.count({ where: { isTemplate: false } }),
    premium: await prisma.bot.count({ where: { isPremium: true } }),
    regular: await prisma.bot.count({ where: { isPremium: false } }),
  };

  console.log('📊 بعد از آپدیت:');
  console.log('─'.repeat(55));
  console.log(`   کل ربات‌ها:        ${after.total} ${after.total === 135 ? '✅' : '⚠️'}`);
  console.log(`   Template:          ${after.templates} ${after.templates === after.total ? '✅' : '⚠️'}`);
  console.log(`   غیر-Template:      ${after.nonTemplates} ${after.nonTemplates === 0 ? '✅' : '⚠️'}`);
  console.log(`   پرمیوم:            ${after.premium} ${after.premium === 13 ? '✅' : '⚠️'}`);
  console.log(`   عادی:              ${after.regular}`);
  console.log('─'.repeat(55));

  // آمار خوشه‌ها
  console.log('\n📦 ربات‌ها در هر خوشه:\n');
  const clusters = await prisma.cluster.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { bots: true } } },
  });

  let totalClusterBots = 0;
  for (const c of clusters) {
    console.log(`   ${c.icon} ${c.name.padEnd(30)} → ${c._count.bots} ربات`);
    totalClusterBots += c._count.bots;
  }
  console.log('─'.repeat(55));
  console.log(`   جمع: ${totalClusterBots} ربات در ${clusters.length} خوشه`);

  console.log('\n' + '╔' + '═'.repeat(52) + '╗');
  console.log('║' + '  🎉 همه ربات‌ها به Template تبدیل شدن!'.padEnd(52) + '║');
  console.log('╚' + '═'.repeat(52) + '╝\n');
}

main().catch(console.error).finally(() => prisma.$disconnect());