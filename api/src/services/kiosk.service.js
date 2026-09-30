import { KIOSKS, kioskOut } from '../models/kiosk.model.js';
import { toObjectId } from '../utils/object-id.js';
import { AuditService } from './audit.service.js';

export class KioskService {
  constructor(db) {
    this.db = db;
    this.audit = new AuditService(db);
  }

  async list(user) {
    const query = user.role === 'GLOBAL_ADMIN' ? {} : { tenantId: user.tenantId };
    const docs = await this.db.collection(KIOSKS).find(query).sort({ name: 1 }).limit(100).toArray();
    return docs.map(kioskOut);
  }

  async create(user, kiosk) {
    const tenantId = user.role === 'GLOBAL_ADMIN' ? (kiosk.tenantId ? toObjectId(kiosk.tenantId) : null) : user.tenantId;
    if (kiosk.mode === 'TENANT_SUITE' && !tenantId) return { status: 400, body: { error: 'Tenant kiosk requires a tenant' } };

    const result = await this.db.collection(KIOSKS).insertOne({ ...kiosk, tenantId, createdAt: new Date() });
    await this.audit.record(user, 'KIOSK_CREATED', result.insertedId, { tenantId });
    return { status: 201, body: { id: result.insertedId.toString() } };
  }

  async update(user, kioskId, changes) {
    const id = toObjectId(kioskId);
    if (!id || !Object.keys(changes).length) return { status: 400, body: { error: 'Invalid request' } };

    const query = { _id: id, ...(user.role === 'GLOBAL_ADMIN' ? {} : { tenantId: user.tenantId }) };
    const next = { ...changes, updatedAt: new Date() };
    if (Object.hasOwn(next, 'tenantId')) {
      next.tenantId = user.role === 'GLOBAL_ADMIN' && next.tenantId ? toObjectId(next.tenantId) : user.tenantId;
    }

    const result = await this.db.collection(KIOSKS).updateOne(query, { $set: next });
    if (!result.matchedCount) return { status: 404, body: { error: 'Kiosk not found' } };

    await this.audit.record(user, 'KIOSK_UPDATED', id);
    return { status: 200, body: { ok: true } };
  }
}
