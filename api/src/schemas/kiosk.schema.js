import { z } from 'zod';

export const kioskSchema = z.object({
  tenantId: z.string().nullable().optional(),
  name: z.string().trim().min(2).max(120),
  location: z.string().trim().min(2).max(160),
  mode: z.enum(['SHARED_LOBBY', 'TENANT_SUITE']),
  active: z.boolean()
}).strict();
