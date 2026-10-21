import { z } from "zod";

export const createOrderSchema = z.object({
  attendanceId: z.string().regex(/^\d+$/, "ID do atendimento inválido"),
  customerName: z.string().trim().min(1).max(100).optional(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().regex(/^\d+$/, "ID do produto inválido"),
        quantity: z.number().int().positive(),
        notes: z.string().max(500).optional(),
      }),
    )
    .min(1),
});

export type CreateOrderDTO = z.infer<typeof createOrderSchema>;
