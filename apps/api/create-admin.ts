import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('admin123', 10);

  const user = await prisma.user.update({
    where: { email: 'admin@test.com' },
    data: {
      passwordHash: hash,
      name: 'Admin',
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('SUCCESS - Password updated for:', user.email);
  console.log('Login with: admin@test.com / admin123');
}

main()
  .catch((e) => console.error('ERROR:', e.message))
  .finally(() => prisma.$disconnect());