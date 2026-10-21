import { z } from "zod";

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(100),

    description: z.string().trim().max(255).nullable().optional(),

    active: z.boolean(),
  })
  .strict();

export type UpdateCategoryDTO = z.infer<typeof updateCategorySchema>;
