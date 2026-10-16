import { prisma } from "../../../database/prisma.js";

import type { TableRepository } from "./table.repository.js";

export class PrismaTableRepository implements TableRepository {

    async existsById(id: bigint): Promise<boolean> {
        const table = await prisma.restaurantTable.findUnique({
            where: { id },
            select: { id: true }
        });

        return table !== null;
    }
}