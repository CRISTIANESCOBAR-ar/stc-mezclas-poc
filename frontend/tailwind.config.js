/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'navy-dark': '#0f172a',
        'navy-primary': '#1e3a8a',
      }
    },
  },
  plugins: [],
}
