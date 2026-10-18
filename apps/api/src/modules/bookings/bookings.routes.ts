import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const bookingSchema = z.object({
  customerName: z.string().min(1).max(120),
  customerPhone: z.string().max(30).optional(),
  service: z.string().min(1).max(200),
  startsAt: z.string().datetime({ offset: true }),
  durationMin: z.number().int().min(5).max(600).optional(),
  notes: z.string().max(1000).optional(),
});

export async function bookingsRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  async function own(id: string, userId: string) {
    const b = await app.prisma.booking.findUnique({ where: { id } });
    if (!b || b.userId !== userId) throw Object.assign(new Error('نوبت یافت نشد'), { statusCode: 404 });
    return b;
  }

  app.get('/', auth, async (request) => {
    const items = await app.prisma.booking.findMany({
      where: { userId: request.user.sub },
      orderBy: { startsAt: 'asc' },
      take: 500,
    });
    return { items };
  });

  app.post('/', auth, async (request) => {
    const input = bookingSchema.parse(request.body);
    const startsAt = new Date(input.startsAt);
    const clash = await app.prisma.booking.findFirst({
      where: { userId: request.user.sub, startsAt, status: { not: 'CANCELLED' } },
    });
    if (clash) throw Object.assign(new Error('این زمان قبلاً رزرو شده است'), { statusCode: 409 });
    return app.prisma.booking.create({
      data: { ...input, startsAt, userId: request.user.sub, status: 'CONFIRMED' } as any,
    });
  });

  app.patch('/:id', auth, async (request) => {
    const { id } = request.params as { id: string };
    await own(id, request.user.sub);
    const { status } = z.object({ status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'DONE', 'NO_SHOW']) }).parse(request.body);
    return app.prisma.booking.update({ where: { id }, data: { status } });
  });

  app.delete('/:id', auth, async (request) => {
    const { id } = request.params as { id: string };
    await own(id, request.user.sub);
    await app.prisma.booking.delete({ where: { id } });
    return { ok: true };
  });
}
