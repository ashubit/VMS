export const VISITS = 'visits';

const asDate = value => (value instanceof Date ? value.toISOString() : value);

export function visitOut(visit) {
  return {
    id: visit._id.toString(),
    tenantId: visit.tenantId.toString(),
    hostId: visit.hostId.toString(),
    visitorName: visit.visitorName,
    visitorEmail: visit.visitorEmail,
    purpose: visit.purpose,
    expectedAt: asDate(visit.expectedAt),
    status: visit.status,
    ndaAccepted: Boolean(visit.ndaAccepted),
    checkedInAt: asDate(visit.checkedInAt) || null,
    checkedOutAt: asDate(visit.checkedOutAt) || null,
    passIssuedAt: asDate(visit.passIssuedAt) || null,
    passExpiresAt: asDate(visit.passExpiresAt) || null,
    passRevoked: Boolean(visit.passRevoked),
    passIssuedById: visit.passIssuedById?.toString() || null,
    createdById: visit.createdById?.toString() || null
  };
}
