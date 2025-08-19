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
        // 🎨 Solo 2 colores principales
        primary: COLOR_VARIANTS.PRIMARY,
        secondary: COLOR_VARIANTS.SECONDARY,
        
        // 🌫️ Neutrales (overrideamos los grises por defecto)
        gray: COLORS.GRAY,
        
        // ⚠️ Estados críticos únicamente
        error: COLORS.ERROR,
        warning: COLORS.WARNING,
        
        // 🎯 Aliases semánticos
        success: COLOR_VARIANTS.SECONDARY,  // El éxito usa el color secundario
        danger: COLORS.ERROR,
      }
    },
  },
  plugins: [],
}