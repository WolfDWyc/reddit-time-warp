/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        reddit: {
          orange: '#FF4500',
          dark: '#1A1A1B',
          gray: '#DAE0E6',
          light: '#F6F7F8',
          blue: '#0079D3',
          darkblue: '#0066CC'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
