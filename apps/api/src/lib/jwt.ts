import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';

export const hashToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');

export const generateOpaqueToken = () => crypto.randomBytes(48).toString('hex');

export function signAccessToken(
  app: FastifyInstance,
  payload: { sub: string; email: string; role: string }
) {
  return app.jwt.sign(payload);
}
