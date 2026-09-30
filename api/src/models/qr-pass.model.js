export const QR_PASSES = 'qrPasses';

const asDate = value => (value instanceof Date ? value.toISOString() : value);

export function qrPassOut(pass) {
  return {
    id: pass._id.toString(),
    tenantId: pass.tenantId.toString(),
    visitId: pass.visitId.toString(),
    visitorName: pass.visitorName,
    visitorEmail: pass.visitorEmail || null,
    purpose: pass.purpose,
    expectedAt: asDate(pass.expectedAt),
    issuedAt: asDate(pass.issuedAt),
    expiresAt: asDate(pass.expiresAt),
    issuedBy: {
      id: pass.issuedBy.id.toString(),
      name: pass.issuedBy.name,
      email: pass.issuedBy.email,
      role: pass.issuedBy.role
    },
    disabled: Boolean(pass.disabled),
    disabledAt: asDate(pass.disabledAt) || null,
    disabledReason: pass.disabledReason || '',
    verifiedAt: asDate(pass.verifiedAt) || null
  };
}
