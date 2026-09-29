import { TableService } from "./table.service.js";
import { TableSchema, TableIdSchema } from "./table.schema.js";
import { FastifyReply, FastifyRequest } from "fastify";

export class TableController {
  constructor(private readonly tableService: TableService) {}

  async createTable(request: FastifyRequest, reply: FastifyReply) {
    const table = TableSchema.safeParse(request.body);

    if (!table.success) {
      return reply.status(400).send({ error: "Invalid table data" });
    }

    return await this.tableService.createTable(table.data);
  }

  async deleteTable(request: FastifyRequest, reply: FastifyReply) {
    const tableId = TableIdSchema.safeParse(request.params);

    if (!tableId.success) {
      return reply.status(400).send({ error: "Invalid table id" });
    }

    return await this.tableService.deleteTable(tableId.data);
  }

  async editTable(request: FastifyRequest, reply: FastifyReply) {
    const tableId = TableIdSchema.safeParse(request.params);
    const table = TableSchema.safeParse(request.body);

    if (!tableId.success || !table.success) {
      return reply.status(400).send({ error: "Invalid table data or id" });
    }

    return await this.tableService.editTable(tableId.data, table.data);
  }

  async getTableById(request: FastifyRequest, reply: FastifyReply) {
    const tableId = TableIdSchema.safeParse(request.params);

    if (!tableId.success) {
      return reply.status(400).send({ error: "Invalid table id" });
    }

    return await this.tableService.getTableById(tableId.data);
  }

  async getAllTables(request: FastifyRequest, reply: FastifyReply) {
    return await this.tableService.getAllTables();
  }
}
