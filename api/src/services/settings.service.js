import { SETTINGS, TENANT_SETTINGS, defaultSecurityPolicy, defaultTenantConfig } from '../models/settings.model.js';
import { AuditService } from './audit.service.js';

export class SettingsService {
  constructor(db) {
    this.db = db;
    this.audit = new AuditService(db);
  }

  async getSecurityPolicy() {
    const doc = await this.db.collection(SETTINGS).findOne({ _id: 'securityPolicy' });
    return { ...defaultSecurityPolicy, ...(doc?.value || {}) };
  }

  async saveSecurityPolicy(user, policy) {
    await this.db.collection(SETTINGS).updateOne(
      { _id: 'securityPolicy' },
      { $set: { value: policy, updatedAt: new Date() } },
      { upsert: true }
    );
    await this.audit.record(user, 'SECURITY_POLICY_UPDATED', 'securityPolicy');
  }

  async getTenantConfig(user) {
    const doc = await this.db.collection(TENANT_SETTINGS).findOne({ tenantId: user.tenantId });
    return { ...defaultTenantConfig, ...(doc?.config || {}) };
  }

  async saveTenantConfig(user, config) {
    await this.db.collection(TENANT_SETTINGS).updateOne(
      { tenantId: user.tenantId },
      { $set: { config, updatedAt: new Date() } },
      { upsert: true }
    );
    await this.audit.record(user, 'TENANT_SETTINGS_UPDATED', user.tenantId);
  }
}
