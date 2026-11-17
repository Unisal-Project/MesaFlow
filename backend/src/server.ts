import { buildApp } from "./app.js";
import { env } from "./config/env.js";

export async function startServer() {
  const app = await buildApp();

  try {
    await app.listen({
      port: env.PORT,
      host: "0.0.0.0",
    });
  } catch (error) {
    app.log.error(error, "Error starting server");
    process.exitCode = 1;
  }
}

await startServer();
