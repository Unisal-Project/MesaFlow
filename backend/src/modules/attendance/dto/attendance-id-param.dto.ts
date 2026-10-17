import { z } from "zod";

export const attendanceIdParamSchema = z.object({
  attendanceId: z.string().regex(/^\d+$/, "ID do atendimento inválido")
})

export type AttendanceIdParamDTO = z.infer<
    typeof attendanceIdParamSchema
>;