import { z } from "zod";
import { createTableSchema } from "./create-table.dto.js";

export const updateTableSchema = createTableSchema;

export type UpdateTableDTO = z.infer<typeof updateTableSchema>;
