import { z } from "zod";

export const confirmAttendancePaymentParamsSchema = z.object({
  attendanceId: z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform((value) => BigInt(value)),
});
