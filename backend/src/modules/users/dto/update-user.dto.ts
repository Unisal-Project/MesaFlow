import { z } from "zod";

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    email: z.email().max(180).optional(),
    password: z.string().min(8).optional(),
    role: z.enum(["ADMIN", "EMPLOYEE"]).optional(),
    active: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0);

export type UpdateUserDTO = z.infer<typeof updateUserSchema>;
