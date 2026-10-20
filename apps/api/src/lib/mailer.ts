import { env } from '../env.js';
import { logger } from './logger.js';

/** ارسال ایمیل با Resend (بدون وابستگی). اگر کلید نباشد false برمی‌گرداند و لینک در لاگ می‌ماند. */
export async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  if (!env.RESEND_API_KEY) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.MAIL_FROM || 'Ashabot <onboarding@resend.dev>', to: [to], subject, html }),
    });
    if (!res.ok) logger.warn({ status: res.status }, 'mail send failed');
    return res.ok;
  } catch (e) {
    logger.warn({ err: e }, 'mail send error');
    return false;
  }
}
