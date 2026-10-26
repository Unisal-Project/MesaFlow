import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,   // expõe em 0.0.0.0 para funcionar dentro do Docker
    port: 5173,
    proxy: {
      '/api/v1': process.env.VITE_DEV_PROXY_TARGET || 'http://localhost:3333',
      '/uploads': process.env.VITE_DEV_PROXY_TARGET || 'http://localhost:3333',
    },
    watch: {
      // Bind mounts nem sempre propagam eventos do sistema de arquivos.
      usePolling: process.env.CHOKIDAR_USEPOLLING === 'true',
      interval: 250,
    },
  },
  resolve: {
  alias: {"@": fileURLToPath(new URL("./src", import.meta.url)),},
  },
})
