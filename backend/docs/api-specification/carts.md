# Carts API Specification

All routes require an active bearer-token principal with `cart.manage`. Carts are owned by the authenticated user and keyed by place; client-supplied user identifiers are never accepted.

| Method and route                                     | Request                                                    | Success                         |
| ---------------------------------------------------- | ---------------------------------------------------------- | ------------------------------- |
| `GET /api/v1/me/carts/:placeId`                      | No body                                                    | `200`, `{ data: { cart } }`     |
| `POST /api/v1/me/carts/:placeId/items`               | `{ menuItemId, quantity?, note? }`; quantity defaults to 1 | `200`, complete reconciled cart |
| `PATCH /api/v1/me/carts/:placeId/items/:menuItemId`  | At least one of `quantity` or `note`                       | `200`, complete reconciled cart |
| `DELETE /api/v1/me/carts/:placeId/items/:menuItemId` | No body                                                    | `200`, complete reconciled cart |

IDs are UUIDs. Quantity is an integer from 1 through 99 when adding. An update accepts 0 through 99; zero removes the item. Notes may be strings or null, are NFC-normalized, have CRLF normalized to LF, are trimmed, become null when empty, and are limited to 500 Unicode code points.

The cart response contains its public cart/place identifiers, current eligible items, `distinctItemCount`, `aggregateQuantity`, subtotal, and `removedItems` discovered during reconciliation. Each item includes the current menu item identity, name/type, current price, quantity, normalized note, and line total. Provider media identifiers and internal database user IDs are excluded.

Retrieval removes rows whose item/category is deleted, inactive, unavailable, or cross-place and reports a bounded reason for each removal. A cart may contain at most 50 distinct rows and an aggregate quantity of 200. Prices and totals are recomputed from current database values; client prices are ignored.

Unknown/deleted places and foreign menu items return hidden `404`. Invalid input returns `400`; duplicate/limit or concurrent-state conflicts return sanitized `409`. Cart writes do not create orders. Checkout and cart clearing are specified in [orders.md](orders.md).

Traceability: SRS-CART-001–011, SRS-AUTHZ-004/008, SRS-API-003/006/007/009, SRS-SEC-005–008, and SRS-PERF-005.
