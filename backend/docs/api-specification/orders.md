# Orders API Specification

## Checkout

`POST /api/v1/me/orders` requires an active bearer-token principal with `order.checkout` and a required `Idempotency-Key` header. The header is 1–255 characters and contains only ASCII letters, digits, `.`, `_`, `:`, or `-`.

The strict body is one of:

```json
{ "placeId": "<uuid>", "fulfillmentType": "TAKEAWAY", "customerName": "Ayu", "customerNote": null }
```

```json
{ "placeId": "<uuid>", "fulfillmentType": "DINE_IN", "tableId": "<uuid>", "customerName": "Ayu" }
```

`customerName` is NFC-normalized, trimmed, whitespace-collapsed, and 1–100 Unicode code points. `customerNote` follows the cart-note rules and is limited to 500 code points. `tableId` is required only for `DINE_IN`.

Checkout uses current database state and time. It requires a non-empty owned cart, a published and ordering-enabled place that is currently open in `Place.timezone`, eligible current menu/category records, and an active table for dine-in. Prices, item names/types, table name, totals, and customer data are snapshotted. Order creation, item snapshots, the 24-hour idempotency record, and cart clearing commit in one serializable transaction.

Success is `201 Created` with `{ data: { order } }`. The order contains `orderId`, `orderCode`, `placeId`, status, fulfillment/customer/table snapshots, item snapshots, subtotal, `createdAt`, `statusUpdatedAt`, and `expiresAt`; it never exposes `verificationToken`.

Idempotency is scoped to the authenticated user and checkout endpoint:

- An unexpired key with the same normalized payload returns the stored body and stored `201` status without another order.
- The same key with a different payload returns `409 IDEMPOTENCY_KEY_REUSED`.
- Equivalent simultaneous requests serialize and create one order.
- Records expire after exactly 24 hours and are replaced lazily or by lifecycle cleanup.
- Exhausted serialization retries return `409 CHECKOUT_CONCURRENT_MODIFICATION`; exhausted order-code allocation returns sanitized `503 ORDER_CODE_ALLOCATION_FAILED`.

Other checkout failures include `404` for an unavailable place/table, and `409` codes including `CART_EMPTY`, `PLACE_UNAVAILABLE`, `ORDERING_DISABLED`, `PLACE_CLOSED`, `CART_ITEM_INVALID`, and `ORDER_TOTAL_OUT_OF_RANGE`. Invalid cart-item details contain only a safe item ID and bounded reason.

## Authenticated queries

| Route                                                   | Scope                                                            |
| ------------------------------------------------------- | ---------------------------------------------------------------- |
| `GET /api/v1/me/orders`                                 | Authenticated user's orders only                                 |
| `GET /api/v1/me/orders/:orderId`                        | Authenticated user's order only                                  |
| `GET /api/v1/places/:placeId/orders`                    | Current CASHIER/OWNER membership or explicit global `order.read` |
| `GET /api/v1/places/:placeId/orders/by-code/:orderCode` | Same place scope; 60 attempts/minute per actor/source            |
| `GET /api/v1/places/:placeId/orders/:orderId`           | Same place scope                                                 |
| `GET /api/v1/orders`                                    | Global `order.read` only                                         |
| `GET /api/v1/orders/:orderId`                           | Global `order.read` only                                         |

List queries use `page=1`, `limit=20` (maximum 100), optional `status` and `fulfillmentType`, and optional `placeId` for own/global lists. Unknown fields are rejected. Results are ordered by `createdAt DESC, orderId DESC` and include standard pagination metadata.

Responses expose safe order/item snapshots but never verification tokens, idempotency rows, internal user IDs, or private lifecycle data. Own routes never broaden beyond ownership. Foreign ownership, revoked membership, and cross-place identifiers return hidden `404`; global collection access without a global grant returns `403`.

## Status transitions

- `PATCH /api/v1/me/orders/:orderId/status` accepts only `{ "status": "CANCELLED", "cancellationReason"?: string | null }` and requires own `order.cancel`.
- `PATCH /api/v1/places/:placeId/orders/:orderId/status` accepts `CONFIRMED`, `PREPARING`, `READY`, `COMPLETED`, or `CANCELLED`. The actor must hold the exact target-place or global transition permission.

Cancellation reasons are NFC/line-ending normalized, trimmed, and limited to 500 Unicode code points. A reason is required when cancelling after `PENDING`. Transitions follow the SRS state graph and use an expected-status conditional update in a serializable transaction. A `PENDING` order at or beyond `expiresAt` cannot be confirmed or cancelled even before the worker updates its stored state.

Success is `200` with the updated safe order. Stable conflicts include `ORDER_PENDING_EXPIRED`, `ORDER_STATUS_CHANGED`, and `ORDER_STATUS_TRANSITION_INVALID`; missing required cancellation reasons return `400 CANCELLATION_REASON_REQUIRED`.

## Public verification

`GET /api/v1/order-verifications/:token` is public, read-only, and limited to 30 attempts/minute per source IP. It is distinct from authenticated place order-code lookup and grants no order authority.

The response contains only `orderCode`, `placeName`, `status`, `fulfillmentType`, `createdAt`, `expiresAt`, and `statusUpdatedAt`. Tokens are exact, case-sensitive opaque values. Malformed, unknown, disabled, and terminal-retention-expired tokens all return the same `404 ORDER_VERIFICATION_NOT_FOUND` body. Verification remains available until 30 days after a terminal transition.

## Automatic expiry

The worker checks every 60 seconds and processes at most ten batches of 100 rows using `FOR UPDATE SKIP LOCKED` and conditional updates. It is idempotent and multi-instance safe. `expiresAt` remains authoritative between cycles.

Traceability: SRS-ORD-001–023, SRS-STS-001–027, SRS-REL-002–004/006, SRS-API-003–010, SRS-SEC-003–008/012, and SRS-PERF-005/006/009.
