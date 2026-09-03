import { z } from "zod";

export const CategorySchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(255).nullable().optional(),
    active: z.boolean().optional().default(true),
  })
  .strict();

export const CategoryIdSchema = z
  .string()
  .regex(/^\d+$/, "Category id must be a positive integer")
  .transform(BigInt)
  .refine((id) => id > 0n, "Category id must be a positive integer");

export type CategoryDtoType = z.infer<typeof CategorySchema>;
