import { z } from "zod";

const money = z.number().positive().max(99_999_999.99).multipleOf(0.01);

export const closeAttendanceSchema = z
  .object({
    serviceFeeWaived: z.boolean().default(false),
    payments: z
      .array(
        z
          .object({
            method: z.enum(["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD"]),
            amount: money,
            // Só faz sentido em dinheiro: o troco é calculado no backend.
            receivedAmount: money.optional(),
            // Tarifa da maquininha, apenas informativa (não altera o total).
            processingFee: z.number().nonnegative().multipleOf(0.01).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(10),
  })
  .strict();

export type CloseAttendanceDTO = z.infer<typeof closeAttendanceSchema>;
