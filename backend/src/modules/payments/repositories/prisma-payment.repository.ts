import { PrismaConnector } from "../../../database/prisma.js";
import type { Prisma } from "../../../generated/prisma/client.js";
import { AppError } from "../../../shared/errors/app-errors.js";
import type {
  ConfirmedPayment,
  PaymentRepository,
} from "./payment.repository.js";

export class PrismaPaymentRepository implements PaymentRepository {
  constructor(
    private readonly prismaClient: typeof PrismaConnector = PrismaConnector,
  ) {}

  async confirmFullPayment(attendanceId: bigint): Promise<ConfirmedPayment> {
    return this.prismaClient.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Bloqueia a conta para evitar duas confirmações simultâneas.
        await tx.$queryRaw`SELECT id FROM attendances WHERE id = ${attendanceId} FOR UPDATE`;

        const attendance = await tx.attendance.findUnique({
          where: { id: attendanceId },
          select: { id: true, status: true },
        });

        if (!attendance) throw new AppError("Atendimento não encontrado.", 404);

        if (attendance.status !== "CLOSING_REQUESTED") {
          throw new AppError(
            "A conta precisa estar solicitada antes de confirmar o pagamento.",
            409,
          );
        }

        const total = await tx.attendanceTotal.findUnique({
          where: { attendanceId },
          select: { total: true },
        });

        const amount = total?.total.toString() ?? "0.00";

        if (Number(amount) <= 0)
          throw new AppError(
            "Não é possível confirmar pagamento sem itens.",
            409,
          );

        const paidAt = new Date();

        await tx.payment.create({
          data: { attendanceId, amount, status: "PAID", paidAt },
        });

        const closed = await tx.attendance.updateMany({
          where: { id: attendanceId, status: "CLOSING_REQUESTED" },
          data: { status: "CLOSED", closedAt: paidAt },
        });

        if (closed.count !== 1)
          throw new AppError(
            "O atendimento mudou. Atualize e tente novamente.",
            409,
          );

        return { attendanceId, amount, paidAt };
      },
    );
  }
}
