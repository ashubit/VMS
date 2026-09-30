export const PERMISSIONS = [
  'VISIT_CREATE',
  'VISIT_RECEIVE',
  'VISIT_CANCEL',
  'PASS_ISSUE',
  'PASS_VERIFY',
  'PASS_DISABLE',
  'USER_MANAGE',
  'KIOSK_MANAGE',
  'SETTINGS_MANAGE',
  'TENANT_MANAGE'
];

export const ROLE_PERMISSIONS = {
  GLOBAL_ADMIN: PERMISSIONS,
  TENANT_ADMIN: ['VISIT_CREATE', 'VISIT_RECEIVE', 'VISIT_CANCEL', 'PASS_ISSUE', 'PASS_VERIFY', 'PASS_DISABLE', 'USER_MANAGE', 'KIOSK_MANAGE', 'SETTINGS_MANAGE'],
  RECEPTIONIST: ['VISIT_RECEIVE', 'VISIT_CANCEL', 'PASS_VERIFY', 'PASS_DISABLE'],
  HOST: ['VISIT_CREATE', 'PASS_ISSUE']
};

export function effectivePermissions(user) {
  const base = ROLE_PERMISSIONS[user.role] || [];
  const grants = user.permissionOverrides?.grant || [];
  const revokes = new Set(user.permissionOverrides?.revoke || []);
  return [...new Set([...base, ...grants])].filter(permission => !revokes.has(permission)).sort();
}
