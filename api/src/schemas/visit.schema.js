import { z } from 'zod';

export const visitSchema = z.object({
  visitorName: z.string().trim().min(2).max(150),
  visitorEmail: z.union([z.email().max(254), z.literal('')]).optional(),
  purpose: z.string().trim().min(2).max(500),
  expectedAt: z.iso.datetime({ offset: true }),
  hostId: z.string().optional(),
  ndaAccepted: z.boolean().optional().default(false)
}).strict();

export const visitStatusSchema = z.object({
  status: z.enum(['ARRIVED', 'CHECKED_OUT', 'CANCELLED'])
}).strict();
