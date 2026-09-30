import { AUDIT_EVENTS } from '../models/audit.model.js';

export class AuditService {
  constructor(db) {
    this.db = db;
  }

  record(user, action, subjectId, details = {}) {
    return this.db.collection(AUDIT_EVENTS).insertOne({
      tenantId: user.tenantId || details.tenantId || null,
      actorId: user._id,
      action,
      subjectId,
      details,
      createdAt: new Date()
    });
  }
}
