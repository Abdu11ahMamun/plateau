/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1A1A2E',
        slate: '#2D3561',
        sage: '#4CAF7D',
        amber: '#F59E0B',
        rouge: '#EF4444',
        cream: '#FAF9F6',
        mist: '#F0EFE9',
        'plateau-border': '#E2E0D8',
      },
    },
  },
  plugins: [],
}
