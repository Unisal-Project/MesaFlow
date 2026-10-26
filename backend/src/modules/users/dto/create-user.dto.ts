import { z } from "zod";

export const createUserSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.email().max(180),
    password: z.string().min(8),
    role: z.enum(["ADMIN", "EMPLOYEE"]).default("EMPLOYEE"),
    active: z.boolean().default(true),
  })
  .strict();

export type CreateUserDTO = z.infer<typeof createUserSchema>;
