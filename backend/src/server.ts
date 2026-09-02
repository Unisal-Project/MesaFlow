import { fastify } from "fastify";
import { env } from "./config/env.js";
import { authPlugin } from "./plugins/auth.js";
import { corsPlugin } from "./plugins/cors.js";
import { swaggerPlugin } from "./plugins/swagger.js";

export const app = fastify({ logger: true });

//plugins
app.register(swaggerPlugin);
app.register(authPlugin);
app.register(corsPlugin);

//routers
app.register(async (instance) => {
  instance.get("/health", async () => ({ status: "ok" }));
}, { prefix: "/api/v1" });

export const startServer = async () => {
  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error, "Error starting server");
    process.exitCode = 1;
  }
};

await startServer();
