import { z } from "zod";
import { promoIssue, promoSchemaFields } from "../../products/promotion.js";

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(100),

    description: z.string().trim().max(255).nullable().optional(),

    active: z.boolean(),

    // Ausentes no PUT mantêm o valor atual (o toggle de status não os envia).
    ...promoSchemaFields,
  })
  .strict()
  .superRefine((category, ctx) => {
    const message = promoIssue(category);
    if (message) ctx.addIssue({ code: "custom", message });
  });

export type UpdateCategoryDTO = z.infer<typeof updateCategorySchema>;
