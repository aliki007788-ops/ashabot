import type { FastifyInstance } from 'fastify';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { hashToken, generateOpaqueToken } from '../../lib/jwt.js';

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export class AuthService {
  constructor(private app: FastifyInstance) {}

  async register(input: { name: string; email: string; password: string }) {
    const existing = await this.app.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      throw Object.assign(new Error('Email already registered'), { statusCode: 409 });
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.app.prisma.user.create({
      data: { name: input.name, email: input.email, passwordHash },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    const tokens = await this.issueTokens(user, {});
    return { user, ...tokens };
  }

  async login(
    input: { email: string; password: string },
    meta: { userAgent?: string; ipAddress?: string }
  ) {
    const user = await this.app.prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !user.isActive) {
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }

    const ok = await verifyPassword(input.password, user.passwordHash);
    if (!ok) {
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    };
    const tokens = await this.issueTokens(safeUser, meta);
    return { user: safeUser, ...tokens };
  }

  async refresh(rawToken: string, meta: { userAgent?: string; ipAddress?: string }) {
    const tokenHash = hashToken(rawToken);
    const stored = await this.app.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw Object.assign(new Error('Invalid refresh token'), { statusCode: 401 });
    }

    await this.app.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const user = {
      id: stored.user.id,
      email: stored.user.email,
      name: stored.user.name,
      role: stored.user.role,
      createdAt: stored.user.createdAt,
    };
    const tokens = await this.issueTokens(user, meta);
    return { user, ...tokens };
  }

  async logout(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    await this.app.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async logoutAll(userId: string) {
    await this.app.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(
    user: { id: string; email: string; name: string; role: string },
    meta: { userAgent?: string; ipAddress?: string }
  ) {
    const accessToken = this.app.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const rawRefresh = generateOpaqueToken();
    const tokenHash = hashToken(rawRefresh);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

    await this.app.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
      },
    });

    return { accessToken, refreshToken: rawRefresh };
  }
}
