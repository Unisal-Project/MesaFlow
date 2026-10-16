import { z } from "zod";

export const findOrdersByAttendanceIdSchema = z.object({
    attendanceId: z.string().regex(/^\d+$/, "ID do atendimento inválido"),
});

export type FindOrdersByAttendanceIdDTO = z.infer<
    typeof findOrdersByAttendanceIdSchema
>;
