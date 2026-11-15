import { z } from "zod";

export const categoryIdSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, "Category id must be a positive integer")
    .transform(BigInt),
});

// moveTo opcional: produtos da categoria excluída vão para essa categoria.
export const deleteCategoryQuerySchema = z
  .object({
    moveTo: z
      .string()
      .regex(/^\d+$/, "A categoria de destino deve ser um inteiro positivo")
      .transform(BigInt)
      .optional(),
  })
  .strict();

export type CategoryIdDTO = z.infer<typeof categoryIdSchema>;
