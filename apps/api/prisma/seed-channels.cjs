/**
 * ASHA — Seed New Channels
 * اضافه کردن 7 کانال جدید به دیتابیس
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const NEW_CHANNELS = [
  {
    name: 'گپ',
    slug: 'gap',
    type: 'GAP',
    icon: '🟡',
  },
  {
    name: 'ایمیل',
    slug: 'email',
    type: 'EMAIL',
    icon: '📧',
  },
  {
    name: 'پیامک',
    slug: 'sms',
    type: 'SMS',
    icon: '📱',
  },
  {
    name: 'توییتر / X',
    slug: 'twitter',
    type: 'TWITTER',
    icon: '🐦',
  },
  {
    name: 'لینکدین',
    slug: 'linkedin',
    type: 'LINKEDIN',
    icon: '💼',
  },
  {
    name: 'یوتیوب',
    slug: 'youtube',
    type: 'YOUTUBE',
    icon: '▶️',
  },
  {
    name: 'فیسبوک',
    slug: 'facebook',
    type: 'FACEBOOK',
    icon: '👤',
  },
];

async function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║  📱 ASHA — Seed New Channels                      ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  let created = 0;
  let updated = 0;

  for (const ch of NEW_CHANNELS) {
    const existing = await prisma.channel.findUnique({
      where: { slug: ch.slug },
    });

    if (existing) {
      await prisma.channel.update({
        where: { slug: ch.slug },
        data: {
          name: ch.name,
          icon: ch.icon,
          type: ch.type,
        },
      });
      updated++;
      console.log(`🔄 به‌روز: ${ch.icon} ${ch.name} (${ch.slug})`);
    } else {
      await prisma.channel.create({
        data: {
          name: ch.name,
          slug: ch.slug,
          type: ch.type,
          icon: ch.icon,
          isActive: true,
          isConnected: false,
        },
      });
      created++;
      console.log(`➕ ایجاد: ${ch.icon} ${ch.name} (${ch.slug})`);
    }
  }

  console.log('\n📊 خلاصه:');
  console.log('─'.repeat(55));
  console.log(`   ➕ ایجاد: ${created}`);
  console.log(`   🔄 به‌روز: ${updated}`);
  console.log('─'.repeat(55));

  // آمار کل
  const all = await prisma.channel.findMany({
    orderBy: { name: 'asc' },
    select: { name: true, slug: true, type: true, icon: true, isActive: true },
  });

  console.log(`\n📱 کل کانال‌ها (${all.length}):\n`);
  all.forEach((c) => {
    console.log(`   ${c.icon} ${c.name.padEnd(20)} (${c.slug.padEnd(15)}) — ${c.type}`);
  });

  console.log('\n🎉 تمام!');
}

main()
  .catch((e) => {
    console.error('❌ خطا:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());