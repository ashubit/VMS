import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { ROLES, TENANT_ROLES, VISIT_STATUSES } from './constants/roles.js';
import { database, ensureIndexes } from './db.js';
import { corsMiddleware } from './middleware/cors.js';
import { errorHandler } from './middleware/error.js';
import { analyticsRoutes } from './routes/analytics.routes.js';
import { authRoutes } from './routes/auth.routes.js';
import { kioskRoutes } from './routes/kiosk.routes.js';
import { qrPassRoutes } from './routes/qr-pass.routes.js';
import { settingsRoutes } from './routes/settings.routes.js';
import { tenantRoutes } from './routes/tenant.routes.js';
import { userRoutes } from './routes/user.routes.js';
import { visitRoutes } from './routes/visit.routes.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '500kb' }));
  app.use(cookieParser());
  app.use(corsMiddleware);

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes());
  app.use('/api/analytics', analyticsRoutes());
  app.use('/api/visits', visitRoutes());
  app.use('/api/tenants', tenantRoutes());
  app.use('/api/users', userRoutes());
  app.use('/api/settings', settingsRoutes());
  app.use('/api/kiosks', kioskRoutes());
  app.use('/api/passes', qrPassRoutes());
  app.use(errorHandler);

  return app;
}

const app = createApp();

if (process.env.NODE_ENV !== 'test') {
  database()
    .then(ensureIndexes)
    .then(() => app.listen(env.port, () => console.log(`API listening on ${env.port}`)))
    .catch(e => {
      console.error(e);
      process.exitCode = 1;
    });
}

export { app, ROLES, TENANT_ROLES, VISIT_STATUSES };
