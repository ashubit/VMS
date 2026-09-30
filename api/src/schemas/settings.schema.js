import { z } from 'zod';

export const securityPolicySchema = z.object({
  badgeRequired: z.boolean(),
  photoRequired: z.boolean(),
  escortRequired: z.boolean(),
  maxSessionHours: z.number().int().min(1).max(24),
  retentionDays: z.number().int().min(1).max(3650),
  emergencyContact: z.string().trim().max(160)
}).strict();

export const tenantConfigSchema = z.object({
  ndaTitle: z.string().trim().min(2).max(160),
  ndaText: z.string().trim().min(20).max(5000),
  checkInInstructions: z.string().trim().min(2).max(1000),
  notifyHosts: z.boolean()
}).strict();
