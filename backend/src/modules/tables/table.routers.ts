import { TableController } from "./table.controller.js";
import { FastifyInstance } from "fastify";
import { makeTableService } from "./table.factory.js";

const tableService = makeTableService();

const tableController = new TableController(tableService);

export function tableRoutes(app: FastifyInstance) {
  app.get("/tables/by-token/:token", (request, reply) => 
    tableController.getTableByToken(request, reply)
  );
  app.get("/tables/:id/qrcode", (request, reply) => 
    tableController.getQrCode(request, reply)
  );
  app.get("/tables/:id", (request, reply) =>
    tableController.getTableById(request, reply),
  );
  app.get("/tables", (request, reply) =>
    tableController.getAllTables(request, reply),
  );

  app.post("/tables", (request, reply) =>
    tableController.createTable(request, reply),
  );

  app.patch("/tables/:id/status", (request, reply) => 
    tableController.changeStatus(request, reply)
  )
  ;
  app.delete("/tables/:id", (request, reply) =>
    tableController.deleteTable(request, reply),
  );

  app.put("/tables/:id", (request, reply) =>
    tableController.editTable(request, reply),
  );

}
