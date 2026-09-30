import { Router } from 'express';
import { authenticate, csrf, requireAccess } from '../middleware/auth.js';
import { userCreateSchema, userPatchSchema } from '../schemas/user.schema.js';
import { UserService } from '../services/user.service.js';
import { asyncHandler } from '../utils/async.js';

export function userRoutes() {
  const router = Router();

  router.get('/', authenticate, requireAccess({ permissions: ['USER_MANAGE'] }), asyncHandler(async (req, res) => {
    res.json({ users: await new UserService(req.db).list(req.user) });
  }));

  router.post('/', authenticate, csrf, requireAccess({ permissions: ['USER_MANAGE'] }), asyncHandler(async (req, res) => {
    const parsed = userCreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors });

    const result = await new UserService(req.db).create(req.user, parsed.data);
    res.status(result.status).json(result.body);
  }));

  router.patch('/:id', authenticate, csrf, requireAccess({ permissions: ['USER_MANAGE'] }), asyncHandler(async (req, res) => {
    const parsed = userPatchSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid request' });

    const result = await new UserService(req.db).update(req.user, req.params.id, parsed.data);
    res.status(result.status).json(result.body);
  }));

  return router;
}
