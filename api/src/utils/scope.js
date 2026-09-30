export function collectionScope(user) {
  return user.role === 'GLOBAL_ADMIN' ? {} : { tenantId: user.tenantId };
}
