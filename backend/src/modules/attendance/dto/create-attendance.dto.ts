import { z } from "zod";

export const createAttendanceSchema = z.object({
  tableId: z.string().regex(/^\d+$/, "ID da mesa inválido")
});

export type CreateAttendanceDTO = z.infer<
    typeof createAttendanceSchema
>;
