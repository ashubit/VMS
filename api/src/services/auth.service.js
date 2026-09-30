import argon2 from 'argon2';
import { database } from '../db.js';
import { env } from '../config/env.js';
import { SESSIONS } from '../models/session.model.js';
import { TENANTS } from '../models/tenant.model.js';
import { USERS, publicUser } from '../models/user.model.js';
import { allowedTenantModules } from '../constants/modules.js';
import { createCsrfToken, createSessionToken, sha256 } from '../utils/crypto.js';
import { AuditService } from './audit.service.js';

export class AuthService {
  static async login({ email, password }) {
    const db = await database();
    const user = await db.collection(USERS).findOne({ email: email.toLowerCase(), active: true });
    if (!user || !(await argon2.verify(user.passwordHash, password))) return null;
    if (user.role !== 'GLOBAL_ADMIN') {
      const tenant = await db.collection(TENANTS).findOne({ _id: user.tenantId, active: { $ne: false } });
      if (!tenant) return null;
      user.tenantModules = allowedTenantModules(tenant);
    }

    const token = createSessionToken();
    const csrf = createCsrfToken();
    await db.collection(SESSIONS).insertOne({
      _id: sha256(token),
      userId: user._id,
      expiresAt: new Date(Date.now() + env.sessionHours * 3600000),
      createdAt: new Date()
    });
    await new AuditService(db).record(user, 'LOGIN', user._id);
    return { token, csrf, maxAge: env.sessionHours * 3600000, user: publicUser(user) };
  }

  static async logout(db, token) {
    await db.collection(SESSIONS).deleteOne({ _id: sha256(token) });
  }
}
