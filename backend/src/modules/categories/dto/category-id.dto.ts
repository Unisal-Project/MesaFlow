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
    deleteProducts: z
      .literal("true")
      .transform(() => true)
      .optional(),
    moveTo: z
      .string()
      .regex(/^\d+$/, "A categoria de destino deve ser um inteiro positivo")
      .transform(BigInt)
      .refine(
        (id) => id > 0n,
        "A categoria de destino deve ser um inteiro positivo",
      )
      .optional(),
  })
  .strict()
  .refine(
    (query) => !(query.moveTo !== undefined && query.deleteProducts),
    "Escolha mover ou excluir os produtos, não ambos.",
  );

export type CategoryIdDTO = z.infer<typeof categoryIdSchema>;
