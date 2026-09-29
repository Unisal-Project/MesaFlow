import { z } from "zod";

export const TableSchema = z.object({ 
number : z.number().int().positive(), 
name : z.string().min(1).max(100),
active : z.boolean().default(true)
 });

export const TableIdSchema = z.object({
    id : z.number().nonnegative()
})

 
export type TableDTO = z.infer<typeof TableSchema>;
export type TableIdDTO = z.infer<typeof TableIdSchema>;

