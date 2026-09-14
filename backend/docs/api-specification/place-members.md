# Place Membership API Specification

These authenticated endpoints use the SRS v1.3 `PlaceMember` model. A membership role is `OWNER` or `CASHIER`; neither value is a platform role.

## Endpoints

- `GET /api/v1/places/:placeId/members` lists current members when the actor has `place_member.read` in that place or an explicitly global platform scope.
- `PUT /api/v1/places/:placeId/members/:userId` accepts `{ "role": "OWNER" | "CASHIER" }` and idempotently assigns, reactivates, or changes the membership.
- `DELETE /api/v1/places/:placeId/members/:userId` revokes a current membership.

OWNER may assign or revoke CASHIER only in owned places. ADMIN may manage CASHIER globally. Only SUPER_ADMIN may assign, change, or revoke OWNER. An active place must retain at least one active OWNER. Foreign-place scope failures are returned as `404 Not Found`; invariant failures return `409 Conflict`.

Membership mutations and their audit records are committed in one serializable transaction. Reactivation reuses the existing `(placeId, userId)` row because the Prisma schema permits only one row for that pair.
