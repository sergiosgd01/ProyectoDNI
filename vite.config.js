import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Configuración HTTPS + ngrok (solo en desarrollo si existen los certificados)
const certKeyPath = path.resolve('./cert-key.pem');
const certPath = path.resolve('./cert.pem');
const httpsEnabled = fs.existsSync(certKeyPath) && fs.existsSync(certPath);

export default defineConfig({
  plugins: [react()],
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
})
