import { z } from 'zod';

export const disableQrPassSchema = z.object({
  reason: z.string().trim().max(240).optional().default('')
}).strict();
