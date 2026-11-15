import { PrismaConnector } from "../../../database/prisma.js";
import type { Prisma } from "../../../generated/prisma/client.js";
import { AppError } from "../../../shared/errors/app-errors.js";
import type {
  ClosedAttendance,
  ConfirmedPayment,
  PaymentRepository,
} from "./payment.repository.js";
import type { CloseAttendanceDTO } from "../dto/close-attendance.dto.js";

const cents = (value: { toString(): string } | number) =>
  Math.round(Number(value.toString()) * 100);
const fromCents = (value: number) => (value / 100).toFixed(2);

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

  /**
   * Fecha a conta pelo administrativo: registra um pagamento por forma usada,
   * grava a taxa de serviço e encerra o atendimento (regras 19 e 20).
   */
  async closeWithPayments(
    attendanceId: bigint,
    data: CloseAttendanceDTO,
    closedById: bigint | null,
  ): Promise<ClosedAttendance> {
    return this.prismaClient.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await tx.$queryRaw`SELECT id FROM attendances WHERE id = ${attendanceId} FOR UPDATE`;

        const attendance = await tx.attendance.findUnique({
          where: { id: attendanceId },
          select: { id: true, status: true },
        });
        if (!attendance) throw new AppError("Atendimento não encontrado.", 404);
        if (
          attendance.status === "CLOSED" ||
          attendance.status === "CANCELLED"
        ) {
          throw new AppError("Esta conta já foi encerrada.", 409);
        }

        const total = await tx.attendanceTotal.findUnique({
          where: { attendanceId },
          select: { total: true },
        });
        const subtotalCents = cents(total?.total ?? 0);
        if (subtotalCents <= 0) {
          throw new AppError("Não é possível fechar uma conta sem itens.", 409);
        }
        const settings = await tx.restaurantSettings.findUnique({
          where: { id: 1 },
          select: { serviceFeeRate: true },
        });
        if (!settings)
          throw new AppError(
            "Configurações do restaurante indisponíveis.",
            503,
          );
        const serviceCents = data.serviceFeeWaived
          ? 0
          : Math.round((subtotalCents * Number(settings.serviceFeeRate)) / 100);
        const totalCents = subtotalCents + serviceCents;

        const paidCents = data.payments.reduce(
          (sum, payment) => sum + cents(payment.amount),
          0,
        );
        if (paidCents !== totalCents) {
          throw new AppError(
            `Os pagamentos somam R$ ${fromCents(paidCents)}, mas a conta é R$ ${fromCents(totalCents)}.`,
            409,
          );
        }
        for (const payment of data.payments) {
          if (
            payment.receivedAmount !== undefined &&
            payment.method !== "CASH"
          ) {
            throw new AppError("Valor recebido só se aplica a dinheiro.", 400);
          }
          if (
            payment.receivedAmount !== undefined &&
            cents(payment.receivedAmount) < cents(payment.amount)
          ) {
            throw new AppError("Valor recebido menor que o valor pago.", 400);
          }
        }

        const closedAt = new Date();
        for (const payment of data.payments) {
          await tx.payment.create({
            data: {
              attendanceId,
              amount: payment.amount.toFixed(2),
              method: payment.method,
              receivedAmount: payment.receivedAmount?.toFixed(2) ?? null,
              changeAmount:
                payment.receivedAmount === undefined
                  ? null
                  : fromCents(
                      cents(payment.receivedAmount) - cents(payment.amount),
                    ),
              processingFee: payment.processingFee?.toFixed(2) ?? null,
              status: "PAID",
              paidAt: closedAt,
              createdById: closedById,
            },
          });
        }

        const closed = await tx.attendance.updateMany({
          where: { id: attendanceId, status: attendance.status },
          data: {
            status: "CLOSED",
            closedAt,
            closedById,
            serviceFee: fromCents(serviceCents),
          },
        });
        if (closed.count !== 1) {
          throw new AppError(
            "O atendimento mudou. Atualize e tente novamente.",
            409,
          );
        }

        return {
          attendanceId,
          subtotal: fromCents(subtotalCents),
          serviceFee: fromCents(serviceCents),
          total: fromCents(totalCents),
          closedAt,
        };
      },
    );
  }
}
