const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const email = 'admin@test.com';
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { passwordHash: hash, role: 'ADMIN', isActive: true }
    });
    console.log('✅ Password updated for:', user.email);
    console.log('Login with: admin@test.com / admin123');
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
