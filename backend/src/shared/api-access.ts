import type { FastifyReply, FastifyRequest } from "fastify";
import { authenticate } from "./authenticate.js";

const publicRoutes = new Set([
  "GET /health",
  "POST /auth/login",
  "GET /categories",
  "GET /categories/:id",
  "GET /products",
  "GET /products/:id",
  "GET /tables/by-token/:token",
  "GET /tables/by-token/:token/orders",
  "POST /tables/by-token/:token/orders",
  "POST /tables/by-token/:token/request-closing",
  "POST /tables/by-token/:token/call-waiter",
]);

// Rotas de gestão: criar contas, catálogo, cadastro de mesas,
// cancelamentos e relatórios. O restante da operação (mesas, pedidos,
// atendimentos, pagamentos) fica liberado para qualquer usuário autenticado.
const adminRoutes = new Set([
  "POST /auth/register",
  "POST /categories",
  "PUT /categories/:id",
  "DELETE /categories/:id",
  "POST /products",
  "PATCH /products/:id",
  "PATCH /products/:id/category",
  "POST /products/:id/image",
  "DELETE /products/:id",
  "POST /tables",
  "PUT /tables/:id",
  "DELETE /tables/:id",
  "POST /orders/:id/cancel",
  "GET /attendances/cancelled",
  "GET /reports/sales",
]);

export async function requireApiAuthentication(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const route = `${request.method} ${request.routeOptions.url?.replace(/^\/api\/v1/, "")}`;
  if (publicRoutes.has(route)) return;
  await authenticate(request, reply);
  if (reply.sent) return;
  if (adminRoutes.has(route) && request.user.role !== "ADMIN")
    return reply.status(403).send({ message: "Acesso negado" });
}
