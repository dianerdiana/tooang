# Orders API Specification

## Authenticated queries

- `GET /api/v1/me/orders` lists only the authenticated user's orders.
- `GET /api/v1/me/orders/:orderId` retrieves only an order owned by that user.
- `GET /api/v1/places/:placeId/orders` lists orders for a currently authorized CASHIER or OWNER membership, or for a platform actor with global `order.read`.
- `GET /api/v1/places/:placeId/orders/by-code/:orderCode` performs the same scoped read by human-readable code and is rate-limited to 60 attempts per minute per actor/IP source.
- `GET /api/v1/places/:placeId/orders/:orderId` retrieves the scoped operational detail.
- `GET /api/v1/orders` and `GET /api/v1/orders/:orderId` require global `order.read`.

List queries accept `page` (default 1), `limit` (default 20, maximum 100), `status`, `fulfillmentType`, and, for `/me` and global queries, `placeId`. Unknown fields are rejected. Results are ordered by creation time and order ID descending.

Authenticated responses expose safe order and item snapshots but never expose a verification token, idempotency record, or internal user database ID. `/me` never broadens beyond ownership. Foreign ownership, revoked membership, and cross-place IDs return `404`; attempting the global collection without a global grant returns `403`.

## Status transitions

- `PATCH /api/v1/me/orders/:orderId/status` accepts only `{ "status": "CANCELLED", "cancellationReason"?: string | null }`.
- `PATCH /api/v1/places/:placeId/orders/:orderId/status` accepts `CONFIRMED`, `PREPARING`, `READY`, `COMPLETED`, or `CANCELLED`. Only cancellation accepts `cancellationReason`.

Cancellation reasons are NFC-normalized, line endings are normalized, surrounding whitespace is trimmed, and the maximum is 500 Unicode code points. A reason is required when cancelling after `PENDING` and optional for a valid `PENDING` order.

Transitions follow the SRS state graph and use an expected-status conditional database update. `PENDING` orders at or beyond `expiresAt` cannot be confirmed or cancelled even before the expiry worker updates their stored status. Transition conflicts return stable `409` codes: `ORDER_PENDING_EXPIRED`, `ORDER_STATUS_CHANGED`, or `ORDER_STATUS_TRANSITION_INVALID`.

## Public verification

`GET /api/v1/order-verifications/:token` is public, read-only, and limited to 30 attempts per minute per IP source. Its resource contains only `orderCode`, `placeName`, `status`, `fulfillmentType`, `createdAt`, `expiresAt`, and `statusUpdatedAt`.

Tokens are exact, case-sensitive, opaque values. Malformed, unknown, disabled, and terminal-retention-expired tokens all return the same `404 ORDER_VERIFICATION_NOT_FOUND` response. Verification remains available until 30 days after a terminal transition and never grants order mutation authority.

## Automatic expiry

The application checks for expired `PENDING` orders every 60 seconds. Each cycle processes at most ten batches of 100 rows using `FOR UPDATE SKIP LOCKED` and conditional updates. The job is idempotent and safe across multiple application instances; `expiresAt` remains the source of truth between worker cycles.
