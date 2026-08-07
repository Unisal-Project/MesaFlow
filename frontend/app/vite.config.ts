import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,   // expõe em 0.0.0.0 para funcionar dentro do Docker
    port: 5173,
  },
})
