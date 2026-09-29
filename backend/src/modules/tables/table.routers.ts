import { TableController } from "./table.controller.js";
import { TableService } from "./table.service.js";
import { prisma } from "../../database/prisma.js";
import { FastifyInstance } from "fastify";


const tableService = new TableService(prisma);
const tableController = new TableController(tableService);

export function tableRoutes(app: FastifyInstance) {
  app.post("/tables", (request, reply) =>
    tableController.createTable(request, reply),
  );

  app.delete("/tables/:id", (request, reply) =>
    tableController.deleteTable(request, reply),
  );

  app.put("/tables/:id", (request, reply) =>
    tableController.editTable(request, reply),
  );

  app.get("/tables/:id", (request, reply) =>
    tableController.getTableById(request, reply),
  );

  app.get("/tables", (request, reply) =>
    tableController.getAllTables(request, reply),
  );
}
