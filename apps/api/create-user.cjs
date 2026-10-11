const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@test.com';
  const name = 'Admin';
  const password = 'admin123456';

  try {
    console.log('=== Creating test user ===');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('');

    // بررسی وجود کاربر
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      console.log('User already exists:', existing.email);
      console.log('You can login with:');
      console.log('  Email:', email);
      console.log('  Password: admin123456');
      return;
    }

    // هش کردن رمز
    const passwordHash = await bcrypt.hash(password, 10);

    // ساخت کاربر
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
    });

    console.log('✅ User created successfully!');
    console.log('');
    console.log('=== Login credentials ===');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('');
    console.log('Now you can login at http://localhost:3000/login');
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);