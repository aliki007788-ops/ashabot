import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Vazirmatn', 'system-ui', 'sans-serif'] },
      borderRadius: { xl: '18px', '2xl': '24px' },
    },
  },
  plugins: [],
} satisfies Config;
