import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-errors.js";

import type { TableRepository, CreateTableData, UpdateTableData } from "./table.repository.js";
import type { RestaurantTable } from "../../../generated/prisma/client.js";
import type { TableWithAttendance } from "./table-with-attendance.repository.js";
import type { TableStatusChangeDTO } from "../dto/table-status-change.dto.js";
import type { TableStatusDTO } from "../dto/table-status.dto.js";

import type { Prisma } from "../../../generated/prisma/client.js";

import { TableEntity } from "../enity/table.entity.js";
import { resolveTableStatus } from "../utils/resolve-table-status.js";

const attendanceInclude = {
  attendances: {
    where: { 
      status: { 
        in: [
            "OPEN", 
            "CLOSING_REQUESTED", 
            "AWAITING_PAYMENT"
        ] 
      } 
    },
    select: { 
      id: true, 
      status: true 
    },
    orderBy: [
        { createdAt: "desc" },
        { id: "desc" }
    ],
    take: 1,
  },
} satisfies Prisma.RestaurantTableInclude;

const nextStatus: Record<TableStatusDTO, TableStatusDTO> = {
    available: "occupied",
    occupied: "closing_requested",
    closing_requested: "awaiting_payment",
    awaiting_payment: "available"
};

export class PrismaTableRepository implements TableRepository {

    async existsById(id: bigint): Promise<boolean> {
        const table = await prisma.restaurantTable.findUnique({
            where: { id },
            select: { id: true }
        });

        return table !== null;
    }

    async create(data: CreateTableData): Promise<TableEntity> {
        const table= await prisma.restaurantTable.create({
            data: {
                number: data.number,
                name: data.name,
                active: data.active,
                qrToken: data.qrToken,
            }
        });

        return this.toEntity(table);
    }

    async findById(id: bigint): Promise<TableEntity | null> {
        const table = await prisma.restaurantTable.findUnique({
            where: { id }
        });

        if (!table) {
            return null;
        }

        return this.toEntity(table)
    }

    async findAll(): Promise<TableEntity[]> {
        const tables = await prisma.restaurantTable.findMany({
            orderBy: {
                number: "asc"
            }
        });

        return tables.map(table => this.toEntity(table))
    }

    async delete(id: bigint): Promise<TableEntity> {
        const table = await prisma.restaurantTable.delete({
            where: { id }
        });

        return this.toEntity(table);
    }

    async findByToken(token: string): Promise<TableEntity | null> {
        const table = await prisma.restaurantTable.findUnique({
            where: { qrToken: token }
        });

        if (!table) {
            return null;
        }

        return this.toEntity(table);
    }

    async findByIdWithAttendance(id: bigint): Promise<TableWithAttendance | null> {
        const table = await prisma.restaurantTable.findUnique({
            where: { id },
            include: attendanceInclude
        });

        if (!table) {
            return null;
        }

        return {
            table: this.toEntity(table),
            attendance: table.attendances[0] ?? null
        }
    }

    async findAllWithAttendance(): Promise<TableWithAttendance[]> {
        const tables = await prisma.restaurantTable.findMany({
            include: attendanceInclude,
            orderBy: {
                number: "asc"
            }
        });

        return tables.map(table => ({
            table: this.toEntity(table),
            attendance: table.attendances[0] ?? null
        }));
    }

    async updateWithAttendanceCheck(id: bigint, data: UpdateTableData): Promise<TableWithAttendance> {
        return prisma.$transaction(async (tx) => {
            //bloquea a mesa durante uma transação
            await tx.$queryRaw`
                SELECT id
                FROM restaurant_tables
                WHERE id = ${id}
                FOR UPDATE
            `;

            //busca a mesa e seu atendimento atual
            const current = await tx.restaurantTable.findUnique({
                where: { id },
                include: attendanceInclude
            })

            //verifica se a mesa existe
            if (!current){
                throw new AppError("Mesa não encontrada", 404);
            }

            //Impedir a desativação com atendimento ativo
            if (!data.active && current.attendances.length > 0){
                throw new AppError("Feche o atendimento antes de desativar a mesa", 409);
            }

            const updated = await tx.restaurantTable.update({
                where: { id },
                data: {
                    number: data.number,
                    name: data.name,
                    active: data.active,
                },
                include: attendanceInclude,
            });

            return {
                table: this.toEntity(updated),
                attendance: updated.attendances[0] ?? null,
            }
        })
    }

    async changeStatusTransaction(id: bigint, change: TableStatusChangeDTO): Promise<TableWithAttendance> {
        return prisma.$transaction(async (tx) => {
            //bloquear a mesa
            await tx.$queryRaw`
                SELECT id
                FROM restaurant_tables
                WHERE id = ${id}
                FOR UPDATE
            `;

            //buscar a mesa e o atendimento atual
            const table = await tx.restaurantTable.findUnique({
                where: { id },
                include: attendanceInclude
            })

            if (!table){
                throw new AppError("Mesa nao encontrada", 404);
            }

            const attendance = table.attendances[0] ?? null;

            //descobrir o status atual
            const currentStatus = resolveTableStatus(attendance)

            //verifcar se o atendimento mudou
            if ((attendance?.id ?? null) !== change.attendanceId){
                throw new AppError("O atendimento da mesa mudou. Atualize a mesa e tente novamente", 409);
            }

            //validar a transicao
            if (nextStatus[currentStatus] !== change.status) {
                throw new AppError("Transição de estado inválida para esta mesa", 409);
            }

            //abre um atendimento
            if (!attendance) {
                if (!table.active) {
                    throw new AppError("Mesa inativa nao pode iniciar atendimento", 409);
                }

                await tx.attendance.create({
                    data: {
                        tableId: id,
                        status: "OPEN"
                    }
                });
            } else {
                //determinar o proximo status do atendimento
                const status = change.status === "closing_requested"
                    ? "CLOSING_REQUESTED"
                    : change.status === "awaiting_payment"
                        ? "AWAITING_PAYMENT"
                        : "CLOSED";

                //atualizar o atendimento
                const updated = await tx.attendance.updateMany({
                    where: {
                        id: attendance.id,
                        status: attendance.status
                    },
                    data: {
                        status,
                        ...(status === "CLOSING_REQUESTED"
                            ? { closingRequestedAt: new Date()}
                            : {}),
                        ...(status === "CLOSED"
                            ? { closedAt: new Date()}
                            : {})
                    }
                });

                if (updated.count !== 1) {
                    throw new AppError("O estado da mesa mudou. Atualize a mesa e tente novamente", 409);
                }

                //cria o trabalho de impressao da conta
                if (status == "CLOSING_REQUESTED") {
                    await tx.printJob.create({
                        data: {
                            attendanceId: attendance.id,
                            type: "BILL"
                        }
                    });
                }
            }

            //recupera o estado atualizado
            const result = await tx.restaurantTable.findUniqueOrThrow({
                where: { id },
                include: attendanceInclude
            });

            return {
                table: this.toEntity(result),
                attendance: result.attendances[0] ?? null
            };
        });
    }

    private toEntity(table: RestaurantTable): TableEntity {
        return new TableEntity(
            table.id,
            table.number,
            table.name,
            table.active,
            table.qrToken,
            table.createdAt,
            table.updatedAt
        )
    }
}