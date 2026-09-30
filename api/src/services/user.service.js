import argon2 from 'argon2';
import { TENANT_ROLES } from '../constants/roles.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { USERS, publicUser } from '../models/user.model.js';
import { collectionScope } from '../utils/scope.js';
import { toObjectId } from '../utils/object-id.js';
import { AuditService } from './audit.service.js';

export class UserService {
  constructor(db) {
    this.db = db;
    this.audit = new AuditService(db);
  }

  async list(actor) {
    const docs = await this.db.collection(USERS)
      .find(collectionScope(actor), { projection: { passwordHash: 0 } })
      .sort({ name: 1 })
      .limit(300)
      .toArray();
    return docs.map(publicUser);
  }

  async create(actor, data) {
    const tenantId = actor.role === 'GLOBAL_ADMIN'
      ? (data.role === 'GLOBAL_ADMIN' ? null : toObjectId(data.tenantId))
      : actor.tenantId;

    if (actor.role === 'TENANT_ADMIN' && !TENANT_ROLES.includes(data.role)) {
      return { status: 403, body: { error: 'Role is outside tenant scope' } };
    }
    if (data.role !== 'GLOBAL_ADMIN' && !tenantId) {
      return { status: 400, body: { error: 'Tenant is required' } };
    }

    try {
      const result = await this.db.collection(USERS).insertOne({
        tenantId,
        email: data.email.toLowerCase(),
        name: data.name,
        passwordHash: await argon2.hash(data.password),
        role: data.role,
        permissionOverrides: this.normalizePermissionOverrides(actor, data.permissionOverrides),
        active: true,
        createdAt: new Date()
      });
      await this.audit.record(actor, 'USER_CREATED', result.insertedId, { tenantId });
      return { status: 201, body: { id: result.insertedId.toString() } };
    } catch (e) {
      if (e.code === 11000) return { status: 409, body: { error: 'Email already exists' } };
      throw e;
    }
  }

  async update(actor, userId, changes) {
    const id = toObjectId(userId);
    if (!id || !Object.keys(changes).length) return { status: 400, body: { error: 'Invalid request' } };
    if (actor.role === 'TENANT_ADMIN' && changes.role && !TENANT_ROLES.includes(changes.role)) {
      return { status: 403, body: { error: 'Role is outside tenant scope' } };
    }

    const query = { _id: id, ...collectionScope(actor) };
    const target = await this.db.collection(USERS).findOne(query);
    if (!target) return { status: 404, body: { error: 'User not found' } };
    if (actor.role === 'TENANT_ADMIN' && target.role === 'TENANT_ADMIN' && target._id.toString() === actor._id.toString() && changes.active === false) {
      return { status: 400, body: { error: 'You cannot deactivate your own admin account' } };
    }

    const next = { ...changes, updatedAt: new Date() };
    if (actor.role === 'GLOBAL_ADMIN') {
      const nextRole = changes.role || target.role;
      next.tenantId = nextRole === 'GLOBAL_ADMIN' ? null : toObjectId(Object.hasOwn(changes, 'tenantId') ? changes.tenantId : target.tenantId);
      if (nextRole !== 'GLOBAL_ADMIN' && !next.tenantId) {
        return { status: 400, body: { error: 'Tenant is required for tenant-scoped roles' } };
      }
    } else {
      delete next.tenantId;
    }
    if (changes.permissionOverrides) {
      next.permissionOverrides = this.normalizePermissionOverrides(actor, changes.permissionOverrides);
    }

    const result = await this.db.collection(USERS).updateOne(query, { $set: next });
    if (!result.matchedCount) return { status: 404, body: { error: 'User not found' } };

    await this.audit.record(actor, 'USER_UPDATED', id);
    return { status: 200, body: { ok: true } };
  }

  normalizePermissionOverrides(actor, overrides = {}) {
    const allowed = actor.role === 'GLOBAL_ADMIN'
      ? PERMISSIONS
      : PERMISSIONS.filter(permission => permission !== 'TENANT_MANAGE');
    const allowedSet = new Set(allowed);
    return {
      grant: [...new Set(overrides.grant || [])].filter(permission => allowedSet.has(permission)).sort(),
      revoke: [...new Set(overrides.revoke || [])].filter(permission => allowedSet.has(permission)).sort()
    };
  }
}
