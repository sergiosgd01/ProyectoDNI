import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Configuración HTTPS + ngrok (solo en desarrollo si existen los certificados)
const certKeyPath = path.resolve('./cert-key.pem');
const certPath = path.resolve('./cert.pem');
const httpsEnabled = fs.existsSync(certKeyPath) && fs.existsSync(certPath);

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // En la versión publicada se quitan los mensajes de consola (log, info, debug y warn)
  // para que no aparezcan nombres de archivo, fotos ni datos del DNI. console.error se mantiene.
  // En local (npm run dev) siguen saliendo todos.
  // Desde Vite 7.2 el minificado borra los avisos de licencia de las librerías (React, ONNX Runtime, jsPDF...).
  // Con legalComments 'inline' se quedan en el código publicado como antes, porque varias licencias piden conservarlos.
  esbuild: command === 'build'
    ? {
        pure: ['console.log', 'console.info', 'console.debug', 'console.warn'],
        legalComments: 'inline'
      }
    : undefined,
  build: {
    rollupOptions: {
      output: {
        // Nombres de los archivos que Vite copia sin tocarlos (imágenes, fuentes y las librerías de src/config)
        assetFileNames: ({ names }) => {
          // Tesseract pide los datos del idioma con su nombre exacto (<langPath>/spa.traineddata.gz),
          // así que ese archivo conserva el nombre y la huella va en la carpeta (ver src/config/tesseractConfig.js)
          if (names.includes('spa.traineddata.gz')) return 'assets/tessdata-[hash]/[name][extname]'
          // El cargador de ONNX Runtime es un .mjs y se publica con extensión .js, con el mismo contenido.
          // Netlify no documenta con qué tipo sirve .mjs y el navegador rechaza el módulo si no llega como JavaScript.
          // Con .js sale como el resto del código de la web (application/javascript, comprobado en producción)
          if (names.some((nombre) => nombre.endsWith('.mjs'))) return 'assets/[name]-[hash].js'
          return 'assets/[name]-[hash][extname]'
        }
      }
    }
  },
  server: {
    host: true,  // Permite acceso desde la red local o ngrok
    port: 5173,
    // HTTPS solo si existen los certificados (desarrollo local)
    ...(httpsEnabled && {
      https: {
        key: fs.readFileSync(certKeyPath),
        cert: fs.readFileSync(certPath),
      },
    }),
    allowedHosts: [
      '.ngrok-free.dev',
      '.ngrok.io'
    ]
  }
}))
