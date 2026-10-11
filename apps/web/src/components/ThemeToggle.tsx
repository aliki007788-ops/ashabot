'use client';

import { useTheme } from '@/lib/theme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-all flex items-center justify-center text-lg"
      title={theme === 'dark' ? 'تم روشن' : 'تم تیره'}
      aria-label="تغییر تم"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}