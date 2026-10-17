import { z } from "zod";

export const findOpenAttendanceSchema = z.object({
  tableId: z.string().regex(/^\d+$/, "ID da mesa inválido")
})

export type OpenAttendanceDTO = z.infer<
    typeof findOpenAttendanceSchema
>;