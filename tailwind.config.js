/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          950: '#08090b',
          900: '#0d0f12',
          850: '#111318',
          800: '#15171d',
          700: '#1b1e26',
          600: '#262a34',
          500: '#333844',
        },
        accent: {
          DEFAULT: '#5b6cff',
          light: '#7c8bff',
          dark: '#4451d6',
        },
        purple: {
          DEFAULT: '#8b5cf6',
        },
        good: '#34d399',
        warn: '#f5a524',
        bad: '#f5556c',
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px',
        '3xl': '26px',
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.02) inset, 0 8px 24px -12px rgba(0,0,0,0.5)',
        glow: '0 0 0 1px rgba(91,108,255,0.25), 0 8px 30px -8px rgba(91,108,255,0.35)',
      },
    },
  },
  plugins: [],
}
