# Visitor Management System

Node.js 24 LTS + Angular LTS + MongoDB. The API owns authentication, role enforcement, tenant scoping, sessions, audit events, and database access. Angular never connects directly to MongoDB.

## Current capabilities

- Cookie-based authentication with hashed opaque sessions and CSRF protection.
- Role-based access for Global Admin, Tenant Admin, Receptionist, and Host.
- Tenant-scoped visitor pre-registration, check-in, check-out, cancellation, and history.
- Global tenant administration and shared lobby kiosk configuration.
- Tenant user administration for tenant admins.
- Master security policy settings for global admins.
- Tenant NDA and check-in instruction settings for tenant admins.
- Dashboard metrics and recent audit events.
- Responsive Angular console for desktop, tablet, and mobile.

## API structure

The Node API is split by responsibility:

- `src/server.js`: Express app factory, global middleware, route mounting, startup.
- `src/config`: environment and cookie configuration.
- `src/constants`: shared enums such as roles and visit statuses.
- `src/middleware`: authentication, authorization, CSRF, CORS, and error handling.
- `src/models`: collection names, default documents, and response serializers.
- `src/schemas`: Zod request validation schemas.
- `src/services`: reusable business logic for auth, visits, tenants, users, kiosks, settings, analytics, and audit events.
- `src/routes`: thin HTTP route modules that validate input and delegate to services.
- `src/utils`: generic helpers for async route handling, hashing, ObjectId parsing, and tenant scoping.

## Setup

1. Install Node.js 24 LTS and provision MongoDB locally or in Atlas.
2. Copy `api/.env.example` to `api/.env` and set `MONGODB_URI`. Use a database user with read/write access only to the VMS database.
3. Run `npm install` from the project root.
4. Create the first global administrator:

```powershell
$env:ADMIN_EMAIL="admin@example.com"
$env:ADMIN_NAME="Global Administrator"
$env:ADMIN_PASSWORD="use-a-unique-16-character-secret"
npm run seed:admin -w api
```

For local demos, seed a complete set of tenants, users, kiosks, visits, and settings:

```powershell
npm run seed:demo
```

The demo seed is idempotent and can be rerun. It creates these accounts with password `DemoPassword123!` unless you override it with `DEMO_PASSWORD`:

| Role | Email |
| --- | --- |
| Global Admin | `global.admin@vms.local` |
| Tenant Admin | `tenant.admin@acme.local` |
| Receptionist | `reception@acme.local` |
| Host | `host@acme.local` |
| Tenant Admin | `tenant.admin@nova.local` |
| Host | `host@nova.local` |

5. Run the API and web app in separate terminals:

```powershell
npm run dev:api
npm run dev:web
```

6. Open `http://localhost:4200`.

## Access model

| Role | Scope | Main permissions |
| --- | --- | --- |
| Global Admin | Whole building/platform | Dashboard analytics, tenant companies, global users, shared kiosks, master security policy |
| Tenant Admin | Own tenant | Tenant users, tenant NDA/settings, tenant kiosks, visitor pre-registration, check-in/out |
| Receptionist | Own tenant | Daily arrivals, visitor check-in/out |
| Host | Own tenant and own visits | Pre-register guests and view own visitor history |

Requests never accept tenant scope from normal users. The API derives tenant access from the authenticated session and applies it in every query.

## QR pass and delegated permissions

Hosts and tenant administrators can issue a secure QR pass from the Visits screen for an expected visitor. Each QR pass is stored in the `qrPasses` collection with tenant ID, visit ID, visitor snapshot, visit purpose, issuer details, issue time, expiry time, verification time, and disabled state. The QR contains a one-time opaque token, not visitor personal data.

Reception or any user with `PASS_VERIFY` can open the Scanner screen, scan or paste the token, verify that the visit belongs to their tenant, and approve check-in. Users with `PASS_DISABLE` can open QR Passes, review issued codes, and disable a pass with a reason when a visitor is cancelled, the QR is shared incorrectly, or security needs to revoke entry.

Admins can grant or block individual capabilities on the Users screen without changing a user's base role. This supports real-world exceptions such as a receptionist who can manage kiosks, or a host who can help verify passes during events. The API enforces these capability checks server-side for visits, passes, users, kiosks, settings, and tenants.

## Security notes

- Passwords are hashed with Argon2id.
- Session tokens are random, stored only as SHA-256 hashes, and expire through MongoDB TTL indexes.
- Mutating requests require the `X-CSRF-Token` header from the non-HTTP-only CSRF cookie.
- `helmet` disables common unsafe browser defaults and `x-powered-by` is disabled.
- Login is rate-limited. For multi-instance production deployments, replace the in-memory limiter with Redis or another shared store.
- Set `COOKIE_SECURE=true` and serve API/web over HTTPS in production.
- Keep MongoDB private to the API network, require TLS, and rotate credentials through a secret manager.

## SDLC checklist

- Run `npm test` and `npm run build` before merging.
- Add CI stages for unit tests, Angular build, `npm audit`, dependency review, and container/image scanning if containerized.
- Add integration tests for cross-tenant denial, role denial, duplicate user email, and concurrent visitor status transitions.
- Review audit retention, visitor data retention, consent wording, and emergency export requirements with security/legal stakeholders.
- Add MFA/SSO, invitation flow, password reset, email/SMS/Slack/Teams notifications, badge printing, QR kiosk mode, and backups before production rollout.
