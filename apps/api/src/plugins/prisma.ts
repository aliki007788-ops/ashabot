import fp from 'fastify-plugin';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

declare module 'fastify' {
  interface FastifyInstance {
    prisma: InstanceType<typeof PrismaClient>;
  }
}

export default fp(async (app) => {
  const prisma = new PrismaClient({
    log: ['warn', 'error'],
  });
  await prisma.$connect();
  app.decorate('prisma', prisma);
  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
});