# Reviews API Specification

## Routes

| Route                                                         | Authentication and result                   |
| ------------------------------------------------------------- | ------------------------------------------- |
| `GET /api/v1/places/:placeId/reviews`                         | Public, paginated place reviews and summary |
| `POST /api/v1/places/:placeId/reviews`                        | Active user; new `201`, restored `200`      |
| `GET /api/v1/places/:placeId/menu-items/:menuItemId/reviews`  | Public, paginated item reviews and summary  |
| `POST /api/v1/places/:placeId/menu-items/:menuItemId/reviews` | Active user; new `201`, restored `200`      |
| `PATCH/DELETE /api/v1/me/place-reviews/:reviewId`             | Own active review, `200`                    |
| `PATCH/DELETE /api/v1/me/menu-item-reviews/:reviewId`         | Own active review, `200`                    |
| `DELETE /api/v1/place-reviews/:reviewId`                      | Global `review.moderate`, `200`             |
| `DELETE /api/v1/menu-item-reviews/:reviewId`                  | Global `review.moderate`, `200`             |

Create bodies are strict `{ orderId, rating, comment? }`; update bodies require at least one of `rating` or `comment`. Rating is integer 1–5. Comments are NFC/line-ending normalized, trimmed, empty-to-null, and at most 2,000 code points.

Creation requires an owned COMPLETED order for the route place. Item review additionally requires the item snapshot in that order and a current non-deleted same-place item. One active logical review is allowed per order/place or order/item pair. An active duplicate returns `409 REVIEW_ALREADY_EXISTS`; a deleted match is restored and updated.

Public lists use page 1, limit 20, maximum 100, newest first, and include `reviewCount` and `averageRating`. Place reads require a published active place; item reads require public-menu eligibility. Responses expose review ID, rating/comment, reviewer public ID/name, and timestamps, never internal user/order IDs.

Missing/foreign resources are hidden as `404`. Non-completed orders, place mismatch, or missing item snapshots return stable `409` domain codes. ADMIN and SUPER_ADMIN hold global moderation; moderation is soft deletion without a body/reason, and its safe audit excludes text and personal/order data.

Traceability: SRS-REV-001–013, SRS-API-003–010, SRS-AUTHZ-004/008/011, SRS-AUD-001–006, and SRS-PERF-005/006.
