import { z } from "zod";

export const userIdSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, "User id must be a positive integer")
    .transform(BigInt),
});

export type UserIdDTO = z.infer<typeof userIdSchema>;
