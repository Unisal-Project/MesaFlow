import { z } from "zod";

export const createCategorySchema = z.object({
    name: z.string().trim().min(1).max(100),

    description: z.string().trim().max(255).nullable().optional(),

    active: z.boolean().default(true),
}).strict();

export type CreateCategoryDTO = z.infer <typeof createCategorySchema>;