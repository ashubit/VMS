import 'dotenv/config';
import argon2 from 'argon2';
import { ObjectId } from 'mongodb';
import { database, ensureIndexes } from './db.js';
import { AUDIT_EVENTS } from './models/audit.model.js';
import { KIOSKS } from './models/kiosk.model.js';
import { SETTINGS, TENANT_SETTINGS } from './models/settings.model.js';
import { TENANTS } from './models/tenant.model.js';
import { USERS } from './models/user.model.js';
import { VISITS } from './models/visit.model.js';

const password = process.env.DEMO_PASSWORD || 'DemoPassword123!';
if (password.length < 12) {
  console.error('DEMO_PASSWORD must be at least 12 characters.');
  process.exit(1);
}

const ids = {
  tenants: {
    acme: new ObjectId('650000000000000000000001'),
    nova: new ObjectId('650000000000000000000002'),
  },
  users: {
    globalAdmin: new ObjectId('650000000000000000000101'),
    acmeAdmin: new ObjectId('650000000000000000000102'),
    acmeReception: new ObjectId('650000000000000000000103'),
    acmeHost: new ObjectId('650000000000000000000104'),
    novaAdmin: new ObjectId('650000000000000000000105'),
    novaHost: new ObjectId('650000000000000000000106'),
  },
  kiosks: {
    lobby: new ObjectId('650000000000000000000201'),
    acmeSuite: new ObjectId('650000000000000000000202'),
    novaSuite: new ObjectId('650000000000000000000203'),
  },
  visits: {
    expected: new ObjectId('650000000000000000000301'),
    arrived: new ObjectId('650000000000000000000302'),
    checkedOut: new ObjectId('650000000000000000000303'),
    cancelled: new ObjectId('650000000000000000000304'),
  },
};

const now = new Date();
const hoursFromNow = hours => new Date(now.getTime() + hours * 3600000);
const hoursAgo = hours => new Date(now.getTime() - hours * 3600000);
const passwordHash = await argon2.hash(password);
const db = await database();
await ensureIndexes(db);

const tenants = [
  { _id: ids.tenants.acme, name: 'Acme Facilities', suite: 'Suite 401', floor: '4', contactEmail: 'ops@acme.local', active: true, allowedModules: ['DASHBOARD', 'VISITS', 'QR_PASSES', 'SCANNER', 'USERS', 'KIOSKS', 'SETTINGS'] },
  { _id: ids.tenants.nova, name: 'Nova Labs', suite: 'Suite 1202', floor: '12', contactEmail: 'admin@nova.local', active: true, allowedModules: ['DASHBOARD', 'VISITS', 'SCANNER', 'USERS', 'SETTINGS'] },
];

const users = [
  { _id: ids.users.globalAdmin, tenantId: null, name: 'Global Administrator', email: 'global.admin@vms.local', role: 'GLOBAL_ADMIN', permissionOverrides: { grant: [], revoke: [] } },
  { _id: ids.users.acmeAdmin, tenantId: ids.tenants.acme, name: 'Asha Tenant Admin', email: 'tenant.admin@acme.local', role: 'TENANT_ADMIN', permissionOverrides: { grant: [], revoke: [] } },
  { _id: ids.users.acmeReception, tenantId: ids.tenants.acme, name: 'Ravi Reception', email: 'reception@acme.local', role: 'RECEPTIONIST', permissionOverrides: { grant: ['KIOSK_MANAGE'], revoke: [] } },
  { _id: ids.users.acmeHost, tenantId: ids.tenants.acme, name: 'Neha Host', email: 'host@acme.local', role: 'HOST', permissionOverrides: { grant: [], revoke: [] } },
  { _id: ids.users.novaAdmin, tenantId: ids.tenants.nova, name: 'Nova Tenant Admin', email: 'tenant.admin@nova.local', role: 'TENANT_ADMIN', permissionOverrides: { grant: [], revoke: [] } },
  { _id: ids.users.novaHost, tenantId: ids.tenants.nova, name: 'Nova Host', email: 'host@nova.local', role: 'HOST', permissionOverrides: { grant: ['PASS_VERIFY'], revoke: [] } },
];

const kiosks = [
  { _id: ids.kiosks.lobby, tenantId: null, name: 'Main Lobby Kiosk', location: 'Ground floor lobby', mode: 'SHARED_LOBBY', active: true },
  { _id: ids.kiosks.acmeSuite, tenantId: ids.tenants.acme, name: 'Acme Suite Kiosk', location: 'Acme reception desk', mode: 'TENANT_SUITE', active: true },
  { _id: ids.kiosks.novaSuite, tenantId: ids.tenants.nova, name: 'Nova Suite Kiosk', location: 'Nova entry lounge', mode: 'TENANT_SUITE', active: true },
];

const visits = [
  {
    _id: ids.visits.expected,
    tenantId: ids.tenants.acme,
    hostId: ids.users.acmeHost,
    visitorName: 'Priya Shah',
    visitorEmail: 'priya.shah@example.com',
    purpose: 'Facility walkthrough',
    expectedAt: hoursFromNow(2),
    status: 'EXPECTED',
    ndaAccepted: true,
    checkedInAt: null,
    checkedOutAt: null,
  },
  {
    _id: ids.visits.arrived,
    tenantId: ids.tenants.acme,
    hostId: ids.users.acmeHost,
    visitorName: 'Manish Gupta',
    visitorEmail: 'manish.gupta@example.com',
    purpose: 'Vendor maintenance',
    expectedAt: hoursAgo(1),
    status: 'ARRIVED',
    ndaAccepted: true,
    checkedInAt: hoursAgo(1),
    checkedOutAt: null,
  },
  {
    _id: ids.visits.checkedOut,
    tenantId: ids.tenants.acme,
    hostId: ids.users.acmeAdmin,
    visitorName: 'Sarah Khan',
    visitorEmail: 'sarah.khan@example.com',
    purpose: 'Quarterly business review',
    expectedAt: hoursAgo(5),
    status: 'CHECKED_OUT',
    ndaAccepted: true,
    checkedInAt: hoursAgo(5),
    checkedOutAt: hoursAgo(3),
  },
  {
    _id: ids.visits.cancelled,
    tenantId: ids.tenants.nova,
    hostId: ids.users.novaHost,
    visitorName: 'Anil Verma',
    visitorEmail: 'anil.verma@example.com',
    purpose: 'Interview',
    expectedAt: hoursFromNow(24),
    status: 'CANCELLED',
    ndaAccepted: false,
    checkedInAt: null,
    checkedOutAt: null,
    cancelledAt: hoursAgo(2),
  },
];

await Promise.all(tenants.map(({ _id, ...tenant }) => db.collection(TENANTS).updateOne(
  { _id },
  { $set: { ...tenant, updatedAt: now }, $setOnInsert: { createdAt: now } },
  { upsert: true }
)));

await Promise.all(users.map(({ _id, ...user }) => db.collection(USERS).updateOne(
  { email: user.email },
  {
    $set: { ...user, email: user.email.toLowerCase(), passwordHash, active: true, updatedAt: now },
    $setOnInsert: { _id, createdAt: now },
  },
  { upsert: true }
)));

await Promise.all(kiosks.map(({ _id, ...kiosk }) => db.collection(KIOSKS).updateOne(
  { _id },
  { $set: { ...kiosk, updatedAt: now }, $setOnInsert: { createdAt: now } },
  { upsert: true }
)));

await Promise.all(visits.map(({ _id, ...visit }) => db.collection(VISITS).updateOne(
  { _id },
  { $set: { ...visit, updatedAt: now }, $setOnInsert: { createdAt: now } },
  { upsert: true }
)));

await db.collection(SETTINGS).updateOne(
  { _id: 'securityPolicy' },
  {
    $set: {
      value: {
        badgeRequired: true,
        photoRequired: true,
        escortRequired: true,
        maxSessionHours: 8,
        retentionDays: 365,
        emergencyContact: '+91 99999 00000',
      },
      updatedAt: now,
    },
  },
  { upsert: true }
);

await Promise.all([
  db.collection(TENANT_SETTINGS).updateOne(
    { tenantId: ids.tenants.acme },
    {
      $set: {
        config: {
          ndaTitle: 'Acme visitor confidentiality agreement',
          ndaText: 'Visitors agree not to disclose customer, building, security, or operational information observed during their visit.',
          checkInInstructions: 'Please present a government ID at reception and wait for your host escort.',
          notifyHosts: true,
        },
        updatedAt: now,
      },
    },
    { upsert: true }
  ),
  db.collection(TENANT_SETTINGS).updateOne(
    { tenantId: ids.tenants.nova },
    {
      $set: {
        config: {
          ndaTitle: 'Nova Labs visitor agreement',
          ndaText: 'Visitors must protect confidential product, lab, and personnel information and follow host instructions while on site.',
          checkInInstructions: 'Check in at the suite kiosk and keep your visitor badge visible.',
          notifyHosts: true,
        },
        updatedAt: now,
      },
    },
    { upsert: true }
  ),
]);

await Promise.all([
  ['650000000000000000000401', ids.users.globalAdmin, null, 'DEMO_DATA_SEEDED'],
  ['650000000000000000000402', ids.users.acmeAdmin, ids.tenants.acme, 'TENANT_CREATED'],
  ['650000000000000000000403', ids.users.acmeReception, ids.tenants.acme, 'VISIT_ARRIVED'],
  ['650000000000000000000404', ids.users.novaAdmin, ids.tenants.nova, 'KIOSK_CREATED'],
].map(([id, actorId, tenantId, action], index) => db.collection(AUDIT_EVENTS).updateOne(
  { _id: new ObjectId(id) },
  {
    $set: {
      actorId,
      tenantId,
      action,
      subjectId: tenantId || 'demo',
      details: { seeded: true },
      createdAt: new Date(now.getTime() - index * 1800000),
    },
  },
  { upsert: true }
)));

console.log('Demo data seeded.');
console.log('');
console.log('Credentials:');
console.table(users.map(user => ({ role: user.role, email: user.email, password })));
process.exit(0);
