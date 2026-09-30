import { timingSafeEqual } from 'node:crypto';
import { database } from '../db.js';
import { SESSIONS } from '../models/session.model.js';
import { TENANTS } from '../models/tenant.model.js';
import { USERS } from '../models/user.model.js';
import { effectivePermissions } from '../constants/permissions.js';
import { allowedTenantModules, PERMISSION_MODULE } from '../constants/modules.js';
import { sha256 } from '../utils/crypto.js';
import { asyncHandler } from '../utils/async.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  const token = req.cookies.vms_session;
  if (typeof token !== 'string' || token.length > 128) return res.sendStatus(401);

  const db = await database();
  const session = await db.collection(SESSIONS).findOne({ _id: sha256(token), expiresAt: { $gt: new Date() } });
  if (!session) return res.sendStatus(401);

  const user = await db.collection(USERS).findOne({ _id: session.userId, active: true });
  if (!user) return res.sendStatus(401);
  if (user.role !== 'GLOBAL_ADMIN') {
    const tenant = await db.collection(TENANTS).findOne({ _id: user.tenantId, active: { $ne: false } });
    if (!tenant) return res.sendStatus(401);
    user.tenantModules = allowedTenantModules(tenant);
  }

  req.db = db;
  req.user = user;
  next();
});

export function csrf(req, res, next) {
  const header = req.get('X-CSRF-Token');
  const cookie = req.cookies.vms_csrf;
  if (
    typeof header !== 'string' ||
    typeof cookie !== 'string' ||
    header.length !== cookie.length ||
    !timingSafeEqual(Buffer.from(header), Buffer.from(cookie))
  ) {
    return res.sendStatus(403);
  }
  next();
}

export const requireRoles = (...allowed) => (req, res, next) => (
  allowed.includes(req.user.role) ? next() : res.sendStatus(403)
);

export const requireAccess = ({ roles = [], permissions = [] }) => (req, res, next) => {
  if (roles.includes(req.user.role)) return next();
  const granted = effectivePermissions(req.user);
  const hasPermission = permissions.some(permission => granted.includes(permission));
  if (!hasPermission) return res.sendStatus(403);
  if (req.user.role === 'GLOBAL_ADMIN') return next();
  const modules = new Set(req.user.tenantModules || []);
  const allowed = permissions.some(permission => {
    const module = PERMISSION_MODULE[permission];
    return !module || modules.has(module);
  });
  return allowed ? next() : res.sendStatus(403);
};

export const requireTenantModule = module => (req, res, next) => {
  if (req.user.role === 'GLOBAL_ADMIN') return next();
  return (req.user.tenantModules || []).includes(module) ? next() : res.sendStatus(403);
};
