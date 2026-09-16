# SRS v1.3 Authorization and Data-Model Reconciliation

This document records the implementation baseline for the authorization and data-model requirements in
[`software-requirement-specification/v1.3.md`](software-requirement-specification/v1.3.md). The SRS is authoritative;
this matrix is evidence and must not be used to redefine it.

Status meanings:

- **Implemented**: code and proportional automated verification are present.
- **Partial**: the application behavior exists, but a production/operational or concurrency release-gate check remains.
- **Missing**: no conforming implementation or verification exists.

## Authorization architecture

| Requirement   | Status      | Implementation and verification evidence                                                          |
| ------------- | ----------- | ------------------------------------------------------------------------------------------------- |
| SRS-RBAC-001  | Implemented | Required `User.platformRole`; Prisma default and registration transaction; auth/user tests.       |
| SRS-RBAC-002  | Implemented | `PlatformRole` Prisma enum and exhaustive permission-map test.                                    |
| SRS-RBAC-003  | Implemented | Platform enum excludes place roles; schema tests reject `OWNER` as a platform role.               |
| SRS-RBAC-004  | Implemented | `PlaceMember` relation is the only persisted place-authority model.                               |
| SRS-RBAC-005  | Implemented | `PlaceMemberRole` contains only `OWNER` and `CASHIER`.                                            |
| SRS-RBAC-006  | Implemented | Unique membership is scoped by `(placeId,userId)`, allowing memberships across places.            |
| SRS-RBAC-007  | Implemented | Unique `(placeId,userId)` preserves at most one active or historical row.                         |
| SRS-RBAC-008  | Implemented | `PermissionsGuard` is coarse admission; services and repositories enforce resource scope.         |
| SRS-RBAC-009  | Implemented | `PlaceAccessService.assertPermission` and membership-constrained repository predicates.           |
| SRS-RBAC-010  | Implemented | Membership predicates are applied by Prisma queries, not in-memory filtering.                     |
| SRS-RBAC-011  | Implemented | CASHIER capabilities resolve through current target-place membership.                             |
| SRS-RBAC-012  | Implemented | Missing, revoked, wrong-role, and foreign-place membership paths produce hidden `404`.            |
| SRS-RBAC-013  | Implemented | Global bypass requires an explicit global permission and still enters domain services.            |
| SRS-RBAC-014  | Implemented | Platform-role mutation requires the mapped global `platform_role.update` grant.                   |
| SRS-RBAC-015  | Implemented | Serializable checks plus PostgreSQL concurrent-demotion coverage preserve one active SUPER_ADMIN. |
| SRS-RBAC-016  | Implemented | Serializable checks plus PostgreSQL concurrent-revocation coverage preserve one active OWNER.     |
| SRS-RBAC-017  | Implemented | OWNER receives only CASHIER assignment/revocation permissions for owned places.                   |
| SRS-RBAC-018  | Implemented | OWNER has no OWNER administration grants.                                                         |
| SRS-RBAC-019  | Implemented | ADMIN has global CASHIER assignment/revocation grants.                                            |
| SRS-RBAC-020  | Implemented | ADMIN has no OWNER administration grants.                                                         |
| SRS-RBAC-021  | Implemented | SUPER_ADMIN has global OWNER/CASHIER administration, subject to last-OWNER checks.                |
| SRS-RBAC-022  | Implemented | Membership writes and audit records use the same transaction client.                              |
| SRS-RBAC-023  | Implemented | Principal and membership queries reject deleted, deletion-pending, and anonymized users.          |
| SRS-RBAC-024  | Implemented | Platform and membership grants are resolved independently and combined additively.                |
| SRS-AUTHZ-001 | Implemented | Typed finite `PERMISSION`/`PERMISSIONS` contract in source control.                               |
| SRS-AUTHZ-002 | Implemented | No permission-management database model or production endpoint exists.                            |
| SRS-AUTHZ-003 | Implemented | Exhaustive platform and membership role grant maps.                                               |
| SRS-AUTHZ-004 | Implemented | Current principal plus target membership are resolved server-side.                                |
| SRS-AUTHZ-005 | Implemented | Access JWT contains identity only; spoofed headers are ignored in E2E coverage.                   |
| SRS-AUTHZ-006 | Implemented | `AuthPrincipalService` and membership repositories load current database state.                   |
| SRS-AUTHZ-007 | Implemented | Role changes, revocation, and deactivation affect the next request using an existing token.       |
| SRS-AUTHZ-008 | Implemented | Domain services retain ownership, state-transition, and target restrictions.                      |
| SRS-AUTHZ-009 | Implemented | OWNER operations require an active OWNER membership unless a global grant applies.                |
| SRS-AUTHZ-010 | Implemented | CASHIER operations require an active CASHIER membership.                                          |
| SRS-AUTHZ-011 | Implemented | Only explicitly global grants bypass membership.                                                  |
| SRS-AUTHZ-012 | Implemented | Global Nest guards and service/repository authorization form the backend boundary.                |
| SRS-AUTHZ-013 | Implemented | No backend authorization consumes frontend permission metadata.                                   |
| SRS-AUTHZ-014 | Implemented | `/me` exposes current platform role and platform permission identifiers.                          |
| SRS-AUTHZ-015 | Implemented | `/me` exposes active memberships and membership/effective permissions.                            |
| SRS-AUTHZ-016 | Implemented | Unknown roles, permissions, and scopes default to denial in permission tests.                     |
| SRS-AUTHZ-017 | Implemented | Exact role matrices, additive resolution, guard behavior, and representative scopes are tested.   |
| SRS-AUTHZ-018 | Implemented | Capability identifiers are stable and contain no resource identifiers.                            |
| SRS-AUTHZ-019 | Implemented | Permission identity and resource scope are distinct typed contracts.                              |
| SRS-AUTHZ-020 | Implemented | Effective place permissions combine platform-global and membership grants additively.             |
| SRS-AUTHZ-021 | Implemented | User/membership services retain target and last-member invariants after global admission.         |
| SRS-AUTHZ-022 | Implemented | No code infers platform role from membership or membership from platform role.                    |

## User, audit, and persistence requirements

| Requirement  | Status      | Implementation and verification evidence                                                          |
| ------------ | ----------- | ------------------------------------------------------------------------------------------------- |
| SRS-USR-001  | Implemented | Protected `GET /me` reads only the active authenticated user.                                     |
| SRS-USR-002  | Implemented | `/me` returns current role, active memberships, and effective permissions.                        |
| SRS-USR-003  | Implemented | Strict update schema permits only supported self-profile fields.                                  |
| SRS-USR-004  | Implemented | ADMIN/SUPER_ADMIN user list/detail with bounded pagination and active filters.                    |
| SRS-USR-005  | Implemented | Role input is the Prisma platform enum and mutation requires global permission.                   |
| SRS-USR-006  | Implemented | Same-role assignment is an idempotent read without an audit write.                                |
| SRS-USR-007  | Implemented | Serializable last-SUPER_ADMIN check precedes demotion.                                            |
| SRS-USR-008  | Implemented | Restricted ADMIN deactivation scope permits only target role `USER`.                              |
| SRS-USR-009  | Implemented | SUPER_ADMIN global scope retains the last-SUPER_ADMIN invariant.                                  |
| SRS-USR-010  | Implemented | Deactivation and refresh-session revocation are atomic and audited.                               |
| SRS-USR-011  | Implemented | Roles are enum values with no dynamic role endpoints.                                             |
| SRS-USR-012  | Implemented | Idempotent account-deletion-request endpoint and service workflow.                                |
| SRS-USR-013  | Implemented | Active sole-owner lookup blocks account deletion.                                                 |
| SRS-USR-014  | Implemented | Accepted deletion blocks principal resolution and revokes sessions immediately.                   |
| SRS-USR-015  | Implemented | Request records deletion-pending state without hard deletion.                                     |
| SRS-USR-016  | Implemented | Idempotent data-lifecycle worker anonymizes eligible requests after 30 days.                      |
| SRS-AUD-001  | Implemented | Required security/domain mutations append typed action records.                                   |
| SRS-AUD-002  | Implemented | `AuditLog` stores actor, action, target, timestamp, and safe JSON before/after data.              |
| SRS-AUD-003  | Implemented | Audit services/tests reject or omit sensitive credential/token data.                              |
| SRS-AUD-004  | Implemented | Auditable mutations pass their transaction client to `AuditService.append`.                       |
| SRS-AUD-005  | Implemented | No ordinary application endpoint updates or deletes audit records.                                |
| SRS-AUD-006  | Implemented | Permission-protected actions record current actor identity without authorization tokens.          |
| SRS-DATA-001 | Implemented | Relations use internal `User.id`; responses use public `User.userId`.                             |
| SRS-DATA-002 | Implemented | Internal entities use UUID defaults except explicitly modeled identifiers.                        |
| SRS-DATA-003 | Implemented | Active repository queries exclude soft-deleted records.                                           |
| SRS-DATA-004 | Implemented | Soft-delete and restoration conflicts are enforced by services and constraints.                   |
| SRS-DATA-005 | Implemented | Restrictive/retained relations protect order and audit history.                                   |
| SRS-DATA-006 | Implemented | Order-item and dining-table snapshot fields remain independent of source rows.                    |
| SRS-DATA-007 | Implemented | Forward migration installs rating, money, quantity, sort, hours, and snapshot checks.             |
| SRS-DATA-008 | Implemented | Zod/service validation remains present alongside database checks.                                 |
| SRS-DATA-009 | Implemented | The checked-in forward migration chain deploys successfully through the UTC-instant migration.    |
| SRS-DATA-010 | Missing     | Backup/restore and retention verification is TASK-046 and remains a production release gate.      |
| SRS-DATA-011 | Implemented | All enumerated role, place, table, review, order, lifecycle, media, and idempotency fields exist. |
| SRS-DATA-012 | Implemented | Lifecycle queries calculate retention from the defined creation/event timestamps.                 |
| SRS-DATA-013 | Implemented | Session revocation and 30-day anonymization workflow are implemented.                             |
| SRS-DATA-014 | Implemented | Retained orders are anonymized while preserving non-personal transaction snapshots.               |
| SRS-DATA-015 | Implemented | Lifecycle jobs are idempotent and use SYSTEM audit actors; backup aging remains part of DATA-010. |
| SRS-DATA-016 | Implemented | No `Role`, `UserRole`, `Permission`, or `RolePermission` models exist.                            |
| SRS-DATA-017 | Implemented | Persisted enums are imported by the single code-defined authorization map.                        |

## Release gate

Before this baseline is accepted for release:

1. Apply all checked-in migrations to an empty PostgreSQL database with `prisma migrate deploy`.
2. Run Prisma validation/generation, build, lint, formatting check, unit tests, and all PostgreSQL E2E suites.
3. Exercise simultaneous last-OWNER revocation/role changes and last-SUPER_ADMIN demotion/deactivation against PostgreSQL; exactly one invariant-preserving outcome may commit.
4. Confirm authorization failures disclose neither internal IDs, foreign membership existence, Prisma details, tokens, nor secrets.
5. Complete the backup/restore work tracked by TASK-046 before production launch.

The reconciliation exposed timestamp drift against SRS-HRS-006: PostgreSQL `TIMESTAMP` values and database-generated
defaults depended on the session timezone, which could make new orders appear expired. The forward-only
`20260916160000_store_timestamps_as_utc_instants` migration changes all instant-bearing fields to `TIMESTAMPTZ(3)`, and
`20260916163000_align_exact_expiry_defaults` keeps creation/expiry pairs database-generated from one transaction
timestamp. `BusinessHour.opensAt` and `closesAt` remain timezone-independent wall-clock `TIME(0)` values. No
authorization tables or persisted permission mappings were added. Future drift must likewise be corrected forward-only;
deployed migrations must not be rewritten.
