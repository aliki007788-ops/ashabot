import type { FastifyInstance } from 'fastify';
import { AuthService } from './auth.service.js';
import { registerSchema, loginSchema } from './auth.schema.js';

export async function authRoutes(app: FastifyInstance) {
  const service = new AuthService(app);

  app.post('/register', async (request, reply) => {
    const input = registerSchema.parse(request.body);
    const result = await service.register(input);
    return { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken };
  });

  app.post('/login', async (request) => {
    const input = loginSchema.parse(request.body);
    const meta = {
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip,
    };
    const result = await service.login(input, meta);
    return { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken };
  });

  app.post('/refresh', async (request) => {
    const { refreshToken } = request.body as { refreshToken: string };
    if (!refreshToken) {
      throw Object.assign(new Error('Missing refresh token'), { statusCode: 400 });
    }
    const result = await service.refresh(refreshToken, {});
    return { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken };
  });

  app.post('/logout', async (request) => {
    const { refreshToken } = request.body as { refreshToken?: string };
    if (refreshToken) await service.logout(refreshToken);
    return { ok: true };
  });

  app.get('/me', { preHandler: [app.authenticate] }, async (request) => {
    const user = await app.prisma.user.findUnique({
      where: { id: request.user.sub },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    return { user };
  });
}
