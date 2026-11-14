import { z } from "zod";

export const createOrderSchema = z
  .object({
    attendanceId: z.string().regex(/^\d+$/, "ID do atendimento inválido"),
    customerName: z.string().trim().min(1).max(100).optional(),
    notes: z.string().max(500).optional(),
    items: z
      .array(
        z
          .object({
            productId: z.string().regex(/^\d+$/, "ID do produto inválido"),
            quantity: z.number().int().positive().max(999),
            notes: z.string().max(500).optional(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export type CreateOrderDTO = z.infer<typeof createOrderSchema>;
