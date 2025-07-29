/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Esta línea le dice a Tailwind que busque dentro de tu carpeta src los archivos .js, .ts, .jsx y .tsx
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}