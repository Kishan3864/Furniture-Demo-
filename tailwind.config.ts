import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    // Solid, business-software look: small corner radius everywhere.
    borderRadius: {
      none: '0',
      sm: '2px',
      DEFAULT: '4px',
      md: '4px',
      lg: '5px',
      xl: '6px',
      '2xl': '8px',
      '3xl': '10px',
      full: '9999px',
    },
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
      keyframes: {
        page: { from: { opacity: '0' }, to: { opacity: '1' } },
      },
      animation: {
        page: 'page 180ms ease-out',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(46,26,17,0.06), 0 4px 16px rgba(46,26,17,0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
