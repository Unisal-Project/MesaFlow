import { z } from "zod";

export const createAttendanceSchema = z.object({
  tableId: z.string().regex(/^\d+$/, "ID da mesa inválido")
});

export const findOpenAttendanceSchema = z.object({
  tableId: z.string().regex(/^\d+$/, "ID da mesa inválido")
})

export const findAttendanceTotalSchema = z.object({
  attendanceId: z.string().regex(/^\d+$/, "ID do atendimento inválido")
})

export type CreateAttendanceInput = z.infer<typeof createAttendanceSchema>;
export type findOpenAttendanceInput= z.infer<typeof findOpenAttendanceSchema>;
export type findAttendanceTotalInput = z.infer<typeof findAttendanceTotalSchema>;
