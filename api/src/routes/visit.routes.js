import { Router } from 'express';
import { authenticate, csrf, requireAccess, requireTenantModule } from '../middleware/auth.js';
import { visitSchema, visitStatusSchema } from '../schemas/visit.schema.js';
import { verifyPassSchema } from '../schemas/access.schema.js';
import { QrPassService } from '../services/qr-pass.service.js';
import { VisitService } from '../services/visit.service.js';
import { asyncHandler } from '../utils/async.js';

export function visitRoutes() {
  const router = Router();

  router.get('/', authenticate, requireTenantModule('VISITS'), asyncHandler(async (req, res) => {
    res.json({ visits: await new VisitService(req.db).list(req.user) });
  }));

  router.post('/', authenticate, csrf, requireAccess({ permissions: ['VISIT_CREATE'] }), asyncHandler(async (req, res) => {
    const parsed = visitSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors });

    const result = await new VisitService(req.db).create(req.user, parsed.data);
    res.status(result.status).json(result.body);
  }));

  router.patch('/:id/status', authenticate, csrf, requireAccess({ permissions: ['VISIT_RECEIVE'] }), asyncHandler(async (req, res) => {
    const parsed = visitStatusSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid request' });

    const result = await new VisitService(req.db).transition(req.user, req.params.id, parsed.data.status);
    res.status(result.status).json(result.body);
  }));

  router.post('/:id/pass', authenticate, csrf, requireAccess({ permissions: ['PASS_ISSUE'] }), asyncHandler(async (req, res) => {
    const result = await new QrPassService(req.db).issue(req.user, req.params.id);
    res.status(result.status).json(result.body);
  }));

  router.post('/pass/verify', authenticate, csrf, requireAccess({ permissions: ['PASS_VERIFY'] }), asyncHandler(async (req, res) => {
    const parsed = verifyPassSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid request' });

    const result = await new QrPassService(req.db).verify(req.user, parsed.data.token);
    res.status(result.status).json(result.body);
  }));

  return router;
}
