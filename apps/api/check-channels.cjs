const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const channels = await prisma.channel.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { botChannels: true, connections: true, conversations: true } },
    },
  });

  console.log('=== CHANNELS (' + channels.length + ') ===\n');
  for (const c of channels) {
    console.log(`${c.icon} ${c.name} (${c.slug})`);
    console.log(`   type: ${c.type}`);
    console.log(`   isActive:    ${c.isActive}`);
    console.log(`   isConnected: ${c.isConnected}`);
    console.log(`   bots: ${c._count.botChannels}, connections: ${c._count.connections}, conversations: ${c._count.conversations}`);
    console.log('');
  }

  const summary = {
    total: channels.length,
    active: channels.filter(c => c.isActive).length,
    inactive: channels.filter(c => !c.isActive).length,
    connected: channels.filter(c => c.isConnected).length,
  };
  console.log('📊 خلاصه:');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());