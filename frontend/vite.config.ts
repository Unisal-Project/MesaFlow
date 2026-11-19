import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import react from "@vitejs/plugin-react";
import { defineConfig, type UserConfig } from "vite";

export default defineConfig((): UserConfig => {
  const { parsed = {} } = config({
    path: fileURLToPath(new URL("../.env", import.meta.url)),
    processEnv: {},
    quiet: true,
  });
  const value = (key: string) => process.env[key] ?? parsed[key];

  return {
    plugins: [react()],
    envDir: false,
    envPrefix: [],
    define: {
      "import.meta.env.VITE_API_URL": JSON.stringify(value("VITE_API_URL") ?? ""),
      "import.meta.env.VITE_PRINT_URL": JSON.stringify(value("VITE_PRINT_URL") ?? ""),
    },
    server: {
      host: true,
      port: 5173,
      watch: {
        usePolling: value("CHOKIDAR_USEPOLLING") === "true",
        interval: 250,
      },
    },
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
  };
});
