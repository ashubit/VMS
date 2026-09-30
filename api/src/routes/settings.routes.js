import { Router } from 'express';
import { authenticate, csrf, requireAccess } from '../middleware/auth.js';
import { securityPolicySchema, tenantConfigSchema } from '../schemas/settings.schema.js';
import { SettingsService } from '../services/settings.service.js';
import { asyncHandler } from '../utils/async.js';

export function settingsRoutes() {
  const router = Router();

  router.get('/security', authenticate, requireAccess({ roles: ['GLOBAL_ADMIN'] }), asyncHandler(async (req, res) => {
    res.json({ policy: await new SettingsService(req.db).getSecurityPolicy() });
  }));

  router.patch('/security', authenticate, csrf, requireAccess({ roles: ['GLOBAL_ADMIN'] }), asyncHandler(async (req, res) => {
    const parsed = securityPolicySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors });

    await new SettingsService(req.db).saveSecurityPolicy(req.user, parsed.data);
    res.json({ ok: true });
  }));

  router.get('/tenant', authenticate, requireAccess({ permissions: ['SETTINGS_MANAGE'] }), asyncHandler(async (req, res) => {
    res.json({ config: await new SettingsService(req.db).getTenantConfig(req.user) });
  }));

  router.patch('/tenant', authenticate, csrf, requireAccess({ permissions: ['SETTINGS_MANAGE'] }), asyncHandler(async (req, res) => {
    const parsed = tenantConfigSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors });

    await new SettingsService(req.db).saveTenantConfig(req.user, parsed.data);
    res.json({ ok: true });
  }));

  return router;
}
