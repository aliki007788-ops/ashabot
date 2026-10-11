import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#6a8dff',
          foreground: '#ffffff',
        },
        accent: '#b46eff',
        background: '#07122e',
        surface: '#0d1a3f',
      },
      borderRadius: {
        xl: '18px',
        '2xl': '24px',
      },
    },
  },
  plugins: [],
} satisfies Config;
