import type { FastifyReply, FastifyRequest } from "fastify";
import { authenticate } from "./authenticate.js";

const publicRoutes = new Set([
  "GET /health",
  "POST /auth/login",
  "POST /auth/register",
  "GET /categories",
  "GET /categories/:id",
  "GET /products",
  "GET /products/:id",
  "GET /tables/by-token/:token",
  "POST /tables/by-token/:token/orders",
  "POST /tables/by-token/:token/request-closing",
]);

export async function requireApiAuthentication(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const route = request.routeOptions.url?.replace(/^\/api\/v1/, "");
  if (publicRoutes.has(`${request.method} ${route}`)) return;
  await authenticate(request, reply);
}
