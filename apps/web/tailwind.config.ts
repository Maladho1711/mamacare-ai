import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#E91E8C',
          50:  '#FDE8F3',
          100: '#FBCFE7',
          500: '#E91E8C',
          600: '#C9177A',
          700: '#A81266',
        },
        alert: {
          red:    '#DC2626',
          orange: '#EA580C',
          green:  '#16A34A',
        },
      },
      borderRadius: {
        xl:  '0.75rem',
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
};

export default config;
