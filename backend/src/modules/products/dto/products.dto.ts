import { z } from "zod";

const ProductCategoryIdSchema = z
  .union([
    z.string().regex(/^\d+$/, "O ID da categoria deve ser um inteiro positivo"),
    z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  ])
  .transform(BigInt)
  .refine((id) => id > 0n, "O ID da categoria deve ser um inteiro positivo");

const ProductFieldsSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().nullable().optional(),
  price: z.number().positive().max(99_999_999.99).multipleOf(0.01),
  stockQuantity: z.number().int().nonnegative(),
  available: z.boolean(),
  active: z.boolean(),
  categoryId: ProductCategoryIdSchema,
});

export const ProductSchema = ProductFieldsSchema.extend({
  stockQuantity: ProductFieldsSchema.shape.stockQuantity.default(0),
  available: ProductFieldsSchema.shape.available.default(true),
  active: ProductFieldsSchema.shape.active.default(true),
}).strict();

export const ProductUpdateSchema = ProductFieldsSchema.partial()
  .strict()
  .refine((product) => Object.keys(product).length > 0, {
    message: "Informe pelo menos um campo do produto",
  });

export const ProductIdSchema = z
  .string()
  .regex(/^\d+$/, "O ID do produto deve ser um inteiro positivo")
  .transform(BigInt)
  .refine((id) => id > 0n, "O ID do produto deve ser um inteiro positivo");

export const ProductCategoryUpdateSchema = z
  .object({
    newCategoryId: ProductCategoryIdSchema,
  })
  .strict();

export type ProductDTO = z.infer<typeof ProductSchema>;
export type ProductUpdateDTO = z.infer<typeof ProductUpdateSchema>;
