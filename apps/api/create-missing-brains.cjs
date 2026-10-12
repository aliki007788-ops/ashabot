const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const NEW_BRAINS = [
  { name: 'مغز مالی', slug: 'finance-brain', icon: '💳', color: '#f59e0b', description: 'مدیریت مالی، پرداخت و بودجه' },
  { name: 'مغز موجودی', slug: 'inventory-brain', icon: '📦', color: '#10b981', description: 'کنترل موجودی و انبارداری' },
  { name: 'مغز منابع انسانی', slug: 'hr-brain', icon: '👥', color: '#8b5cf6', description: 'مدیریت تیم و فرآیندهای داخلی' },
  { name: 'مغز زنجیره تامین', slug: 'supply-brain', icon: '🚚', color: '#f97316', description: 'لجستیک و تامین کالا' },
  { name: 'مغز نوآوری', slug: 'innovation-brain', icon: '💡', color: '#eab308', description: 'بهبود فرآیند و توسعه محصول' },
];

async function main() {
  console.log('🧠 ساخت مغزهای تخصصی جدید...\n');

  for (const b of NEW_BRAINS) {
    const exists = await prisma.brain.findUnique({ where: { slug: b.slug } });
    if (exists) {
      console.log(`⏭️  ${b.name} از قبل وجود دارد`);
      continue;
    }
    await prisma.brain.create({
      data: {
        name: b.name,
        slug: b.slug,
        icon: b.icon,
        color: b.color,
        description: b.description,
        isCentral: false,
        isActive: true,
      }
    });
    console.log(`✅ ${b.name} ساخته شد`);
  }

  console.log('\n🎉 تمام شد');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());