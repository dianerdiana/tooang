# Place Membership API Specification

These protected routes use `PlaceMember.role = OWNER | CASHIER`; neither is a platform role.

| Route                                            | Contract                                                                                 |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `GET /api/v1/places/:placeId/members`            | Requires target-place or global `place_member.read`; returns `200 { data: { members } }` |
| `PUT /api/v1/places/:placeId/members/:userId`    | Strict body with `role` set to `OWNER` or `CASHIER`; returns `200 { data: { member } }`  |
| `DELETE /api/v1/places/:placeId/members/:userId` | Revokes an active membership; returns `200 { data: { member } }`                         |

`:placeId` is a UUID and `:userId` is the public user identifier. Members expose only safe user/profile, role, and membership timestamp data; internal user IDs and revoked rows are excluded from the active list.

OWNER may assign/revoke CASHIER only in owned places. ADMIN may manage CASHIER globally. Only SUPER_ADMIN may assign, change, or revoke OWNER. An active place must retain one effective active OWNER. Missing/revoked/wrong-role/foreign scope returns hidden `404`; an impossible capability such as ADMIN assigning OWNER returns `403`; last-owner and concurrent invariant failures return `409`.

PUT is idempotent and reuses the unique historical `(placeId,userId)` row for assignment, reactivation, or role change. Mutations and audits share one serializable transaction. The list is currently unpaginated and therefore remains an SRS-API-004 implementation gap.

Traceability: SRS-RBAC-004–024, SRS-AUTHZ-004–022, SRS-API-003/004/006/007/009, and SRS-AUD-001–006.
