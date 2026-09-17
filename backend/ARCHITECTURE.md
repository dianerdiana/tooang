# Tooang Backend Architecture

## Purpose and authority

Tooang is a NestJS modular monolith backed by PostgreSQL and Prisma. This document describes the implemented SRS v1.3 baseline. If this document conflicts with the [SRS v1.3](docs/software-requirement-specification/v1.3.md), the SRS is authoritative.

The externally supported API is rooted at `/api/v1`. The application is deployed as one process, while feature modules retain explicit ownership and dependency boundaries.

## Architectural principles

- Organize behavior by feature module rather than technical layer across the whole application.
- Keep HTTP concerns in controllers, business policy and transaction ownership in services, and database access in repositories.
- Access PostgreSQL through Prisma repositories; do not put Prisma queries in controllers.
- Keep feature dependencies unidirectional and explicit.
- Do not export feature repositories to other modules by default.
- Keep `common` and `lib` independent of feature modules.
- Treat permission mappings as version-controlled application policy, not database records.
- Treat client-provided roles, permissions, and resource scope as untrusted input.

## Runtime layers

```text
HTTP request
  -> global middleware, guards, pipes, and interceptors
  -> feature controller
  -> feature service
  -> feature repository
  -> Prisma Client
  -> PostgreSQL
```

Controllers translate HTTP inputs and outputs. Services enforce business rules, authorize resource scope, and own transactions. Repositories encapsulate Prisma selection, mutation, active-state predicates, and tenant predicates.

Cross-cutting components include authentication, authorization, exception normalization, request correlation, structured logging, rate limiting, audit recording, configuration validation, scheduled lifecycle work, and provider integration.

## Module responsibilities

| Module                | Responsibility                                                                                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AuthModule`          | Registration, login, identity-only access tokens, refresh rotation/reuse handling, logout, and session revocation                                                               |
| `UsersModule`         | Current profile, platform user administration, account-deletion requests, and last-SUPER_ADMIN enforcement                                                                      |
| `PlacesModule`        | Place lifecycle, discovery, publication, place updates, and active-place selection                                                                                              |
| `PlaceMembersModule`  | OWNER/CASHIER membership assignment, revocation, reactivation, and last-OWNER enforcement                                                                                       |
| `BusinessHoursModule` | Seven-day place schedule and timezone-aware availability rules                                                                                                                  |
| `DiningTablesModule`  | Place-scoped dining-table masters and QR regeneration inputs                                                                                                                    |
| `MenusModule`         | Place-scoped menu categories, items, publication, and public menu reads                                                                                                         |
| `CartsModule`         | User-owned, place-specific carts, item reconciliation, quantities, notes, and totals                                                                                            |
| `OrdersModule`        | Atomic checkout, idempotency, customer order reads/cancellation, place queues, state transitions, expiry, authenticated order-code lookup, and public opaque-token verification |
| `ReviewsModule`       | Customer reviews and global moderation through `review.moderate`, available to ADMIN and SUPER_ADMIN                                                                            |
| `MediaModule`         | ImageKit upload authorization, completion, deletion state, provider recovery, and compensating cleanup                                                                          |
| `AuditModule`         | Immutable security and business audit events written with authorization-critical mutations                                                                                      |
| `ObservabilityModule` | Request IDs, structured logs, metrics, sanitization, and readiness support                                                                                                      |
| `DataLifecycleModule` | Retention, account anonymization, expiry, and scheduled idempotent cleanup                                                                                                      |
| `HealthModule`        | Public readiness response based on safe configuration and database checks                                                                                                       |

Public order verification is distinct from operational order-code lookup. The opaque verification-token route is public and rate-limited; place staff order-code routes are authenticated and place-scoped.

## Dependency rules

Feature modules may depend on shared infrastructure and narrowly exposed feature services. They must not reach into another feature's repository or form circular dependencies.

```text
Feature controller -> same-feature service -> same-feature repository -> Prisma
Feature service    -> explicitly exported service or shared cross-cutting service
common / lib       -> no feature-module imports
```

Audit, observability, authorization, and provider abstractions are cross-cutting services. Their interfaces must not expose Prisma internals to callers.

## Authorization model

### Persisted authority

Authorization has two independent persisted dimensions:

```text
User.platformRole:  USER | ADMIN | SUPER_ADMIN
PlaceMember.role:   OWNER | CASHIER
```

Each user has exactly one platform role. A user may have zero or more active place memberships. OWNER and CASHIER are not platform roles. An active membership is a `PlaceMember` row whose `revokedAt` is null and whose user and place are active.

Version 1 does not persist generic role, permission, or role-assignment join tables. Permission identifiers and role-to-permission mappings live in the shared typed authorization contract.

### Authentication and current state

Access tokens contain identity only. They do not carry authoritative roles, memberships, or permissions. On every protected request the backend resolves the user again and rejects deleted, deletion-pending, anonymized, or otherwise inactive accounts. This also makes a stale token observe a role change or membership revocation without waiting for token expiry.

`GET /api/v1/me` exposes the current platform role, platform permissions, active memberships, membership permissions, and effective permissions for each place context. Those values support frontend rendering only; they are never accepted back as proof of authority.

### Permission and scope flow

```text
Identity-only bearer token
  -> JwtAuthGuard resolves the current active user
  -> PermissionsGuard checks whether the current platform role may attempt the capability
  -> feature service loads the target and applies account/domain policy
  -> PlaceAccessService resolves active membership or an explicit global scope
  -> repository applies place and active-state predicates
  -> service performs mutation and audit in one transaction when required
```

`PermissionsGuard` is a coarse capability gate. It does not prove ownership, place membership, target-account eligibility, or a valid domain transition. Those decisions belong to services, `PlaceAccessService`, and repository predicates.

`PlaceAccessService` supports OWNER, CASHIER, and explicitly authorized global scopes. Global ADMIN or SUPER_ADMIN permissions are additive; they do not bypass last-SUPER_ADMIN, last-OWNER, target-account, audit, order-transition, retention, or other domain rules.

Place-scoped reads and mutations use repository predicates containing the target `placeId` and applicable active-state filters. A foreign, revoked, or undisclosable membership/resource is returned as `404 Not Found`; an authenticated actor who can see the capability boundary but lacks the capability receives `403 Forbidden`.

## Data access and lifecycle

Prisma schema and forward-only migrations define the data model. Repositories select only fields required by their callers and exclude inapplicable deleted, deletion-pending, anonymized, revoked, or expired state.

Historical memberships are retained by setting `revokedAt`; reactivation reuses the user/place membership row and is audited. Retained orders use customer, item, price, place, and dining-table snapshots so that later source changes or anonymization do not corrupt transaction history.

The seed baseline creates a platform SUPER_ADMIN only. Place authority is always represented by `PlaceMember`.

## Transaction ownership and concurrency

Services own transaction boundaries. Repositories accept a transaction client when participating in a multi-record invariant. Transactions contain database work only; ImageKit calls and QR rendering occur outside PostgreSQL transactions.

Serializable isolation or an equivalent database-protected strategy is required where concurrent requests could violate last-SUPER_ADMIN, last-OWNER, checkout-idempotency, or state-transition invariants. Authorization-critical mutations and their audit records commit or roll back together.

### Checkout flow

The checkout service follows this shape:

```text
validate Idempotency-Key syntax
begin serializable transaction
  use database time as the authoritative current time
  lock or claim the (user, idempotency key) record
  if a completed identical request exists: return its stored 201 response
  if the key exists with another request hash: return 409
  load active user, place, table, cart, items, prices, and limits
  reject invalid or unreconciled cart state
  create order and immutable order/item/table/customer snapshots
  persist the idempotency response
  clear the cart
commit
return 201
```

The order, order items, idempotency result, and cart clearing are atomic. Concurrent status changes use expected-state predicates so at most one transition succeeds. Remote provider work is never performed inside this transaction.

## External media workflow

ImageKit upload authorization is short-lived and never exposes private provider credentials. Database intent is recorded before or after provider calls according to the workflow, and failures remain observable and recoverable through idempotent completion, deletion states, and compensating cleanup.

Provider callbacks or completion requests do not become authorization evidence. The service reloads current actor and target state before accepting the operation.

## API and error boundary

Supported route examples include:

- `GET /api/v1/me`
- `GET /api/v1/me/carts/:placeId`
- `POST /api/v1/me/orders`
- `GET /api/v1/places/:placeId/orders`
- `GET /api/v1/order-verifications/:token`
- `GET /api/v1/health/ready`

Successful feature responses use the documented JSON envelope. The implemented global exception filter normalizes framework, validation, Prisma, domain, and unexpected errors into the public error envelope. It logs diagnostic context through the redaction boundary while withholding internal database IDs, Prisma details, stack traces, tokens, cookies, secrets, and private provider data.

Authentication failures do not disclose account existence. Authorization responses follow the `403` capability versus hidden `404` scope rule described above.

`GET /api/v1` is a legacy plain-text route and is not part of the normalized JSON contract. Removing it or converting it to JSON requires an explicit compatibility decision.

The complete API contract and endpoint ledger are in [`docs/api-specification/README.md`](docs/api-specification/README.md).

## Configuration and operations

Configuration is validated at startup and the process fails fast when required settings are absent. Production deployments provide distinct access/refresh secrets, restrictive CORS, secure refresh cookies, HTTPS at the deployment boundary, PostgreSQL, and ImageKit configuration.

Winston structured logs carry a correlation ID and safe request metadata. Readiness checks expose no secrets. Backup/restore evidence, production SLO approval, and performance/load evidence are operational release gates rather than assumptions embedded in application code.

## Verification baseline

The repository baseline is evaluated with:

- Prisma schema validation/generation and migration deployment to an empty PostgreSQL database;
- TypeScript build, ESLint, and Prettier checks;
- unit, repository/integration, and PostgreSQL E2E tests;
- permission-matrix, negative authorization, tenant-isolation, lifecycle, concurrency, audit-rollback, checkout, and idempotency coverage;
- API route/document ledger comparison; and
- the SRS implementation audit in [`docs/srs-v1.3-implementation-audit.md`](docs/srs-v1.3-implementation-audit.md).

Operational load, backup/restore, production HTTPS/secrets, provider configuration, and SLO verification require evidence from the target environment.

## Requirement traceability

This architecture primarily implements and explains SRS-RBAC-001-024, SRS-AUTHZ-001-022, SRS-API-006-007 and SRS-API-010-012, SRS-DATA-016-017, SRS-QLT-003-005 and SRS-QLT-008-010, plus the transaction and reliability rules referenced by the affected features.
