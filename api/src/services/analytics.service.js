import { AUDIT_EVENTS } from '../models/audit.model.js';
import { TENANTS } from '../models/tenant.model.js';
import { USERS } from '../models/user.model.js';
import { VISITS } from '../models/visit.model.js';
import { collectionScope } from '../utils/scope.js';

export class AnalyticsService {
  constructor(db) {
    this.db = db;
  }

  async getDashboard(user) {
    const scope = collectionScope(user);
    if (user.role === 'HOST') scope.hostId = user._id;

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const [expected, arrived, checkedOut, today, tenants, users, recent] = await Promise.all([
      this.db.collection(VISITS).countDocuments({ ...scope, status: 'EXPECTED' }),
      this.db.collection(VISITS).countDocuments({ ...scope, status: 'ARRIVED' }),
      this.db.collection(VISITS).countDocuments({ ...scope, status: 'CHECKED_OUT' }),
      this.db.collection(VISITS).countDocuments({ ...scope, expectedAt: { $gte: start, $lt: end } }),
      user.role === 'GLOBAL_ADMIN' ? this.db.collection(TENANTS).countDocuments({ active: { $ne: false } }) : Promise.resolve(1),
      this.db.collection(USERS).countDocuments({ ...collectionScope(user), active: true }),
      this.db.collection(AUDIT_EVENTS).find(collectionScope(user)).sort({ createdAt: -1 }).limit(8).toArray()
    ]);

    return {
      summary: { expected, arrived, checkedOut, today, tenants, activeUsers: users },
      recentAudit: recent.map(e => ({
        id: e._id.toString(),
        action: e.action,
        createdAt: e.createdAt,
        tenantId: e.tenantId?.toString() || null
      }))
    };
  }
}
