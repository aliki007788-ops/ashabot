import fp from 'fastify-plugin';
import { env } from '../env.js';

export default fp(async (app) => {
  await app.register(import('@fastify/jwt'), {
    secret: env.JWT_ACCESS_SECRET,
    sign: { expiresIn: env.JWT_ACCESS_EXPIRES_IN },
  });

  app.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: any, reply: any) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; email: string; role: string };
    user: { sub: string; email: string; role: string };
  }
}
