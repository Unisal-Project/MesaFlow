import { z } from "zod";

import { tableStatusSchema } from "./table-status.dto.js";
import { tableIdSchema } from "./table-id.dto.js";

export const tableStatusChangeSchema = z.object({
  status: tableStatusSchema,
  attendanceId: tableIdSchema.shape.id.nullable(),
});

export type TableStatusChangeDTO = z.infer<typeof tableStatusChangeSchema>;
