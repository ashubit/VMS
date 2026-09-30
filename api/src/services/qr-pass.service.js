import { env } from '../config/env.js';
import { QR_PASSES, qrPassOut } from '../models/qr-pass.model.js';
import { USERS } from '../models/user.model.js';
import { VISITS, visitOut } from '../models/visit.model.js';
import { createSessionToken, sha256 } from '../utils/crypto.js';
import { toObjectId } from '../utils/object-id.js';
import { collectionScope } from '../utils/scope.js';
import { AuditService } from './audit.service.js';

export class QrPassService {
  constructor(db) {
    this.db = db;
    this.audit = new AuditService(db);
  }

  async list(user) {
    const passes = await this.db.collection(QR_PASSES)
      .find(collectionScope(user))
      .sort({ issuedAt: -1 })
      .limit(200)
      .toArray();
    return passes.map(qrPassOut);
  }

  async issue(user, visitId) {
    const id = toObjectId(visitId);
    if (!id) return { status: 400, body: { error: 'Invalid request' } };

    const query = { _id: id, ...collectionScope(user) };
    if (user.role === 'HOST') query.hostId = user._id;

    const visit = await this.db.collection(VISITS).findOne(query);
    if (!visit) return { status: 404, body: { error: 'Visit not found' } };
    if (visit.status !== 'EXPECTED') return { status: 409, body: { error: 'Pass can only be issued for expected visits' } };

    const token = createSessionToken();
    const now = new Date();
    const expiresAt = new Date(new Date(visit.expectedAt).getTime() + 12 * 3600000);
    const issuer = await this.db.collection(USERS).findOne({ _id: user._id }, { projection: { name: 1, email: 1, role: 1 } });
    const issuedBy = {
      id: user._id,
      name: issuer?.name || user.name,
      email: issuer?.email || user.email,
      role: issuer?.role || user.role
    };

    const result = await this.db.collection(QR_PASSES).insertOne({
      tenantId: visit.tenantId,
      visitId: visit._id,
      tokenHash: sha256(token),
      visitorName: visit.visitorName,
      visitorEmail: visit.visitorEmail || null,
      purpose: visit.purpose,
      expectedAt: visit.expectedAt,
      hostId: visit.hostId,
      issuedBy,
      issuedAt: now,
      expiresAt,
      disabled: false,
      createdAt: now
    });

    await this.db.collection(VISITS).updateOne(
      { _id: visit._id },
      {
        $set: {
          currentQrPassId: result.insertedId,
          passTokenHash: sha256(token),
          passIssuedById: user._id,
          passIssuedAt: now,
          passExpiresAt: expiresAt,
          passRevoked: false,
          updatedAt: now
        }
      }
    );

    await this.audit.record(user, 'QR_PASS_ISSUED', result.insertedId, { tenantId: visit.tenantId, visitId: visit._id });
    return {
      status: 200,
      body: {
        id: result.insertedId.toString(),
        token,
        passUrl: `${env.webOrigin}/scan?token=${encodeURIComponent(token)}`,
        tenantId: visit.tenantId.toString(),
        visitId: visit._id.toString(),
        visitorName: visit.visitorName,
        visitorEmail: visit.visitorEmail || null,
        purpose: visit.purpose,
        expectedAt: visit.expectedAt instanceof Date ? visit.expectedAt.toISOString() : visit.expectedAt,
        issuedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        issuedBy: { ...issuedBy, id: issuedBy.id.toString() },
        disabled: false
      }
    };
  }

  async verify(user, token) {
    const pass = await this.db.collection(QR_PASSES).findOne({ tokenHash: sha256(token) });
    if (!pass) return { status: 404, body: { decision: 'DENY', reason: 'QR pass was not found' } };
    if (user.role !== 'GLOBAL_ADMIN' && pass.tenantId?.toString() !== user.tenantId?.toString()) {
      return { status: 403, body: { decision: 'DENY', reason: 'QR pass belongs to another tenant', pass: qrPassOut(pass) } };
    }
    if (pass.disabled) return { status: 409, body: { decision: 'DENY', reason: pass.disabledReason || 'QR pass is disabled', pass: qrPassOut(pass) } };
    if (!pass.expiresAt || new Date(pass.expiresAt) < new Date()) {
      return { status: 409, body: { decision: 'DENY', reason: 'QR pass is expired', pass: qrPassOut(pass) } };
    }

    const visit = await this.db.collection(VISITS).findOne({ _id: pass.visitId });
    if (!visit) return { status: 404, body: { decision: 'DENY', reason: 'Linked visit was not found', pass: qrPassOut(pass) } };
    if (visit.status !== 'EXPECTED') {
      return { status: 409, body: { decision: 'DENY', reason: `Visit is already ${visit.status}`, pass: qrPassOut(pass), visit: visitOut(visit) } };
    }

    await this.db.collection(QR_PASSES).updateOne({ _id: pass._id }, { $set: { verifiedAt: new Date(), verifiedById: user._id } });
    await this.audit.record(user, 'QR_PASS_VERIFIED', pass._id, { tenantId: pass.tenantId, visitId: pass.visitId });
    return {
      status: 200,
      body: {
        decision: 'ALLOW',
        reason: 'QR pass verified for expected visitor',
        pass: qrPassOut(pass),
        visit: visitOut(visit)
      }
    };
  }

  async disable(user, passId, reason = '') {
    const id = toObjectId(passId);
    if (!id) return { status: 400, body: { error: 'Invalid request' } };

    const pass = await this.db.collection(QR_PASSES).findOne({ _id: id, ...collectionScope(user) });
    if (!pass) return { status: 404, body: { error: 'QR pass not found' } };
    if (pass.disabled) return { status: 200, body: { ok: true } };

    const now = new Date();
    await this.db.collection(QR_PASSES).updateOne(
      { _id: id },
      { $set: { disabled: true, disabledAt: now, disabledById: user._id, disabledReason: reason, updatedAt: now } }
    );
    await this.db.collection(VISITS).updateOne(
      { _id: pass.visitId, currentQrPassId: id },
      { $set: { passRevoked: true, updatedAt: now } }
    );
    await this.audit.record(user, 'QR_PASS_DISABLED', id, { tenantId: pass.tenantId, visitId: pass.visitId });
    return { status: 200, body: { ok: true } };
  }
}
