import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().pipe(z.email().max(180)),
    password: z.string().min(8),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().pipe(z.email()),
    password: z.string().min(1),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128),
  })
  .strict();

export type RegisterDTO = z.infer<typeof registerSchema>;
export type LoginDTO = z.infer<typeof loginSchema>;
