export const TENANT_MODULES = [
  'DASHBOARD',
  'VISITS',
  'QR_PASSES',
  'SCANNER',
  'USERS',
  'KIOSKS',
  'SETTINGS'
];

export const DEFAULT_TENANT_MODULES = TENANT_MODULES;

export const PERMISSION_MODULE = {
  VISIT_CREATE: 'VISITS',
  VISIT_RECEIVE: 'VISITS',
  VISIT_CANCEL: 'VISITS',
  PASS_ISSUE: 'VISITS',
  PASS_DISABLE: 'QR_PASSES',
  USER_MANAGE: 'USERS',
  KIOSK_MANAGE: 'KIOSKS',
  SETTINGS_MANAGE: 'SETTINGS'
};

export function allowedTenantModules(tenant) {
  const modules = Array.isArray(tenant?.allowedModules) ? tenant.allowedModules : DEFAULT_TENANT_MODULES;
  return modules.filter(module => TENANT_MODULES.includes(module));
}
