import { z } from 'zod';

export const verifyPassSchema = z.object({
  token: z.string().trim().min(24).max(256)
}).strict();
