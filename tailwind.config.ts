import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        wood: {
          50: '#fbf6ef',
          100: '#f4e9d8',
          200: '#e8d2b0',
          300: '#d9b483',
          400: '#c8925a',
          500: '#b4773e',
          600: '#9a5f31',
          700: '#7c4a2a',
          800: '#653d27',
          900: '#533323',
          950: '#2e1a11',
        },
        cream: {
          50: '#fffdf8',
          100: '#fdf8ee',
          200: '#f8eedb',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(46,26,17,0.06), 0 4px 16px rgba(46,26,17,0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
