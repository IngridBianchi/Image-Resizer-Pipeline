/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          blue: '#2563EB', // Azul tecnología
          green: '#10B981', // Verde frescura
          dark: '#1F2937',
        }
      }
    },
  },
  plugins: [],
}