import { z } from 'zod';
import { TENANT_MODULES } from '../constants/modules.js';

export const tenantSchema = z.object({
  name: z.string().trim().min(2).max(160),
  suite: z.string().trim().max(80).optional().default(''),
  floor: z.string().trim().max(80).optional().default(''),
  contactEmail: z.union([z.email().max(254), z.literal('')]).optional().default(''),
  active: z.boolean().optional().default(true),
  allowedModules: z.array(z.enum(TENANT_MODULES)).optional().default(TENANT_MODULES)
}).strict();
