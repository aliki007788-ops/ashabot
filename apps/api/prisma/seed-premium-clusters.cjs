/**
 * ============================================================
 *  ASHA PLATFORM — Premium Clusters Seed
 * ============================================================
 *  این اسکریپت 5 خوشه پرمیوم جدید می‌سازد و هر ربات پرمیوم
 *  را به خوشه اختصاصی خودش منتقل می‌کند.
 *
 *  نتیجه: از 13 خوشه به 18 خوشه، از 13 مغز به 18 مغز.
 *  هر ربات پرمیوم به 2 مغز وصل می‌شود:
 *   - مغز مرکزی (central)
 *   - مغز تخصصی خوشه پرمیوم
 * ============================================================
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============================================================
// 1. تعریف 5 خوشه پرمیوم جدید
// ============================================================
const PREMIUM_CLUSTERS = [
  {
    name: 'مربی یادگیری تطبیقی',
    slug: 'premium-learning',
    icon: '🎓',
    color: '#8b5cf6',
    sortOrder: 14,
    description: 'یادگیری شخصی‌سازی‌شده با تطبیق لحظه‌ای مسیر آموزشی',
  },
  {
    name: 'تحلیل‌گر اسناد حقوقی',
    slug: 'premium-legal',
    icon: '📝',
    color: '#7c3aed',
    sortOrder: 15,
    description: 'تحلیل عمیق اسناد حقوقی با هوش مصنوعی پیشرفته',
  },
  {
    name: 'Zero-Trust Enforcer',
    slug: 'premium-security',
    icon: '🔒',
    color: '#dc2626',
    sortOrder: 16,
    description: 'اجرای مدل امنیتی Zero-Trust در تمام لایه‌ها',
  },
  {
    name: 'هماهنگ‌کننده چندزبانه',
    slug: 'premium-multilang',
    icon: '🌐',
    color: '#0891b2',
    sortOrder: 17,
    description: 'هماهنگی چندزبانه در تمام کانال‌ها و بخش‌ها',
  },
  {
    name: 'تحلیل‌گر احساسات صوتی',
    slug: 'premium-voice',
    icon: '📞',
    color: '#ea580c',
    sortOrder: 18,
    description: 'تحلیل احساسات در مکالمات صوتی و تماس‌ها',
  },
];

// ============================================================
// 2. تعریف 5 مغز پرمیوم جدید
// ============================================================
const PREMIUM_BRAINS = [
  {
    name: 'مغز یادگیری تطبیقی',
    slug: 'premium-learning-brain',
    icon: '🎓',
    color: '#8b5cf6',
    description: 'بهینه‌سازی پویای مسیر یادگیری',
  },
  {
    name: 'مغز تحلیل حقوقی',
    slug: 'premium-legal-brain',
    icon: '📝',
    color: '#7c3aed',
    description: 'تحلیل عمیق اسناد و ریسک حقوقی',
  },
  {
    name: 'مغز Zero-Trust',
    slug: 'premium-security-brain',
    icon: '🔒',
    color: '#dc2626',
    description: 'تحلیل مستمر امنیتی و Zero-Trust',
  },
  {
    name: 'مغز چندزبانه',
    slug: 'premium-multilang-brain',
    icon: '🌐',
    color: '#0891b2',
    description: 'هماهنگی چندزبانه و حفظ هویت برند',
  },
  {
    name: 'مغز تحلیل صوتی',
    slug: 'premium-voice-brain',
    icon: '📞',
    color: '#ea580c',
    description: 'تحلیل لحن، احساسات و کیفیت مکالمات صوتی',
  },
];

// ============================================================
// 3. نقشه: کدام ربات پرمیوم → کدام خوشه پرمیوم
// ============================================================
const BOT_TO_PREMIUM_CLUSTER = {
  'adaptive-learning-coach': 'premium-learning',
  'legal-doc-analyzer': 'premium-legal',
  'zero-trust-enforcer': 'premium-security',
  'multi-lang-orchestrator': 'premium-multilang',
  'voice-sentiment': 'premium-voice',
};

// ============================================================
// 4. نقشه: کدام خوشه پرمیوم → کدام مغز تخصصی
// ============================================================
const CLUSTER_TO_BRAIN = {
  'premium-learning': 'premium-learning-brain',
  'premium-legal': 'premium-legal-brain',
  'premium-security': 'premium-security-brain',
  'premium-multilang': 'premium-multilang-brain',
  'premium-voice': 'premium-voice-brain',
};

// ============================================================
// 5. توابع کمکی
// ============================================================
function log(icon, msg) {
  console.log(`${icon} ${msg}`);
}

function logSection(title) {
  console.log('\n' + '═'.repeat(60));
  console.log(`  ${title}`);
  console.log('═'.repeat(60));
}

// ============================================================
// 6. تابع اصلی
// ============================================================
async function main() {
  const startTime = Date.now();

  console.log('\n╔' + '═'.repeat(58) + '╗');
  console.log('║' + '  ⭐ ASHA — Premium Clusters Seed'.padEnd(58) + '║');
  console.log('║' + '  5 خوشه پرمیوم اختصاصی برای 5 ربات طلایی'.padEnd(58) + '║');
  console.log('╚' + '═'.repeat(58) + '╝');

  // ─────────────────────────────────────────────
  // مرحله ۱: ساخت 5 خوشه پرمیوم
  // ─────────────────────────────────────────────
  logSection('📍 مرحله ۱: ۵ خوشه پرمیوم');

  const clusterMap = {};
  for (const c of PREMIUM_CLUSTERS) {
    const cluster = await prisma.cluster.upsert({
      where: { slug: c.slug },
      update: c,
      create: c,
    });
    clusterMap[c.slug] = cluster.id;
    log('✅', `خوشه: ${c.icon} ${c.name} (${c.slug})`);
  }

  // ─────────────────────────────────────────────
  // مرحله ۲: ساخت 5 مغز پرمیوم
  // ─────────────────────────────────────────────
  logSection('🧠 مرحله ۲: ۵ مغز پرمیوم');

  const brainMap = {};
  for (const b of PREMIUM_BRAINS) {
    const brain = await prisma.brain.upsert({
      where: { slug: b.slug },
      update: b,
      create: b,
    });
    brainMap[b.slug] = brain.id;
    log('✅', `مغز: ${b.icon} ${b.name} (${b.slug})`);
  }

  // مغز مرکزی
  const centralBrain = await prisma.brain.findFirst({ where: { isCentral: true } });
  if (!centralBrain) throw new Error('❌ مغز مرکزی یافت نشد!');
  log('✅', `مغز مرکزی: ${centralBrain.icon} ${centralBrain.name}`);

  // ─────────────────────────────────────────────
  // مرحله ۳: انتقال ربات‌های پرمیوم به خوشه‌های پرمیوم
  // ─────────────────────────────────────────────
  logSection('🚚 مرحله ۳: انتقال ۵ ربات پرمیوم');

  let moved = 0;
  let connectionsCreated = 0;
  let oldConnectionsRemoved = 0;

  for (const [botSlug, clusterSlug] of Object.entries(BOT_TO_PREMIUM_CLUSTER)) {
    const bot = await prisma.bot.findUnique({
      where: { slug: botSlug },
      include: { brains: true },
    });

    if (!bot) {
      log('⚠️', `ربات ${botSlug} یافت نشد`);
      continue;
    }

    const newClusterId = clusterMap[clusterSlug];
    const newBrainSlug = CLUSTER_TO_BRAIN[clusterSlug];
    const newBrainId = brainMap[newBrainSlug];

    if (!newClusterId || !newBrainId) {
      log('⚠️', `خوشه یا مغز پرمیوم برای ${botSlug} یافت نشد`);
      continue;
    }

    const oldClusterId = bot.clusterId;

    // 1) انتقال ربات به خوشه پرمیوم
    await prisma.bot.update({
      where: { id: bot.id },
      data: {
        clusterId: newClusterId,
        isPremium: true,
        isTemplate: true,
      },
    });
    moved++;

    // 2) حذف مغز تخصصی قدیمی (به جز central)
    const oldSpecialistConnections = bot.brains.filter(
      (bb) => bb.brainId !== centralBrain.id,
    );
    for (const conn of oldSpecialistConnections) {
      await prisma.botBrain.delete({
        where: {
          botId_brainId: { botId: bot.id, brainId: conn.brainId },
        },
      });
      oldConnectionsRemoved++;
    }

    // 3) اتصال به مغز central (اگه نبود)
    await prisma.botBrain.upsert({
      where: {
        botId_brainId: { botId: bot.id, brainId: centralBrain.id },
      },
      update: {},
      create: { botId: bot.id, brainId: centralBrain.id },
    });

    // 4) اتصال به مغز تخصصی جدید
    await prisma.botBrain.upsert({
      where: {
        botId_brainId: { botId: bot.id, brainId: newBrainId },
      },
      update: {},
      create: { botId: bot.id, brainId: newBrainId },
    });
    connectionsCreated += 2;

    log(
      '🎯',
      `${bot.icon} ${bot.name}\n         خوشه: ${oldClusterId ? 'قدیمی' : '—'} → ${clusterSlug}\n         مغز: central + ${newBrainSlug}`,
    );
  }

  // ─────────────────────────────────────────────
  // مرحله ۴: گزارش نهایی
  // ─────────────────────────────────────────────
  logSection('📊 مرحله ۴: گزارش نهایی');

  const [
    totalClusters,
    totalBrains,
    totalBots,
    totalPremium,
    totalRegular,
    totalTemplates,
    totalConnections,
  ] = await Promise.all([
    prisma.cluster.count(),
    prisma.brain.count(),
    prisma.bot.count(),
    prisma.bot.count({ where: { isPremium: true } }),
    prisma.bot.count({ where: { isPremium: false } }),
    prisma.bot.count({ where: { isTemplate: true } }),
    prisma.botBrain.count(),
  ]);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n📈 آمار پلتفرم:');
  console.log('─'.repeat(60));
  console.log(`   🏢 خوشه‌ها:           ${totalClusters} ${totalClusters === 18 ? '✅' : '⚠️'} (هدف: 18)`);
  console.log(`   🧠 مغزها:             ${totalBrains} ${totalBrains === 18 ? '✅' : '⚠️'} (هدف: 18)`);
  console.log(`   🤖 کل ربات‌ها:        ${totalBots} ${totalBots === 135 ? '✅' : '⚠️'} (هدف: 135)`);
  console.log(`   ⭐ ربات‌های پرمیوم:   ${totalPremium} ${totalPremium === 13 ? '✅' : '⚠️'}`);
  console.log(`   📦 ربات‌های عادی:    ${totalRegular}`);
  console.log(`   🎯 Template‌ها:       ${totalTemplates}`);
  console.log(`   🔗 اتصالات مغز:      ${totalConnections}`);
  console.log('─'.repeat(60));

  console.log('\n🎬 این اجرا:');
  console.log('─'.repeat(60));
  console.log(`   ➕ خوشه‌های پرمیوم:    ${PREMIUM_CLUSTERS.length}`);
  console.log(`   ➕ مغزهای پرمیوم:      ${PREMIUM_BRAINS.length}`);
  console.log(`   🚚 ربات‌های منتقل‌شده:  ${moved}`);
  console.log(`   🔗 اتصالات جدید:      ${connectionsCreated}`);
  console.log(`   🗑️  اتصالات قدیمی:     ${oldConnectionsRemoved} (حذف شد)`);
  console.log(`   ⏱️  زمان اجرا:        ${duration} ثانیه`);
  console.log('─'.repeat(60));

  // گزارش 5 خوشه پرمیوم
  console.log('\n⭐ خوشه‌های پرمیوم نهایی:\n');
  for (const pc of PREMIUM_CLUSTERS) {
    const cluster = await prisma.cluster.findUnique({
      where: { slug: pc.slug },
      include: {
        bots: { select: { name: true, icon: true, isPremium: true } },
      },
    });
    if (cluster) {
      console.log(`   ${cluster.icon} ${cluster.name}`);
      for (const b of cluster.bots) {
        console.log(`      ${b.isPremium ? '⭐' : '  '} ${b.icon} ${b.name}`);
      }
    }
  }

  console.log('\n' + '╔' + '═'.repeat(58) + '╗');
  console.log('║' + '  🎉 عملیات با موفقیت انجام شد!'.padEnd(58) + '║');
  console.log('║' + `  ${totalClusters} خوشه، ${totalBrains} مغز، ${totalBots} ربات`.padEnd(58) + '║');
  console.log('╚' + '═'.repeat(58) + '╝\n');
}

// ============================================================
// 7. اجرا
// ============================================================
main()
  .catch((e) => {
    console.error('\n❌ خطا:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });