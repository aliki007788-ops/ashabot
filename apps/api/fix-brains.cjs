const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 شروع اصلاح روابط مغزها...\n');

  const brains = await prisma.brain.findMany();
  const central = brains.find(b => b.isCentral || b.slug === 'central');
  if (!central) {
    console.error('❌ مغز مرکزی پیدا نشد!');
    return;
  }

  const brainMap = {};
  brains.forEach(b => { brainMap[b.slug] = b.id; });

  console.log('✅ مغزها بارگذاری شدند');
  console.log(`   - مرکزی: ${central.name}`);

  await prisma.botBrain.deleteMany();
  console.log('🗑️  روابط قبلی پاک شدند');

  const bots = await prisma.bot.findMany({
    include: { cluster: true }
  });

  console.log(`📦 تعداد ربات‌ها: ${bots.length}`);

  let centralCount = 0;
  let specializedCount = 0;

  for (const bot of bots) {
    // همیشه به مغز مرکزی
    await prisma.botBrain.create({
      data: {
        botId: bot.id,
        brainId: central.id
      }
    });
    centralCount++;

    // مغز تخصصی خوشه
    if (bot.cluster) {
      let specializedSlug = 'central';

      switch (bot.cluster.slug) {
        case 'sales':
        case 'lead-generation':
          specializedSlug = 'sales-brain';
          break;
        case 'support':
          specializedSlug = 'support-brain';
          break;
        case 'analytics':
          specializedSlug = 'analytics-brain';
          break;
        case 'marketing':
          specializedSlug = 'marketing-brain';
          break;
        default:
          specializedSlug = 'central';
      }

      const specializedId = brainMap[specializedSlug];
      if (specializedId && specializedId !== central.id) {
        await prisma.botBrain.create({
          data: {
            botId: bot.id,
            brainId: specializedId
          }
        });
        specializedCount++;
      }
    }
  }

  console.log('\n🎉 اصلاح با موفقیت انجام شد!');
  console.log(`   - اتصال به مغز مرکزی: ${centralCount}`);
  console.log(`   - اتصال به مغز تخصصی: ${specializedCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());