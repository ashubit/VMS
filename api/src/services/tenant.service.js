import { TENANTS, tenantOut } from '../models/tenant.model.js';
import { toObjectId } from '../utils/object-id.js';
import { AuditService } from './audit.service.js';

export class TenantService {
  constructor(db) {
    this.db = db;
    this.audit = new AuditService(db);
  }

  async list() {
    const docs = await this.db.collection(TENANTS).find({}).sort({ name: 1 }).limit(200).toArray();
    return docs.map(tenantOut);
  }

  async create(user, tenant) {
    const result = await this.db.collection(TENANTS).insertOne({ ...tenant, createdAt: new Date() });
    await this.audit.record(user, 'TENANT_CREATED', result.insertedId, { tenantId: result.insertedId });
    return result.insertedId.toString();
  }

  async update(user, tenantId, changes) {
    const id = toObjectId(tenantId);
    if (!id || !Object.keys(changes).length) return { status: 400, body: { error: 'Invalid request' } };

    const result = await this.db.collection(TENANTS).updateOne({ _id: id }, { $set: { ...changes, updatedAt: new Date() } });
    if (!result.matchedCount) return { status: 404, body: { error: 'Tenant not found' } };

    await this.audit.record(user, 'TENANT_UPDATED', id, { tenantId: id });
    return { status: 200, body: { ok: true } };
  }
}
