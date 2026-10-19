import { z } from "zod";
import { tableStatuses } from "../enity/table-status.js";

export const tableStatusSchema = z.enum(tableStatuses);

export type TableStatusDTO = z.infer<typeof tableStatusSchema>;
