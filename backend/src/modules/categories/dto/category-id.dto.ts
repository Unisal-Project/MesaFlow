import { z } from "zod";

export const categoryIdSchema = z.object({
    id: z.string()
        .regex(/^\d+$/, "Category id must be a positive integer")
        .transform(BigInt)
});

export type CategoryIdDTO = z.infer<typeof categoryIdSchema>;