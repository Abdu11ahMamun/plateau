/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1A1A2E',
        // Brand colors keep their original value as DEFAULT (bg-slate etc.
        // still work) and gain shade scales for UI polish.
        slate: {
          DEFAULT: '#2D3561',
          100: '#E7E9F1',
          200: '#C6CADB',
          300: '#9BA2BC',
          400: '#6F7797',
          500: '#47517A',
          600: '#2D3561',
          700: '#232A4E',
        },
        sage: {
          DEFAULT: '#4CAF7D',
          100: '#E3F3EB',
          600: '#3E9068',
          700: '#327454',
        },
        amber: {
          DEFAULT: '#F59E0B',
          50: '#FEFBF3',
          100: '#FEF3C7',
          600: '#D97706',
          700: '#B45309',
        },
        rouge: {
          DEFAULT: '#EF4444',
          100: '#FEE2E2',
          700: '#B91C1C',
        },
        cream: '#FAF9F6',
        mist: '#F0EFE9',
        'plateau-border': '#E2E0D8',
      },
    },
  },
  plugins: [],
}
