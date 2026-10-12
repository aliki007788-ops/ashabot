const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clusters = await prisma.cluster.findMany({ orderBy: { sortOrder: 'asc' } });
  const brains = await prisma.brain.findMany();
  const premiumBots = await prisma.bot.count({ where: { isPremium: true } });
  const regularBots = await prisma.bot.count({ where: { isPremium: false } });
  const templates = await prisma.bot.count({ where: { isTemplate: true } });

  console.log('=== CLUSTERS (' + clusters.length + ') ===');
  clusters.forEach(c => console.log('  [' + c.sortOrder + '] ' + c.icon + ' ' + c.name + ' (' + c.slug + ')'));
  
  console.log('');
  console.log('=== BRAINS (' + brains.length + ') ===');
  brains.forEach(b => console.log('  ' + b.icon + ' ' + b.name + ' (' + b.slug + ')' + (b.isCentral ? ' [CENTRAL]' : '')));
  
  console.log('');
  console.log('=== BOTS ===');
  console.log('  Premium: ' + premiumBots);
  console.log('  Regular: ' + regularBots);
  console.log('  Templates: ' + templates);
  console.log('  Total: ' + (premiumBots + regularBots));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());