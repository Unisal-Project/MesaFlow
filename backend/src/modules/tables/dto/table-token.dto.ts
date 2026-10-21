import { z } from "zod";

export const tableTokenSchema = z.object({
  token: z.string().min(1).max(120),
});

export type TableTokenDTO = z.infer<typeof tableTokenSchema>;
