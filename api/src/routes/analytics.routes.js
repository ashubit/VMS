import { Router } from 'express';
import { authenticate, requireTenantModule } from '../middleware/auth.js';
import { AnalyticsService } from '../services/analytics.service.js';
import { asyncHandler } from '../utils/async.js';

export function analyticsRoutes() {
  const router = Router();

  router.get('/', authenticate, requireTenantModule('DASHBOARD'), asyncHandler(async (req, res) => {
    res.json(await new AnalyticsService(req.db).getDashboard(req.user));
  }));

  return router;
}
