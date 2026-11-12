import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ReportService } from "./report.service.js";

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato AAAA-MM-DD");

export const reportQuerySchema = z.object({
  start: date,
  end: date,
  tzOffset: z.coerce.number().int().min(-840).max(840).default(0),
});

export async function reportRoutes(
  app: FastifyInstance,
  options: { service?: ReportService } = {},
) {
  const service = options.service ?? new ReportService();
  app.get("/reports/sales", async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    return service.getReport(reportQuerySchema.parse(request.query));
  });
}
