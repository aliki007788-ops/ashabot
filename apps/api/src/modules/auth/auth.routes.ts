import type { FastifyInstance } from 'fastify';
import { AuthService } from './auth.service.js';
import { registerSchema, loginSchema, changePasswordSchema, updateMeSchema, forgotSchema, resetSchema } from './auth.schema.js';
import { ensureAdminRole } from '../../lib/access.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { generateOpaqueToken, hashToken } from '../../lib/jwt.js';
import { sendMail } from '../../lib/mailer.js';
import { env } from '../../env.js';

const RESET_TTL_MS = 60 * 60 * 1000;
const frontend = () => (env.FRONTEND_URL || env.CORS_ORIGIN.split(',')[0] || 'http://localhost:3000').replace(/\/$/, '');

export async function authRoutes(app: FastifyInstance) {
  const service = new AuthService(app);
  // محدودیت تلاش برای مسیرهای حساس (ضد حدس رمز)
  const strict = { config: { rateLimit: { max: 12, timeWindow: '1 minute' } } };

  app.post('/register', strict, async (request) => {
    const input = registerSchema.parse(request.body);
    const result = await service.register(input as any);
    const user = await ensureAdminRole(app.prisma, result.user);
    // اگر نقش ارتقا یافت، توکن جدید با نقش درست بسازیم
    if (user.role !== result.user.role) {
      const tokens = await (service as any).issueTokens(user, {});
      return { user, ...tokens };
    }
    return { user, accessToken: result.accessToken, refreshToken: result.refreshToken };
  });

  app.post('/login', strict, async (request) => {
    const input = loginSchema.parse(request.body);
    const meta = { userAgent: request.headers['user-agent'], ipAddress: request.ip };
    const result = await service.login(input as any, meta);
    const user = await ensureAdminRole(app.prisma, result.user);
    if (user.role !== result.user.role) {
      const tokens = await (service as any).issueTokens(user, meta);
      return { user, ...tokens };
    }
    return { user, accessToken: result.accessToken, refreshToken: result.refreshToken };
  });

  app.post('/refresh', async (request) => {
    const { refreshToken } = (request.body ?? {}) as { refreshToken?: string };
    if (!refreshToken) throw Object.assign(new Error('Missing refresh token'), { statusCode: 400 });
    const result = await service.refresh(refreshToken, {});
    const user = await ensureAdminRole(app.prisma, result.user);
    if (user.role !== result.user.role) {
      const tokens = await (service as any).issueTokens(user, {});
      return { user, ...tokens };
    }
    return { user, accessToken: result.accessToken, refreshToken: result.refreshToken };
  });

  app.post('/logout', async (request) => {
    const { refreshToken } = (request.body ?? {}) as { refreshToken?: string };
    if (refreshToken) await service.logout(refreshToken);
    return { ok: true };
  });

  app.get('/me', { preHandler: [app.authenticate] }, async (request) => {
    const found = await app.prisma.user.findUnique({
      where: { id: request.user.sub },
      select: { id: true, email: true, name: true, role: true, createdAt: true, isActive: true },
    });
    if (!found || !found.isActive) throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
    const user = await ensureAdminRole(app.prisma, found);
    return { user: { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt } };
  });

  app.patch('/me', { preHandler: [app.authenticate] }, async (request) => {
    const { name } = updateMeSchema.parse(request.body);
    const user = await app.prisma.user.update({
      where: { id: request.user.sub },
      data: { name: name.trim() },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    return { user };
  });

  app.post('/change-password', { ...strict, preHandler: [app.authenticate] }, async (request) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(request.body);
    const u = await app.prisma.user.findUnique({ where: { id: request.user.sub } });
    if (!u || !(await verifyPassword(currentPassword, u.passwordHash))) {
      throw Object.assign(new Error('رمز فعلی درست نیست'), { statusCode: 400 });
    }
    await app.prisma.user.update({ where: { id: u.id }, data: { passwordHash: await hashPassword(newPassword) } });
    await service.logoutAll(u.id); // بقیه‌ی دستگاه‌ها خارج می‌شوند
    return { ok: true };
  });

  // بازیابی رمز: پاسخ همیشه یکسان است (لو ندادن اینکه ایمیل ثبت‌شده هست یا نه)
  app.post('/forgot-password', strict, async (request) => {
    const { email } = forgotSchema.parse(request.body);
    const u = await app.prisma.user.findUnique({ where: { email } });
    if (u && u.isActive) {
      const raw = generateOpaqueToken();
      await app.prisma.passwordReset.create({ data: { userId: u.id, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + RESET_TTL_MS) } });
      const link = `${frontend()}/reset-password?token=${raw}`;
      const sent = await sendMail(
        u.email,
        'بازیابی رمز عبور',
        `<div dir="rtl" style="font-family:tahoma">سلام ${u.name}،<br/>برای انتخاب رمز تازه روی لینک زیر بزنید (تا ۱ ساعت معتبر است):<br/><a href="${link}">${link}</a><br/>اگر شما درخواست نکرده‌اید، این ایمیل را نادیده بگیرید.</div>`,
      );
      if (!sent) app.log.warn(`[reset] ایمیل ارسال نشد (RESEND_API_KEY تنظیم نیست). مدیر می‌تواند لینک را از پنل ادمین بسازد.`);
    }
    return { ok: true };
  });

  app.post('/reset-password', strict, async (request) => {
    const { token, password } = resetSchema.parse(request.body);
    const row = await app.prisma.passwordReset.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!row || row.usedAt || row.expiresAt < new Date()) {
      throw Object.assign(new Error('لینک نامعتبر یا منقضی شده است؛ دوباره درخواست دهید'), { statusCode: 400 });
    }
    await app.prisma.$transaction([
      app.prisma.user.update({ where: { id: row.userId }, data: { passwordHash: await hashPassword(password) } }),
      app.prisma.passwordReset.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    ]);
    await service.logoutAll(row.userId);
    return { ok: true };
  });
}
