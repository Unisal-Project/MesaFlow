import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,   // expõe em 0.0.0.0 para funcionar dentro do Docker
    port: 5173,
  },
  resolve: {
  alias: {"@": fileURLToPath(new URL("./src", import.meta.url)),},
  },
})
