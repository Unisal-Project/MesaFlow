import { fastify } from "fastify";
import { fastifyJwt } from "@fastify/jwt";
import { fastifyCors } from "@fastify/cors";
import { env } from "./config/env.js";
import { swaggerPlugin } from "./plugins/swagger.js";
import { registerCategoryRoutes } from "./modules/categories/category.routes.js";
import { errorHandler } from "./shared/errors/error-handler.js";
import { registerProductRoutes } from "./modules/products/products.router.js";
import { orderRoutes } from "./modules/orders/order.routes.js";
import fastifyMultipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { uploadsRootDirectory } from "./shared/storage/storage.config.js";
import { mkdir } from "node:fs/promises";
import { attendanceRoutes } from "./modules/attendance/attendance.routes.js";
import { tableRoutes } from "./modules/tables/table.routers.js";
import { paymentConfirmationRoutes } from "./modules/payments/payment-confirmation.routes.js";
import { paymentRoutes } from "./modules/payments/payment.routes.js";
import { reportRoutes } from "./modules/reports/report.routes.js";
import { registerAuthRoutes } from "./modules/auth/auth.router.js";
import { registerUserRoutes } from "./modules/users/user.router.js";
import { registerSettingsRoutes } from "./modules/settings/settings.routes.js";
import { requireApiAuthentication } from "./shared/api-access.js";

export async function buildApp(logger = true) {
  const app = fastify({ logger, trustProxy: true });

  await mkdir(uploadsRootDirectory, { recursive: true });

  // Plugins
  if (process.env.NODE_ENV !== "production") {
    app.register(swaggerPlugin);
  }

  app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { algorithm: "HS256" },
    verify: { algorithms: ["HS256"] },
  });

  app.register(fastifyCors, {
    origin: env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  // Upload de arquivos
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

  // Rotas
  app.register(
    async (instance) => {
      instance.addHook("onRequest", requireApiAuthentication);
      instance.get("/health", async () => ({ status: "ok" }));

      await instance.register(registerCategoryRoutes);
      await instance.register(registerProductRoutes);
      await instance.register(registerAuthRoutes);
      await instance.register(registerUserRoutes);
      await instance.register(orderRoutes);
      await instance.register(attendanceRoutes);
      await instance.register(tableRoutes);
      await instance.register(paymentRoutes);
      await instance.register(paymentConfirmationRoutes);
      await instance.register(reportRoutes);
      await instance.register(registerSettingsRoutes);
    },
    { prefix: "/api/v1" },
  );

  app.setErrorHandler(errorHandler);

  return app;
}
