import type { FastifyReply, FastifyRequest } from "fastify";
import { authenticate } from "./authenticate.js";

const publicRoutes = new Set([
  "GET /health",
  "GET /settings/public",
  "POST /auth/login",
  "GET /categories",
  "GET /categories/:id",
  "GET /products",
  "GET /products/:id",
  "GET /tables/by-token/:token",
  "GET /tables/by-token/:token/bill",
  "POST /tables/by-token/:token/orders",
  "POST /tables/by-token/:token/request-closing",
  "POST /tables/by-token/:token/call-waiter",
]);

// Rotas de gestão: criar contas, catálogo, cadastro de mesas,
// cancelamentos e relatórios. O restante da operação (mesas, pedidos,
// atendimentos, pagamentos) fica liberado para qualquer usuário autenticado.
const adminRoutes = new Set([
  "POST /auth/register",
  "PUT /settings",
  "POST /settings/banner",
  "POST /categories",
  "PUT /categories/:id",
  "DELETE /categories/:id",
  "POST /products",
  "PATCH /products/:id",
  "PATCH /products/:id/category",
  "POST /products/:id/image",
  "DELETE /products/:id/image/:slot",
  "PATCH /products/:id/image/:slot/cover",
  "DELETE /products/:id",
  "PATCH /promotions",
  "POST /tables",
  "PUT /tables/:id",
  "DELETE /tables/:id",
  "POST /orders/:id/cancel",
  "GET /attendances/cancelled",
  "POST /attendances/:attendanceId/reopen",
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
