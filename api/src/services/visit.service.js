import { USERS } from '../models/user.model.js';
import { VISITS, visitOut } from '../models/visit.model.js';
import { env } from '../config/env.js';
import { createSessionToken, sha256 } from '../utils/crypto.js';
import { collectionScope } from '../utils/scope.js';
import { toObjectId } from '../utils/object-id.js';
import { AuditService } from './audit.service.js';

export class VisitService {
  constructor(db) {
    this.db = db;
    this.audit = new AuditService(db);
  }

  async list(user) {
    const query = collectionScope(user);
    if (user.role === 'HOST') query.hostId = user._id;
    const rows = await this.db.collection(VISITS).find(query).sort({ expectedAt: -1 }).limit(200).toArray();
    return rows.map(visitOut);
  }

  async create(user, visit) {
    const hostId = user.role === 'TENANT_ADMIN' && visit.hostId ? toObjectId(visit.hostId) : user._id;
    if (!hostId) return { status: 400, body: { error: 'Invalid host' } };

    const host = await this.db.collection(USERS).findOne({
      _id: hostId,
      tenantId: user.tenantId,
      role: { $in: ['HOST', 'TENANT_ADMIN'] },
      active: true
    });
    if (!host) return { status: 400, body: { error: 'Host is not available for this tenant' } };

    const result = await this.db.collection(VISITS).insertOne({
      tenantId: user.tenantId,
      hostId,
      visitorName: visit.visitorName,
      visitorEmail: visit.visitorEmail || null,
      purpose: visit.purpose,
      expectedAt: new Date(visit.expectedAt),
      status: 'EXPECTED',
      ndaAccepted: visit.ndaAccepted,
      createdById: user._id,
      createdAt: new Date()
    });
    await this.audit.record(user, 'VISIT_CREATED', result.insertedId);
    return { status: 201, body: { id: result.insertedId.toString() } };
  }

  async transition(user, visitId, nextStatus) {
    const id = toObjectId(visitId);
    if (!id) return { status: 400, body: { error: 'Invalid request' } };

    const previous = nextStatus === 'ARRIVED' ? 'EXPECTED' : nextStatus === 'CHECKED_OUT' ? 'ARRIVED' : 'EXPECTED';
    const field = nextStatus === 'ARRIVED' ? 'checkedInAt' : nextStatus === 'CHECKED_OUT' ? 'checkedOutAt' : 'cancelledAt';
    const result = await this.db.collection(VISITS).updateOne(
      { _id: id, ...collectionScope(user), status: previous },
      { $set: { status: nextStatus, [field]: new Date() } }
    );
    if (!result.modifiedCount) return { status: 404, body: { error: 'Visit not found or transition unavailable' } };

    await this.audit.record(user, `VISIT_${nextStatus}`, id);
    return { status: 200, body: { ok: true } };
  }

  async issuePass(user, visitId) {
    const id = toObjectId(visitId);
    if (!id) return { status: 400, body: { error: 'Invalid request' } };

    const query = { _id: id, ...collectionScope(user) };
    if (user.role === 'HOST') query.hostId = user._id;

    const visit = await this.db.collection(VISITS).findOne(query);
    if (!visit) return { status: 404, body: { error: 'Visit not found' } };
    if (visit.status !== 'EXPECTED') return { status: 409, body: { error: 'Pass can only be issued for expected visits' } };

    const token = createSessionToken();
    const passExpiresAt = new Date(new Date(visit.expectedAt).getTime() + 12 * 3600000);
    await this.db.collection(VISITS).updateOne(
      { _id: id },
      {
        $set: {
          passTokenHash: sha256(token),
          passIssuedById: user._id,
          passIssuedAt: new Date(),
          passExpiresAt,
          passRevoked: false,
          updatedAt: new Date()
        }
      }
    );

    const issuer = await this.db.collection(USERS).findOne({ _id: user._id }, { projection: { name: 1, email: 1, role: 1 } });
    await this.audit.record(user, 'PASS_ISSUED', id);
    return {
      status: 200,
      body: {
        token,
        passUrl: `${env.webOrigin}/scan?token=${encodeURIComponent(token)}`,
        expiresAt: passExpiresAt.toISOString(),
        tenantId: visit.tenantId.toString(),
        visitorName: visit.visitorName,
        visitorEmail: visit.visitorEmail || null,
        purpose: visit.purpose,
        visitId: visit._id.toString(),
        issuedBy: issuer ? { name: issuer.name, email: issuer.email, role: issuer.role } : { name: user.name, email: user.email, role: user.role }
      }
    };
  }

  async verifyPass(user, token) {
    const visit = await this.db.collection(VISITS).findOne({ passTokenHash: sha256(token) });
    if (!visit) return { status: 404, body: { decision: 'DENY', reason: 'Pass was not found' } };
    if (user.role !== 'GLOBAL_ADMIN' && visit.tenantId?.toString() !== user.tenantId?.toString()) {
      return { status: 403, body: { decision: 'DENY', reason: 'Pass belongs to another tenant' } };
    }
    if (visit.passRevoked) return { status: 409, body: { decision: 'DENY', reason: 'Pass is revoked', visit: visitOut(visit) } };
    if (!visit.passExpiresAt || new Date(visit.passExpiresAt) < new Date()) {
      return { status: 409, body: { decision: 'DENY', reason: 'Pass is expired', visit: visitOut(visit) } };
    }
    if (visit.status !== 'EXPECTED') {
      return { status: 409, body: { decision: 'DENY', reason: `Visit is already ${visit.status}`, visit: visitOut(visit) } };
    }

    await this.audit.record(user, 'PASS_VERIFIED', visit._id, { tenantId: visit.tenantId });
    return {
      status: 200,
      body: {
        decision: 'ALLOW',
        reason: 'Expected visitor verified',
        visit: visitOut(visit)
      }
    };
  }
}
