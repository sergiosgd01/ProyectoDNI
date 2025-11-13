import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

// Configuración HTTPS + ngrok
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,  // Permite acceso desde la red local o ngrok
    port: 5173,
    // https: {
    //   key: fs.readFileSync('./cert-key.pem'),
    //   cert: fs.readFileSync('./cert.pem'),
    // },
    allowedHosts: [
      '.ngrok-free.dev',
      '.ngrok.io'
    ]
  }
})
