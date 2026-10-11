const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const fakeEmails = ['ali@test.com', 'ali@gmail.com'];
  
  const fakeUsers = await prisma.user.findMany({
    where: { email: { in: fakeEmails } },
    select: { id: true },
  });
  const ids = fakeUsers.map(u => u.id);
  
  console.log('Found fake users:', ids.length);
  
  await prisma.message.deleteMany({
    where: { conversation: { userId: { in: ids } } }
  });
  console.log('✅ Messages deleted');
  
  await prisma.conversation.deleteMany({
    where: { userId: { in: ids } }
  });
  console.log('✅ Conversations deleted');
  
  await prisma.refreshToken.deleteMany({
    where: { userId: { in: ids } }
  });
  console.log('✅ Refresh tokens deleted');
  
  await prisma.bot.updateMany({
    where: { userId: { in: ids } },
    data: { userId: null }
  });
  console.log('✅ Bot ownership unset');
  
  const deleted = await prisma.user.deleteMany({
    where: { id: { in: ids } }
  });
  console.log('✅ Users deleted:', deleted.count);
  console.log('🎉 Cleanup complete!');
}

main()
  .catch(e => console.error('❌ Error:', e))
  .finally(() => prisma.$disconnect());