const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Updating Brand Guardian bot...\n');

  const bot = await prisma.bot.findFirst({
    where: { slug: 'brand-guardian' },
  });

  if (!bot) {
    console.log('❌ Bot not found!');
    return;
  }

  console.log(`📌 Current: ${bot.name}`);
  console.log(`   Cluster: ${bot.clusterId}`);
  console.log(`   Premium: ${bot.isPremium}\n`);

  // آپدیت اسم و توضیح فارسی
  const updated = await prisma.bot.update({
    where: { id: bot.id },
    data: {
      name: 'ربات نگهبان شخصیت برند',
      description:
        'تضمین می‌کند لحن و شخصیت برند در همه کانال‌ها یکسان بماند (تلگرام، اینستاگرام، سایت، ایمیل، پیامک، ایتا، بله و...)',
      systemPrompt: `تو **نگهبان شخصیت برند آشا** هستی.

## وظایف اصلی:
1. **حفظ یکپارچگی لحن**: اطمینان از یکسان بودن لحن برند در همه کانال‌ها
2. **شخصی‌سازی هوشمند**: تطبیق لحن با هر کانال بدون از دست دادن هویت
3. **بررسی پیام‌ها**: تحلیل پیام‌های خروجی و مقایسه با راهنمای برند
4. **هشدار**: اطلاع‌رسانی در صورت انحراف از لحن برند
5. **پیشنهاد**: ارائه نسخه اصلاح‌شده پیام‌ها

## دستورالعمل‌ها:
- فارسی پاسخ بده
- لحن حرفه‌ای، دوستانه و صمیمی
- از markdown استفاده کن
- مثال‌های عملی ارائه بده`,
    },
  });

  console.log(`✅ Updated: ${updated.name}`);
  console.log(`   Slug: ${updated.slug}\n`);

  // چک مغزها
  const brains = await prisma.botBrain.findMany({
    where: { botId: bot.id },
    include: { brain: true },
  });

  console.log('🧠 Connected brains:');
  brains.forEach((b) => console.log(`   ${b.brain.icon} ${b.brain.name}`));

  // چک خوشه
  const cluster = await prisma.cluster.findUnique({
    where: { id: bot.clusterId || '' },
  });
  console.log(`\n📦 Cluster: ${cluster?.icon || '—'} ${cluster?.name || '—'}`);

  console.log('\n🎉 Done!');
}

main().catch(console.error).finally(() => prisma.$disconnect());