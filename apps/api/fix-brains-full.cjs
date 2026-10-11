const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 شروع اتصال کامل مغزها به همه ربات‌ها...\n');

  const brains = await prisma.brain.findMany();
  const central = brains.find(b => b.isCentral || b.slug === 'central');
  if (!central) {
    console.error('❌ مغز مرکزی پیدا نشد!');
    return;
  }

  const brainMap = {};
  brains.forEach(b => { brainMap[b.slug] = b.id; });

  console.log('✅ مغزها:');
  Object.keys(brainMap).forEach(slug => console.log(`   - ${slug}`));

  // پاک کردن روابط قبلی
  await prisma.botBrain.deleteMany();
  console.log('\n🗑️  روابط قبلی پاک شدند');

  const bots = await prisma.bot.findMany({
    include: { cluster: true }
  });

  console.log(`📦 تعداد ربات‌ها: ${bots.length}\n`);

  let centralCount = 0;
  let specializedCount = 0;

  const mapping = {
    'sales': 'sales-brain',
    'lead-generation': 'sales-brain',
    'support': 'support-brain',
    'analytics': 'analytics-brain',
    'marketing': 'marketing-brain',
    'finance': 'finance-brain',
    'inventory': 'inventory-brain',
    'hr': 'hr-brain',
    'supply-chain': 'supply-brain',
    'innovation': 'innovation-brain',
  };

  for (const bot of bots) {
    // ۱. همیشه به مغز مرکزی
    await prisma.botBrain.create({
      data: { botId: bot.id, brainId: central.id }
    });
    centralCount++;

    // ۲. مغز تخصصی خوشه
    if (bot.cluster && mapping[bot.cluster.slug]) {
      const specializedId = brainMap[mapping[bot.cluster.slug]];
      if (specializedId) {
        await prisma.botBrain.create({
          data: { botId: bot.id, brainId: specializedId }
        });
        specializedCount++;
      }
    }
  }

  console.log('🎉 اتصال کامل انجام شد!');
  console.log(`   - اتصال به مغز مرکزی     : ${centralCount}`);
  console.log(`   - اتصال به مغز تخصصی     : ${specializedCount}`);
  console.log(`   - جمع کل روابط          : ${centralCount + specializedCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());