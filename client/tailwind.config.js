/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0f172a',
        surface: 'rgba(15, 23, 42, 0.72)',
        primary: '#38bdf8',
        accent: '#818cf8',
      }
    }
  },
  plugins: []
};
