import { z } from "zod";

export const createTableSchema = z.object({
  number: z.number().int().positive().max(4294967295),

  name: z.string().trim().min(1).max(100),
  
  active: z.boolean().default(true),
});

export type CreateTableDTO = z.infer<typeof createTableSchema>;