import { Router } from 'express';
import { authenticate, csrf, requireAccess } from '../middleware/auth.js';
import { tenantSchema } from '../schemas/tenant.schema.js';
import { TenantService } from '../services/tenant.service.js';
import { asyncHandler } from '../utils/async.js';

export function tenantRoutes() {
  const router = Router();

  router.get('/', authenticate, requireAccess({ permissions: ['TENANT_MANAGE'] }), asyncHandler(async (req, res) => {
    res.json({ tenants: await new TenantService(req.db).list() });
  }));

  router.post('/', authenticate, csrf, requireAccess({ permissions: ['TENANT_MANAGE'] }), asyncHandler(async (req, res) => {
    const parsed = tenantSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors });

    const id = await new TenantService(req.db).create(req.user, parsed.data);
    res.status(201).json({ id });
  }));

  router.patch('/:id', authenticate, csrf, requireAccess({ permissions: ['TENANT_MANAGE'] }), asyncHandler(async (req, res) => {
    const parsed = tenantSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid request' });

    const result = await new TenantService(req.db).update(req.user, req.params.id, parsed.data);
    res.status(result.status).json(result.body);
  }));

  return router;
}
