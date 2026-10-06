import { randomUUID } from "node:crypto";
import QRCode from "qrcode";
import type { prisma } from "../../database/prisma.js";
import type { TableDTO, TableIdDTO, TableStatus, TableStatusChangeDTO } from "./table.schema.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../shared/errors/app-errors.js";

const attendanceInclude = {
  attendances: {
    where: { status: { in: ["OPEN", "CLOSING_REQUESTED", "AWAITING_PAYMENT"] } },
    select: { id: true, status: true },
    take: 1,
  },
} satisfies Prisma.RestaurantTableInclude;

const nextStatus: Record<TableStatus, TableStatus> = {
  available: "occupied",
  occupied: "closing_requested",
  closing_requested: "awaiting_payment",
  awaiting_payment: "available",
};

export class TableService {
  constructor(private readonly tableRepository: typeof prisma, private readonly frontendUrl: string) {}

  private present(table: { id: bigint; number: number; name: string | null; active: boolean; qrToken: string; attendances?: { id: bigint; status: string }[] }) {
    const url = new URL("/cardapio", this.frontendUrl);
    url.searchParams.set("mesa", table.qrToken);
    const attendance = table.attendances?.[0];
    const status: TableStatus = !attendance ? "available"
      : attendance.status === "AWAITING_PAYMENT" ? "awaiting_payment"
      : attendance.status === "CLOSING_REQUESTED" ? "closing_requested" : "occupied";
    return { id: table.id.toString(), number: table.number, name: table.name, active: table.active, menuUrl: url.toString(), status, attendanceId: attendance?.id.toString() ?? null };
  }

  async createTable(table: TableDTO) {
    try {
      const created = await this.tableRepository.restaurantTable.create({ data: { ...table, qrToken: randomUUID() } });
      return this.present(created);
    } catch (error) { return this.handleWriteError(error); }
  }

  async deleteTable({ id }: TableIdDTO) {
    try {
      return this.present(await this.tableRepository.restaurantTable.delete({ where: { id } }));
    } catch (error) { return this.handleWriteError(error); }
  }

  async editTable({ id }: TableIdDTO, table: TableDTO) {
    try {
      return await this.tableRepository.$transaction(async (tx) => {
        const current = await this.lockTable(tx, id);
        if (!table.active && current.attendances.length) {
          throw new AppError("Feche o atendimento antes de desativar a mesa", 409);
        }
        return this.present(await tx.restaurantTable.update({ where: { id }, data: table, include: attendanceInclude }));
      });
    } catch (error) { return this.handleWriteError(error); }
  }

  async getTableById({ id }: TableIdDTO) {
    const table = await this.tableRepository.restaurantTable.findUnique({ where: { id }, include: attendanceInclude });
    if (!table) throw new AppError("Mesa não encontrada", 404);
    return this.present(table);
  }

  async getAllTables() {
    const tables = await this.tableRepository.restaurantTable.findMany({
      orderBy: { number: "asc" },
      include: attendanceInclude,
    });
    return tables.map((table) => this.present(table));
  }

  private async lockTable(tx: Prisma.TransactionClient, id: bigint) {
    // Serializa as ações de tables sobre a mesma mesa, inclusive abertura/desativação.
    await tx.$queryRaw`SELECT id FROM restaurant_tables WHERE id = ${id} FOR UPDATE`;
    const table = await tx.restaurantTable.findUnique({ where: { id }, include: attendanceInclude });
    if (!table) throw new AppError("Mesa não encontrada", 404);
    return table;
  }

  async changeStatus({ id }: TableIdDTO, change: TableStatusChangeDTO) {
    try {
      return await this.tableRepository.$transaction(async (tx) => {
        const table = await this.lockTable(tx, id);
        const attendance = table.attendances[0];
        const current = this.present(table);
        if ((attendance?.id ?? null) !== change.attendanceId) {
          throw new AppError("O atendimento da mesa mudou. Atualize a mesa e tente novamente", 409);
        }
        if (nextStatus[current.status] !== change.status) {
          throw new AppError("Transição de estado inválida para esta mesa", 409);
        }

        if (!attendance) {
          if (!table.active) throw new AppError("Mesa inativa não pode iniciar atendimento", 409);
          await tx.attendance.create({ data: { tableId: id, status: "OPEN" } });
        } else {
          const status = change.status === "closing_requested" ? "CLOSING_REQUESTED"
            : change.status === "awaiting_payment" ? "AWAITING_PAYMENT" : "CLOSED";
          const updated = await tx.attendance.updateMany({
            where: { id: attendance.id, status: attendance.status },
            data: {
              status,
              ...(status === "CLOSING_REQUESTED" ? { closingRequestedAt: new Date() } : {}),
              ...(status === "CLOSED" ? { closedAt: new Date() } : {}),
            },
          });
          if (updated.count !== 1) throw new AppError("O estado da mesa mudou. Atualize a mesa e tente novamente", 409);
          if (status === "CLOSING_REQUESTED") {
            await tx.printJob.create({ data: { attendanceId: attendance.id, type: "BILL" } });
          }
        }
        const updated = await tx.restaurantTable.findUniqueOrThrow({ where: { id }, include: attendanceInclude });
        return this.present(updated);
      });
    } catch (error) {
      if ((error as { code?: string })?.code === "P2002") {
        throw new AppError("Mesa já possui atendimento em andamento", 409);
      }
      throw error;
    }
  }

  async getTableByToken(token: string) {
    const table = await this.tableRepository.restaurantTable.findUnique({ where: { qrToken: token } });
    if (!table || !table.active) throw new AppError("QR Code inválido ou mesa indisponível", 404);
    return { id: table.id.toString(), number: table.number, name: table.name };
  }

  async getQrCode(id: TableIdDTO) {
    const table = await this.getTableById(id);
    return QRCode.toBuffer(table.menuUrl, { type: "png", width: 512, margin: 4, errorCorrectionLevel: "M" });
  }

  private handleWriteError(error: unknown): never {
    const code = (error as { code?: string })?.code;
    if (code === "P2002") throw new AppError("Número de mesa já cadastrado", 409);
    if (code === "P2025") throw new AppError("Mesa não encontrada", 404);
    if (code === "P2003") throw new AppError("Mesa com histórico de atendimento não pode ser excluída; desative-a", 409);
    throw error;
  }
}
