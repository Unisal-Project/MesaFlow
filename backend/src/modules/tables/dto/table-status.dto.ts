import { z } from "zod";

export const tableStatusSchema = z.enum([
    "available", 
    "occupied", 
    "closing_requested", 
    "awaiting_payment"
]);

export type TableStatusDTO = z.infer<typeof tableStatusSchema>;