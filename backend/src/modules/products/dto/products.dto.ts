import { z } from "zod";
import { promoIssue, promoSchemaFields } from "../promotion.js";

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
  trackStock: z.boolean(),
  available: z.boolean(),
  active: z.boolean(),
  categoryId: ProductCategoryIdSchema,
  additionalCategoryIds: z
    .array(ProductCategoryIdSchema)
    .refine(
      (ids) => new Set(ids).size === ids.length,
      "Categorias adicionais duplicadas",
    )
    .optional(),
  ...promoSchemaFields,
});

// No PATCH parcial o repositório revalida com os valores atuais.
const checkPromo = (
  product:
    | z.infer<typeof ProductFieldsSchema>
    | Partial<z.infer<typeof ProductFieldsSchema>>,
  ctx: z.RefinementCtx,
) => {
  const message = promoIssue(product, product.price);
  if (message) ctx.addIssue({ code: "custom", message });
};

export const ProductSchema = ProductFieldsSchema.extend({
  stockQuantity: ProductFieldsSchema.shape.stockQuantity.default(0),
  trackStock: ProductFieldsSchema.shape.trackStock.default(true),
  available: ProductFieldsSchema.shape.available.default(true),
  active: ProductFieldsSchema.shape.active.default(true),
})
  .strict()
  .refine(
    (product) => !product.additionalCategoryIds?.includes(product.categoryId),
    { message: "A categoria principal não pode ser adicional" },
  )
  .superRefine(checkPromo);

export const ProductUpdateSchema = ProductFieldsSchema.partial()
  .strict()
  .refine(
    (product) =>
      product.categoryId === undefined ||
      !product.additionalCategoryIds?.includes(product.categoryId),
    {
      message: "A categoria principal não pode ser adicional",
    },
  )
  .refine((product) => Object.keys(product).length > 0, {
    message: "Informe pelo menos um campo do produto",
  })
  .superRefine(checkPromo);

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
