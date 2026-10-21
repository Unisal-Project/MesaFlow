import { z } from "zod";

export const tableIdSchema = z.object({
  id: z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform((value) => BigInt(value))
    .refine((value) => value <= 18446744073709551615n, "Invalid table id"),
});

export type TableIdDTO = z.infer<typeof tableIdSchema>;
