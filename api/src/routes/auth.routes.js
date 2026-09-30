import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { sessionCookieOptions } from '../config/env.js';
import { authenticate, csrf } from '../middleware/auth.js';
import { publicUser } from '../models/user.model.js';
import { loginSchema } from '../schemas/auth.schema.js';
import { AuthService } from '../services/auth.service.js';
import { asyncHandler } from '../utils/async.js';

export function authRoutes() {
  const router = Router();

  router.post('/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false }), asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid request' });

    const session = await AuthService.login(parsed.data);
    if (!session) return res.status(401).json({ error: 'Invalid credentials' });

    res.cookie('vms_session', session.token, { ...sessionCookieOptions, maxAge: session.maxAge });
    res.cookie('vms_csrf', session.csrf, { ...sessionCookieOptions, httpOnly: false, maxAge: session.maxAge });
    res.json({ user: session.user });
  }));

  router.get('/me', authenticate, (req, res) => res.json({ user: publicUser(req.user) }));

  router.post('/logout', authenticate, csrf, asyncHandler(async (req, res) => {
    await AuthService.logout(req.db, req.cookies.vms_session);
    res.clearCookie('vms_session', sessionCookieOptions);
    res.clearCookie('vms_csrf', { ...sessionCookieOptions, httpOnly: false });
    res.sendStatus(204);
  }));

  return router;
}
