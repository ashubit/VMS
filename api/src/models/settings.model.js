export const SETTINGS = 'settings';
export const TENANT_SETTINGS = 'tenantSettings';

export const defaultSecurityPolicy = {
  badgeRequired: true,
  photoRequired: false,
  escortRequired: true,
  maxSessionHours: 8,
  retentionDays: 365,
  emergencyContact: ''
};

export const defaultTenantConfig = {
  ndaTitle: 'Visitor confidentiality agreement',
  ndaText: 'Visitors agree to protect confidential information they may see or hear while on site.',
  checkInInstructions: 'Please carry a government ID and wait for your host.',
  notifyHosts: true
};
