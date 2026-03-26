/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Merriweather', 'serif'],
      },
      colors: {
        figma: {
          bg: '#EEF2F6',
          sidebar: '#0F1115',
          card: '#FFFFFF',
          yellow: '#3B7CFF',
          coral: '#F2B36B'
        },
        slate: {
          850: '#151e2e',
          900: '#0f172a',
          950: '#020617',
        }
      }
    },
  },
  plugins: [],
}
