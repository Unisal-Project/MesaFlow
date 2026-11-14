import { PrismaConnector } from "../../database/prisma.js";
import { AppError } from "../../shared/errors/app-errors.js";
import type { Prisma } from "../../generated/prisma/client.js";

const withTable = { table: { select: { number: true } } } as const;
type Call = Prisma.WaiterCallGetPayload<{ include: typeof withTable }>;
const serialize = (call: Call) => ({
  id: call.id.toString(),
  tableId: call.tableId.toString(),
  table: call.table,
  status: call.status,
  createdAt: call.createdAt.toISOString(),
  attendedAt: call.attendedAt?.toISOString() ?? null,
});

export class WaiterCallService {
  constructor(private readonly db: typeof PrismaConnector = PrismaConnector) {}

  async call(token: string) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM restaurant_tables WHERE qr_token = ${token} FOR UPDATE`;
      const table = await tx.restaurantTable.findUnique({
        where: { qrToken: token },
        select: { id: true, active: true },
      });
      if (!table?.active) {
        throw new AppError("QR Code inválido ou mesa indisponível", 404);
      }
      const pending = await tx.waiterCall.findFirst({
        where: { tableId: table.id, status: "PENDING" },
        include: withTable,
      });
      // Repetir a chamada retorna a mesma solicitação, sem criar outra.
      if (pending) return serialize(pending);
      return serialize(
        await tx.waiterCall.create({
          data: { tableId: table.id },
          include: withTable,
        }),
      );
    });
  }

  async pending() {
    return (
      await this.db.waiterCall.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        include: withTable,
      })
    ).map(serialize);
  }

  async attend(id: bigint) {
    // updateMany evita alterar o horário ao repetir a confirmação.
    await this.db.waiterCall.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "ATTENDED", attendedAt: new Date() },
    });
    const call = await this.db.waiterCall.findUnique({
      where: { id },
      include: withTable,
    });
    if (!call) throw new AppError("Solicitação não encontrada", 404);
    return serialize(call);
  }
}
