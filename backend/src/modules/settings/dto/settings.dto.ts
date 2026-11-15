import { z } from "zod";
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => value || null);
export const settingsSchema = z
  .object({
    serviceFeeRate: z.number().min(0).max(20).multipleOf(0.01),
    name: text(120),
    address: text(255),
    openingHours: text(255),
    contact: text(120),
  })
  .strict();
export type SettingsDTO = z.infer<typeof settingsSchema>;
