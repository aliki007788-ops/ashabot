const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('=== Database Info ===');
    console.log('Working directory:', process.cwd());

    const count = await prisma.bot.count();
    console.log('Total Bots:', count);
    console.log('');

    const bots = await prisma.bot.findMany({
      select: { id: true, name: true, slug: true, isActive: true },
    });

    console.log('=== Bots List ===');
    bots.forEach((b, i) => {
      console.log(`${i + 1}. ${b.id} | ${b.name} | ${b.slug} | active:${b.isActive}`);
    });

    const testId = 'cmuu1313q000guujzqgic5zat';
    console.log('');
    console.log('=== Test findUnique ===');
    console.log('Looking for:', testId);

    const bot = await prisma.bot.findUnique({ where: { id: testId } });

    if (bot) {
      console.log('FOUND:', bot.name);
    } else {
      console.log('NOT FOUND - All IDs:');
      bots.forEach((b) => console.log('  -', b.id));
    }
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);