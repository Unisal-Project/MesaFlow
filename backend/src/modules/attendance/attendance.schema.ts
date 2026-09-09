import { z } from "zod";

export const createAttendanceSchema = z.object({
  tableId: z.string().regex(/^\d+$/, "ID da mesa inválido")
});

export const findOpenAttendanceSchema = z.object({
  tableId: z.string().regex(/^\d+$/, "ID da mesa inválido")
})

export type CreateAttendanceInput = z.infer<typeof createAttendanceSchema>;
export type findOpenAttendanceInput= z.infer<typeof findOpenAttendanceSchema>;
