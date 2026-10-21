import { env } from "../../config/env.js";

import { TableService } from "./table.service.js";

import { PrismaTableRepository } from "./repositories/prisma-table.repository.js";

export function makeTableService(): TableService {
    const tableRepository = new PrismaTableRepository();

    return new TableService (
        tableRepository,
        env.FRONTEND_URL
    )
}