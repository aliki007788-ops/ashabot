import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});
export const updateMeSchema = z.object({ name: z.string().min(2).max(80) });
export const forgotSchema = z.object({ email: z.string().email().toLowerCase() });
export const resetSchema = z.object({ token: z.string().min(20).max(200), password: z.string().min(8).max(128) });
