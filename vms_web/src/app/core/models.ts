export type Role = 'GLOBAL_ADMIN' | 'TENANT_ADMIN' | 'RECEPTIONIST' | 'HOST';
export type VisitStatus = 'EXPECTED' | 'ARRIVED' | 'CHECKED_OUT' | 'CANCELLED';
export type KioskMode = 'SHARED_LOBBY' | 'TENANT_SUITE';
export type TenantModule = 'DASHBOARD' | 'VISITS' | 'QR_PASSES' | 'SCANNER' | 'USERS' | 'KIOSKS' | 'SETTINGS';
export type Permission =
  | 'VISIT_CREATE'
  | 'VISIT_RECEIVE'
  | 'VISIT_CANCEL'
  | 'PASS_ISSUE'
  | 'PASS_VERIFY'
  | 'PASS_DISABLE'
  | 'USER_MANAGE'
  | 'KIOSK_MANAGE'
  | 'SETTINGS_MANAGE'
  | 'TENANT_MANAGE';

export interface User {
  id: string;
  tenantId: string | null;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  permissions: Permission[];
  tenantModules: TenantModule[];
  permissionOverrides: {
    grant: Permission[];
    revoke: Permission[];
  };
}

export interface Tenant {
  id: string;
  name: string;
  suite: string;
  floor: string;
  contactEmail: string;
  active: boolean;
  allowedModules: TenantModule[];
}

export interface Visit {
  id: string;
  tenantId: string;
  hostId: string;
  visitorName: string;
  visitorEmail: string | null;
  purpose: string;
  expectedAt: string;
  status: VisitStatus;
  ndaAccepted: boolean;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  passIssuedAt: string | null;
  passExpiresAt: string | null;
  passRevoked: boolean;
  passIssuedById: string | null;
  createdById: string | null;
}

export interface Kiosk {
  id: string;
  tenantId: string | null;
  name: string;
  location: string;
  mode: KioskMode;
  active: boolean;
}

export interface SecurityPolicy {
  badgeRequired: boolean;
  photoRequired: boolean;
  escortRequired: boolean;
  maxSessionHours: number;
  retentionDays: number;
  emergencyContact: string;
}

export interface TenantConfig {
  ndaTitle: string;
  ndaText: string;
  checkInInstructions: string;
  notifyHosts: boolean;
}

export interface Dashboard {
  summary: {
    expected: number;
    arrived: number;
    checkedOut: number;
    today: number;
    tenants: number;
    activeUsers: number;
  };
  recentAudit: Array<{
    id: string;
    action: string;
    createdAt: string;
    tenantId: string | null;
  }>;
}

export interface ApiError {
  error?: string;
  details?: Record<string, string[]>;
}

export interface VisitPass {
  id: string;
  token: string;
  passUrl: string;
  tenantId: string;
  visitId: string;
  visitorName: string;
  visitorEmail: string | null;
  purpose: string;
  expectedAt: string;
  issuedAt: string;
  expiresAt: string;
  issuedBy: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
  disabled: boolean;
}

export interface PassVerification {
  decision: 'ALLOW' | 'DENY';
  reason: string;
  pass?: QrPass;
  visit?: Visit;
}

export interface QrPass extends Omit<VisitPass, 'token' | 'passUrl'> {
  disabledAt: string | null;
  disabledReason: string;
  verifiedAt: string | null;
}
