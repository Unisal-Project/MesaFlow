import { fastify } from "fastify";
import { fastifyJwt } from "@fastify/jwt";
import { fastifyCors } from "@fastify/cors";
import { env } from "./config/env.js";
import { swaggerPlugin } from "./plugins/swagger.js";
import { registerCategoryRoutes } from "./modules/categories/category.router.js";
import { errorHandler } from "./shared/errors/error-handler.js";
import { registerProductRoutes } from "./modules/products/products.router.js";
import { orderRoutes } from "./modules/orders/order.routes.js";
import fastifyMultipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { uploadsRootDirectory } from "./shared/storage/storage.config.js";
import { mkdir } from "node:fs/promises";
import { attendanceRoutes } from "./modules/attendance/attendance.routes.js";

export const app = fastify({ logger: true });

await mkdir(uploadsRootDirectory, { recursive: true });

//plugins
app.register(swaggerPlugin);
app.register(fastifyJwt, { secret: env.JWT_SECRET });
app.register(fastifyCors, {
  origin: env.FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});

//upload de arquivos
app.register(fastifyMultipart, {
  limits: {
    files: 1,
    fileSize: 5 * 1024 * 1024,
    fields: 0,
    parts: 1,
  },

});

app.register(fastifyStatic, {
  root: uploadsRootDirectory,
  prefix: "/uploads/",
  index: false,
});

//routers
app.register(
  async (instance) => {
    instance.get("/health", async () => ({ status: "ok" }));
    await instance.register(registerCategoryRoutes);
    await instance.register(registerProductRoutes);
    await instance.register(orderRoutes);
    await instance.register(attendanceRoutes);
  },
  { prefix: "/api/v1" },
);

app.setErrorHandler(errorHandler);


export const startServer = async () => {
  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error, "Error starting server");
    process.exitCode = 1;
  }
};

await startServer();
