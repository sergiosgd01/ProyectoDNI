import { COLORS, COLOR_VARIANTS } from './src/theme/colors.js';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Esta línea le dice a Tailwind que busque dentro de tu carpeta src los archivos .js, .ts, .jsx y .tsx
  ],
  theme: {
    extend: {
      colors: {
        // primary es el amarillo y secondary el rojo. Para qué se usa cada uno está en src/theme/colors.js
        primary: COLOR_VARIANTS.PRIMARY,
        secondary: COLOR_VARIANTS.SECONDARY,

        // Neutrales (sustituyen a los grises de Tailwind)
        gray: COLORS.GRAY,

        // Estados
        success: COLOR_VARIANTS.SUCCESS,
        error: COLOR_VARIANTS.SECONDARY,
        danger: COLOR_VARIANTS.SECONDARY,
        warning: COLORS.WARNING,
      }
    },
  },
  plugins: [],
}