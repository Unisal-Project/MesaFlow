import { AppError } from "../../shared/errors/app-errors.js";
import { PrismaConnector } from "../../database/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";

export interface QrOrderInput {
  customerName: string;
  notes?: string;
  items: Array<{ productId: string; quantity: number; notes?: string }>;
}

export class QrOrderService {
  constructor(
    private readonly prismaClient: typeof PrismaConnector = PrismaConnector,
  ) {}

  async requestClosing(token: string) {
    return this.prismaClient.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await tx.$queryRaw`
        SELECT id FROM restaurant_tables WHERE qr_token = ${token} FOR UPDATE
      `;
        const table = await tx.restaurantTable.findUnique({
          where: { qrToken: token },
          select: { id: true, active: true },
        });
        if (!table || !table.active)
          throw new AppError("QR Code inválido ou mesa indisponível", 404);

        const attendance = await tx.attendance.findFirst({
          where: {
            tableId: table.id,
            status: { in: ["OPEN", "CLOSING_REQUESTED", "AWAITING_PAYMENT"] },
          },
          orderBy: { createdAt: "desc" },
        });
        if (!attendance)
          throw new AppError("Não há atendimento aberto nesta mesa.", 409);
        if (attendance.status !== "OPEN")
          throw new AppError("A conta desta mesa já foi solicitada.", 409);

        const updated = await tx.attendance.updateMany({
          where: { id: attendance.id, status: "OPEN" },
          data: { status: "CLOSING_REQUESTED", closingRequestedAt: new Date() },
        });
        if (updated.count !== 1)
          throw new AppError(
            "O atendimento mudou. Atualize e tente novamente.",
            409,
          );
        await tx.printJob.create({
          data: { attendanceId: attendance.id, type: "BILL" },
        });
        return {
          attendanceId: attendance.id.toString(),
          status: "closing_requested" as const,
        };
      },
    );
  }

  async submit(token: string, data: QrOrderInput) {
    return this.prismaClient.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await tx.$queryRaw`
        SELECT id FROM restaurant_tables WHERE qr_token = ${token} FOR UPDATE
      `;

        const table = await tx.restaurantTable.findUnique({
          where: { qrToken: token },
          select: { id: true, active: true },
        });
        if (!table || !table.active)
          throw new AppError("QR Code inválido ou mesa indisponível", 404);

        let attendance = await tx.attendance.findFirst({
          where: {
            tableId: table.id,
            status: { in: ["OPEN", "CLOSING_REQUESTED", "AWAITING_PAYMENT"] },
          },
          orderBy: { createdAt: "desc" },
        });
        if (attendance && attendance.status !== "OPEN") {
          throw new AppError("Atendimento não está aberto para pedidos.", 409);
        }
        if (!attendance)
          attendance = await tx.attendance.create({
            data: { tableId: table.id, status: "OPEN" },
          });

        const productIds = data.items.map(({ productId }) => BigInt(productId));
        const products = await tx.product.findMany({
          where: { id: { in: productIds }, active: true, available: true },
          select: { id: true, price: true },
        });
        const byId = new Map(
          products.map((product) => [product.id.toString(), product]),
        );
        const items = data.items.map((item) => {
          const product = byId.get(item.productId);
          if (!product)
            throw new AppError("Produto não encontrado ou indisponível.", 409);
          return {
            productId: product.id,
            quantity: item.quantity,
            unitPrice: product.price,
            notes: item.notes,
          };
        });

        const order = await tx.order.create({
          data: {
            attendanceId: attendance.id,
            customerName: data.customerName,
            notes: data.notes,
            items: { create: items },
          },
          include: { items: true },
        });

        return {
          attendanceId: attendance.id.toString(),
          order: {
            id: order.id.toString(),
            attendanceId: order.attendanceId.toString(),
            customerName: order.customerName,
            notes: order.notes,
            items: order.items.map((item) => ({
              id: item.id.toString(),
              orderId: item.orderId.toString(),
              productId: item.productId.toString(),
              quantity: item.quantity,
              unitPrice: item.unitPrice.toString(),
              notes: item.notes,
            })),
          },
        };
      },
    );
  }
}
