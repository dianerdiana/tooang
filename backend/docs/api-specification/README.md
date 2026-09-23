# API Specification

This directory documents the implemented Tooang REST API under `/api/v1`. SRS v1.3 is authoritative. When implementation and documentation differ, the difference is a defect to resolve; documentation must not redefine the SRS or make an incompatible change silently.

## Common contract

- JSON requests and responses use UTF-8 and `application/json; charset=utf-8`, except the legacy root route noted below and provider-side media upload traffic performed directly against ImageKit.
- Protected routes require `Authorization: Bearer <access-token>`. Access tokens contain identity only; current account state and `User.platformRole` are reloaded for every protected request.
- Successful JSON responses use `{ "error": false, "message": string, "data"?: object, "meta"?: object }`.
- Errors use `{ "error": true, "message": string, "code": string, "details"?: array }`. Validation details identify rejected fields without exposing internals.
- `400` means invalid input, `401` invalid authentication or an inactive principal, `403` capability denial, `404` an absent or deliberately hidden foreign/revoked resource, and `409` a uniqueness, state, idempotency, or concurrency conflict.
- Raw Prisma errors, stack traces, secrets, tokens, internal user IDs, membership existence, and private ImageKit details are never response data.
- Timestamps are UTC ISO 8601 strings. Money values are JSON numbers derived from `Decimal(15,2)` snapshots.
- Paginated endpoints default to `page=1`, `limit=20`, and reject limits above 100. Pagination metadata contains `page`, `limit`, `totalItems`, and `totalPages`.
- `platformRole`, membership roles, and permissions returned by `/me` are rendering metadata. Clients must never submit them as proof of authorization.

## Versioning and compatibility

Existing `/api/v1` request and response contracts are stable. A backward-incompatible route, required-field, response-shape, status-code, or semantic change requires a new API version or an explicitly approved migration and deprecation period. Correcting documentation to match an already implemented compatible contract is not a version change.

`GET /api/v1` is a legacy scaffold that currently returns plain text. It is not promoted as a supported JSON contract because that behavior conflicts with SRS-API-001. Converting or removing it requires a separately approved compatibility change.

## Endpoint ledger

| Area           | Routes                                                                                                                                           | Contract                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| Authentication | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`                                                                            | [auth.md](auth.md)                     |
| Users          | `GET/PATCH /me`, `POST /me/account-deletion-requests`, `GET /users`, `GET/DELETE /users/:userId`, `PUT /users/:userId/platform-role`             | [users.md](users.md)                   |
| Places         | `GET/POST /places`, `GET /places/:slug`, `PATCH/DELETE /places/:placeId`, `PATCH /places/:placeId/publishing`, `PATCH /places/:placeId/ordering` | [places.md](places.md)                 |
| Memberships    | `GET /places/:placeId/members`, `PUT/DELETE /places/:placeId/members/:userId`                                                                    | [place-members.md](place-members.md)   |
| Business hours | `GET /places/:placeId/business-hours`, `PUT /places/:placeId/business-hours/:day`                                                                | [business-hours.md](business-hours.md) |
| Dining tables  | `GET/POST /places/:placeId/dining-tables`, `GET/PATCH/DELETE /places/:placeId/dining-tables/:tableId`                                            | [dining-tables.md](dining-tables.md)   |
| Menus          | Management routes below `/places/:placeId/menu-categories` and `/menu-items`; public `GET /places/:placeId/menu`                                 | [menus.md](menus.md)                   |
| Carts          | `GET /me/carts/:placeId`, `POST /me/carts/:placeId/items`, `PATCH/DELETE /me/carts/:placeId/items/:menuItemId`                                   | [carts.md](carts.md)                   |
| Orders         | Checkout and own orders below `/me/orders`; place queue below `/places/:placeId/orders`; global `/orders`; public `/order-verifications/:token`  | [orders.md](orders.md)                 |
| Reviews        | Public/create reviews, own mutations, and global moderation list/delete routes                                                                   | [reviews.md](reviews.md)               |
| Media          | Upload intents and place/menu-image detach routes                                                                                                | [media.md](media.md)                   |
| Readiness      | `GET /health/ready`                                                                                                                              | [health.md](health.md)                 |

## Known contract gaps

- Place-member and dining-table collection routes are currently unpaginated. This does not satisfy the general pagination rule in SRS-API-004 and requires an implementation decision before production. Business hours are a fixed seven-row collection and are intrinsically bounded.
- The legacy plain-text root response requires the compatibility decision described above.

## Traceability

This index and the feature contracts implement documentation traceability for SRS-API-001–012 and SRS-QLT-007. Feature documents additionally cite their primary SRS families: AUTH, USR, PLC/HRS, RBAC/AUTHZ, TBL, MNU, CART, ORD/STS/REL, REV, MED, SEC, and PERF.
