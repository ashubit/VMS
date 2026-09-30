import { z } from 'zod';
import { ROLES } from '../constants/roles.js';
import { PERMISSIONS } from '../constants/permissions.js';

const permissionOverridesSchema = z.object({
  grant: z.array(z.enum(PERMISSIONS)).optional().default([]),
  revoke: z.array(z.enum(PERMISSIONS)).optional().default([])
}).strict();

export const userCreateSchema = z.object({
  tenantId: z.string().optional(),
  name: z.string().trim().min(2).max(160),
  email: z.email().max(254),
  password: z.string().min(12).max(1024),
  role: z.enum(ROLES),
  permissionOverrides: permissionOverridesSchema.optional()
}).strict();

export const userPatchSchema = z.object({
  tenantId: z.string().nullable().optional(),
  name: z.string().trim().min(2).max(160).optional(),
  role: z.enum(ROLES).optional(),
  active: z.boolean().optional(),
  permissionOverrides: permissionOverridesSchema.optional()
}).strict();
