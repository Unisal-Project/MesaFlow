import { PrismaConnector } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-errors.js";

import type {
  TableRepository,
  CreateTableData,
  UpdateTableData,
} from "./table.repository.js";
import type { RestaurantTable } from "../../../generated/prisma/client.js";
import type { TableWithAttendance } from "./table-with-attendance.repository.js";
import type { TableStatusChange } from "../enity/table-status.js";

import type { Prisma } from "../../../generated/prisma/client.js";

import { TableEntity } from "../enity/table.entity.js";
import { resolveAttendanceTransition } from "../utils/resolve-attendance-transition.js";

const attendanceInclude = {
  attendances: {
    where: {
      status: {
        in: ["OPEN", "CLOSING_REQUESTED", "AWAITING_PAYMENT"],
      },
    },
    select: {
      id: true,
      status: true,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 1,
  },
} satisfies Prisma.RestaurantTableInclude;

type PrismaTableWithAttendance = Prisma.RestaurantTableGetPayload<{
  include: typeof attendanceInclude;
}>;

export class PrismaTableRepository implements TableRepository {
  constructor(
    private readonly prismaClient: typeof PrismaConnector = PrismaConnector,
  ) {}

  async existsById(id: bigint): Promise<boolean> {
    const table = await this.prismaClient.restaurantTable.findUnique({
      where: { id },
      select: { id: true },
    });

    return table !== null;
  }

  async create(data: CreateTableData): Promise<TableEntity> {
    try {
      const table = await this.prismaClient.restaurantTable.create({
        data: {
          number: data.number,
          name: data.name,
          active: data.active,
          qrToken: data.qrToken,
        },
      });

      return this.toEntity(table);
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async findById(id: bigint): Promise<TableEntity | null> {
    const table = await this.prismaClient.restaurantTable.findUnique({
      where: { id },
    });

    if (!table) {
      return null;
    }

    return this.toEntity(table);
  }

  async findAll(): Promise<TableEntity[]> {
    const tables = await this.prismaClient.restaurantTable.findMany({
      orderBy: {
        number: "asc",
      },
    });

    return tables.map((table) => this.toEntity(table));
  }

  async delete(id: bigint): Promise<TableEntity> {
    try {
      const table = await this.prismaClient.restaurantTable.delete({
        where: { id },
      });

      return this.toEntity(table);
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async findByToken(token: string): Promise<TableEntity | null> {
    const table = await this.prismaClient.restaurantTable.findUnique({
      where: { qrToken: token },
    });

    if (!table) {
      return null;
    }

    return this.toEntity(table);
  }

  async findByIdWithAttendance(
    id: bigint,
  ): Promise<TableWithAttendance | null> {
    const table = await this.prismaClient.restaurantTable.findUnique({
      where: { id },
      include: attendanceInclude,
    });

    if (!table) {
      return null;
    }

    return this.toWithAttendance(table);
  }

  async findAllWithAttendance(): Promise<TableWithAttendance[]> {
    const tables = await this.prismaClient.restaurantTable.findMany({
      include: attendanceInclude,
      orderBy: {
        number: "asc",
      },
    });

    return tables.map((table) => this.toWithAttendance(table));
  }

  async updateWithAttendanceCheck(
    id: bigint,
    data: UpdateTableData,
  ): Promise<TableWithAttendance> {
    return this.prismaClient
      .$transaction(async (tx) => {
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
          include: attendanceInclude,
        });

        //verifica se a mesa existe
        if (!current) {
          throw new AppError("Mesa não encontrada", 404);
        }

        //Impedir a desativação com atendimento ativo
        if (!data.active && current.attendances.length > 0) {
          throw new AppError(
            "Feche o atendimento antes de desativar a mesa",
            409,
          );
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

        return this.toWithAttendance(updated);
      })
      .catch((error) => this.handleWriteError(error));
  }

  async changeStatusTransaction(
    id: bigint,
    change: TableStatusChange,
  ): Promise<TableWithAttendance> {
    return this.prismaClient
      .$transaction(async (tx) => {
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
          include: attendanceInclude,
        });

        if (!table) {
          throw new AppError("Mesa nao encontrada", 404);
        }

        const attendance = table.attendances[0] ?? null;

        // As regras usam o estado lido sob o bloqueio da transação.
        const status = resolveAttendanceTransition(
          table.active,
          attendance,
          change,
        );

        if (!attendance) {
          await tx.attendance.create({
            data: {
              tableId: id,
              status,
            },
          });
        } else {
          //atualizar o atendimento
          const updated = await tx.attendance.updateMany({
            where: {
              id: attendance.id,
              status: attendance.status,
            },
            data: {
              status,
              ...(status === "CLOSING_REQUESTED"
                ? { closingRequestedAt: new Date() }
                : {}),
              ...(status === "CLOSED" ? { closedAt: new Date() } : {}),
            },
          });

          if (updated.count !== 1) {
            throw new AppError(
              "O estado da mesa mudou. Atualize a mesa e tente novamente",
              409,
            );
          }

          //cria o trabalho de impressao da conta
          if (status == "CLOSING_REQUESTED") {
            await tx.printJob.create({
              data: {
                attendanceId: attendance.id,
                type: "BILL",
              },
            });
          }
        }

        //recupera o estado atualizado
        const result = await tx.restaurantTable.findUniqueOrThrow({
          where: { id },
          include: attendanceInclude,
        });

        return this.toWithAttendance(result);
      })
      .catch((error: unknown) => {
        if ((error as { code?: string })?.code === "P2002") {
          throw new AppError("Mesa já possui atendimento em andamento", 409);
        }

        throw error;
      });
  }

  private handleWriteError(error: unknown): never {
    const code = (error as { code?: string })?.code;

    if (code === "P2002") {
      throw new AppError("Número de mesa já cadastrado", 409);
    }

    if (code === "P2025") {
      throw new AppError("Mesa não encontrada", 404);
    }

    if (code === "P2003") {
      throw new AppError(
        "Mesa com histórico de atendimento não pode ser excluída; desative-a",
        409,
      );
    }

    throw error;
  }

  private toWithAttendance(
    table: PrismaTableWithAttendance,
  ): TableWithAttendance {
    const attendance = table.attendances[0];

    return {
      table: this.toEntity(table),
      attendance: attendance
        ? { id: attendance.id, status: attendance.status }
        : null,
    };
  }

  private toEntity(table: RestaurantTable): TableEntity {
    return new TableEntity(
      table.id,
      table.number,
      table.name,
      table.active,
      table.qrToken,
      table.createdAt,
      table.updatedAt,
    );
  }
}
