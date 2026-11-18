import { z } from "zod";

const idSchema = z
  .string()
  .regex(/^[1-9]\d*$/, "ID inválido")
  .transform((value) => BigInt(value));

export const orderIdParamsSchema = z.object({ id: idSchema });
export const tableIdParamsSchema = z.object({ id: idSchema });

const itemsSchema = z
  .array(
    z
      .object({
        productId: idSchema,
        quantity: z.number().int().positive().max(999),
        notes: z.string().trim().max(500).optional(),
      })
      .strict(),
  )
  .min(1, "Inclua pelo menos um item");

export const adminOrderItemsSchema = z
  .object({
    items: itemsSchema,
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

export const cancelOrderSchema = z
  .object({
    // Regra 15: funcionário/admin sempre informa o motivo.
    reason: z.string().trim().min(3).max(500),
    restoreStock: z.boolean(),
  })
  .strict();

export const listOrdersQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(366).default(90),
  // operational: contas abertas + pedidos de hoje e ontem (dia de operação) + contas
  // fechadas nas últimas 48 h. Com ele `days` é ignorado.
  scope: z.enum(["operational"]).optional(),
  // summary: só o necessário para avisar pedido novo (sem itens nem pagamentos).
  view: z.enum(["summary"]).optional(),
});

export type AdminOrderItemsDTO = z.infer<typeof adminOrderItemsSchema>;
export type CancelOrderDTO = z.infer<typeof cancelOrderSchema>;
