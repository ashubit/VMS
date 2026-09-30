import { allowedTenantModules } from '../constants/modules.js';

export const TENANTS = 'tenants';

export function tenantOut(tenant) {
  return {
    id: tenant._id.toString(),
    name: tenant.name,
    suite: tenant.suite || '',
    floor: tenant.floor || '',
    contactEmail: tenant.contactEmail || '',
    active: tenant.active !== false,
    allowedModules: allowedTenantModules(tenant)
  };
}
