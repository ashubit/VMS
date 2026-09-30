import { Router } from 'express';
import { authenticate, csrf, requireAccess } from '../middleware/auth.js';
import { kioskSchema } from '../schemas/kiosk.schema.js';
import { KioskService } from '../services/kiosk.service.js';
import { asyncHandler } from '../utils/async.js';

export function kioskRoutes() {
  const router = Router();

  router.get('/', authenticate, requireAccess({ permissions: ['KIOSK_MANAGE'] }), asyncHandler(async (req, res) => {
    res.json({ kiosks: await new KioskService(req.db).list(req.user) });
  }));

  router.post('/', authenticate, csrf, requireAccess({ permissions: ['KIOSK_MANAGE'] }), asyncHandler(async (req, res) => {
    const parsed = kioskSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors });

    const result = await new KioskService(req.db).create(req.user, parsed.data);
    res.status(result.status).json(result.body);
  }));

  router.patch('/:id', authenticate, csrf, requireAccess({ permissions: ['KIOSK_MANAGE'] }), asyncHandler(async (req, res) => {
    const parsed = kioskSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid request' });

    const result = await new KioskService(req.db).update(req.user, req.params.id, parsed.data);
    res.status(result.status).json(result.body);
  }));

  return router;
}
