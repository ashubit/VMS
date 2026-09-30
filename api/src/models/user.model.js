import { effectivePermissions } from '../constants/permissions.js';

export const USERS = 'users';

export function publicUser(user) {
  return {
    id: user._id.toString(),
    tenantId: user.tenantId?.toString() || null,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active !== false,
    permissions: effectivePermissions(user),
    tenantModules: user.role === 'GLOBAL_ADMIN' ? [] : (user.tenantModules || []),
    permissionOverrides: {
      grant: user.permissionOverrides?.grant || [],
      revoke: user.permissionOverrides?.revoke || []
    }
  };
}
