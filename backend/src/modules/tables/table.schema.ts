import { z } from "zod";

export const TableSchema = z.object({
  number: z.number().int().positive().max(4294967295),
  name: z.string().trim().min(1).max(100),
  active: z.boolean().default(true),
});

export const TableIdSchema = z.object({
  id: z.string().regex(/^[1-9]\d*$/).transform((value) => BigInt(value))
    .refine((value) => value <= 18446744073709551615n, "Invalid table id"),
});
export const TableTokenSchema = z.object({ token: z.string().min(1).max(120) });
export const TableStatusSchema = z.enum(["available", "occupied", "closing_requested", "awaiting_payment"]);
export const TableStatusChangeSchema = z.object({
  status: TableStatusSchema,
  attendanceId: TableIdSchema.shape.id.nullable(),
});

export type TableDTO = z.infer<typeof TableSchema>;
export type TableIdDTO = z.infer<typeof TableIdSchema>;
export type TableStatus = z.infer<typeof TableStatusSchema>;
export type TableStatusChangeDTO = z.infer<typeof TableStatusChangeSchema>;
