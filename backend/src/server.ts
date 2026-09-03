import { fastify } from "fastify";
import { fastifyJwt } from "@fastify/jwt";
import { env } from "./config/env.js";
import { corsPlugin } from "./plugins/cors.js";
import { swaggerPlugin } from "./plugins/swagger.js";
import { registerCategoryRoutes } from "./modules/categories/category.router.js";
import { AppError } from "./shared/errors/app-errors.js";

export const app = fastify({ logger: true });

//plugins
app.register(swaggerPlugin);
app.register(fastifyJwt, { secret: env.JWT_SECRET });
app.register(corsPlugin);

//routers
app.register(
  async (instance) => {
    instance.get("/health", async () => ({ status: "ok" }));
    await instance.register(registerCategoryRoutes);
  },
  { prefix: "/api/v1" },
);

app.setErrorHandler((error, _request, reply) => {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({ message: error.message });
  }

  app.log.error(error);
  return reply.status(500).send({ message: "Internal server error" });
});

export const startServer = async () => {
  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error, "Error starting server");
    process.exitCode = 1;
  }
};

await startServer();
