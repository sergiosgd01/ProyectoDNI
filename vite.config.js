import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Configuración HTTPS + ngrok (solo en desarrollo si existen los certificados)
const certKeyPath = path.resolve('./cert-key.pem');
const certPath = path.resolve('./cert.pem');
const httpsEnabled = fs.existsSync(certKeyPath) && fs.existsSync(certPath);

// Nombres de los archivos que Vite copia sin tocarlos (imágenes, fuentes y las librerías de src/config).
// Vale para la web y para sus workers, que se compilan aparte y piden algunos de esos mismos archivos
const assetFileNames = ({ names }) => {
  // Tesseract pide los datos del idioma con su nombre exacto (<langPath>/spa.traineddata.gz),
  // así que ese archivo conserva el nombre y la huella va en la carpeta (ver src/config/tesseractConfig.js)
  if (names.includes('spa.traineddata.gz')) return 'assets/tessdata-[hash]/[name][extname]'
  // El cargador de ONNX Runtime es un .mjs y se publica con extensión .js, con el mismo contenido.
  // Netlify no documenta con qué tipo sirve .mjs y el navegador rechaza el módulo si no llega como JavaScript.
  // Con .js sale como el resto del código de la web (application/javascript, comprobado en producción)
  if (names.some((nombre) => nombre.endsWith('.mjs'))) return 'assets/[name]-[hash].js'
  return 'assets/[name]-[hash][extname]'
}

// En local (npm run dev) la web guarda las métricas en el backend local, http://localhost:5000 (VITE_API_BASE_URL del
// .env). Desde SEG-7 (24/11/2026) la CSP publicada de index.html no lo permite, así que solo al servir en local se añade
const cspLocal = {
  name: 'csp-local',
  apply: 'serve',
  transformIndexHtml: (html) => html.replace("connect-src 'self'", "connect-src 'self' http://localhost:5000"),
}

// Las mismas cabeceras de aislamiento que public/_headers pone en Netlify (VEL-6). Así, al servir la web en local con
// npm run dev o vite preview, el modelo de campos también usa varios hilos y se ve si algo deja de cargar
const aislamiento = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

export default defineConfig(({ command }) => ({
  plugins: [react(), cspLocal],
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
      output: { assetFileNames }
    }
  },
  // El worker del detector (src/workers/detector.worker.js) lleva dentro ONNX Runtime, que necesita ser un módulo
  // para cargar su motor. El cargador que pide es el mismo archivo que pide la web, con el mismo nombre
  worker: {
    format: 'es',
    rollupOptions: {
      output: { assetFileNames }
    }
  },
  // libheif solo se importa desde el worker de las fotos HEIC (src/workers/heic.worker.js), que Vite no mira al
  // arrancar en local. Sin esto, con la primera HEIC prepara la librería y recarga la página a mitad de la subida
  optimizeDeps: {
    include: ['libheif-js/libheif-wasm/libheif.js']
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
    ],
    headers: aislamiento
  },
  preview: {
    headers: aislamiento
  }
}))
