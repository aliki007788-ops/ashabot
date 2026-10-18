// SQLite (محلی) از mode:'insensitive' پشتیبانی نمی‌کند؛ روی PostgreSQL فعال است.
export const ci: { mode?: 'insensitive' } = (process.env.DATABASE_URL || '').startsWith('file:')
  ? {}
  : { mode: 'insensitive' };
