import { Router } from 'express';
import { authenticate, csrf, requireAccess, requireTenantModule } from '../middleware/auth.js';
import { verifyPassSchema } from '../schemas/access.schema.js';
import { disableQrPassSchema } from '../schemas/qr-pass.schema.js';
import { QrPassService } from '../services/qr-pass.service.js';
import { asyncHandler } from '../utils/async.js';

export function qrPassRoutes() {
  const router = Router();

  router.get('/', authenticate, requireTenantModule('QR_PASSES'), requireAccess({ permissions: ['PASS_VERIFY'] }), asyncHandler(async (req, res) => {
    res.json({ passes: await new QrPassService(req.db).list(req.user) });
  }));

  router.post('/verify', authenticate, csrf, requireTenantModule('SCANNER'), requireAccess({ permissions: ['PASS_VERIFY'] }), asyncHandler(async (req, res) => {
    const parsed = verifyPassSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid request' });

    const result = await new QrPassService(req.db).verify(req.user, parsed.data.token);
    res.status(result.status).json(result.body);
  }));

  router.patch('/:id/disable', authenticate, csrf, requireTenantModule('QR_PASSES'), requireAccess({ permissions: ['PASS_DISABLE'] }), asyncHandler(async (req, res) => {
    const parsed = disableQrPassSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid request' });

    const result = await new QrPassService(req.db).disable(req.user, req.params.id, parsed.data.reason);
    res.status(result.status).json(result.body);
  }));

  return router;
}
