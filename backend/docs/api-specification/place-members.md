# Place Membership API Specification

These authenticated endpoints use the SRS v1.3 `PlaceMember` model. A membership role is `OWNER` or `CASHIER`; neither value is a platform role.

## Endpoints

- `GET /api/v1/places/:placeId/members` lists current members when the actor has `place_member.read` in that place or an explicitly global platform scope.
- `PUT /api/v1/places/:placeId/members/:userId` accepts `{ "role": "OWNER" | "CASHIER" }` and idempotently assigns, reactivates, or changes the membership.
- `DELETE /api/v1/places/:placeId/members/:userId` revokes a current membership.

OWNER may assign or revoke CASHIER only in owned places. ADMIN may manage CASHIER globally. Only SUPER_ADMIN may assign, change, or revoke OWNER. An active place must retain at least one active OWNER. A missing, revoked, wrong-role, or foreign-place membership is returned as `404 Not Found`. A capability that cannot be obtained from the actor's platform role or any applicable membership role is returned as `403 Forbidden`; for example, ADMIN cannot assign OWNER. Invariant failures return `409 Conflict`.

Membership mutations and their audit records are committed in one serializable transaction. Reactivation reuses the existing `(placeId, userId)` row because the Prisma schema permits only one row for that pair.

Only active users may receive or retain effective membership authority. Users with `deletedAt`, `deletionRequestedAt`, or `anonymizedAt` set are excluded from member lists and OWNER counts. Historical membership rows remain stored.

Same-role assignment is a no-op. New assignment, revoked-row restoration, role changes, and revocation respectively emit `PLACE_MEMBER_ASSIGNED`, `PLACE_MEMBER_REACTIVATED`, `PLACE_MEMBER_ROLE_UPDATED`, and `PLACE_MEMBER_REVOKED`. Platform-global mutations additionally emit `ADMIN_CROSS_PLACE_MUTATION` with safe identifiers and changed-field names.
