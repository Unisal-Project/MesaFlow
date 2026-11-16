import { z } from "zod";

export const qrOrderSchema = z
  .object({
    customerName: z.string().trim().min(1).max(100),
    notes: z.string().max(500).optional(),
    items: z
      .array(
        z
          .object({
            productId: z.string().regex(/^\d+$/, "ID do produto inválido"),
            quantity: z.number().int().positive().max(99),
            notes: z.string().max(500).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(100, "Limite de 100 itens por pedido"),
  })
  .strict();

export const qrTokenParamSchema = z.object({
  token: z.string().min(1).max(120),
});
