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
| `GET /api/v1/place-reviews`                                   | Global `review.moderate`, paginated         |
| `GET /api/v1/menu-item-reviews`                               | Global `review.moderate`, paginated         |

Create bodies are strict `{ orderId, rating, comment? }`; update bodies require at least one of `rating` or `comment`. Rating is integer 1–5. Comments are NFC/line-ending normalized, trimmed, empty-to-null, and at most 2,000 code points.

Creation requires an owned COMPLETED order for the route place. Item review additionally requires the item snapshot in that order and a current non-deleted same-place item. One active logical review is allowed per order/place or order/item pair. An active duplicate returns `409 REVIEW_ALREADY_EXISTS`; a deleted match is restored and updated.

Public lists use page 1, limit 20, maximum 100, newest first, and include `reviewCount` and `averageRating`. Place reads require a published active place; item reads require public-menu eligibility. Responses expose review ID, rating/comment, reviewer public ID/name, and timestamps, never internal user/order IDs.

Missing/foreign resources are hidden as `404`. Non-completed orders, place mismatch, or missing item snapshots return stable `409` domain codes. ADMIN and SUPER_ADMIN hold global moderation; moderation is soft deletion without a body/reason, and its safe audit excludes text and personal/order data.

## Moderation lists

`GET /api/v1/place-reviews` and `GET /api/v1/menu-item-reviews` require global
`review.moderate`. Both accept `page` (default `1`) and `limit` (default `20`, maximum
`100`) and return active reviews newest first. Place reviews accept optional `placeId`;
menu-item reviews accept optional `placeId` and `menuItemId`. All identifiers are UUIDs.

Unlike public lists, moderation lists do not require a published place, an available
menu item, or an active category. They expose only the review ID, rating/comment,
reviewer public ID/name, timestamps, and public ID/name context for the place and,
where applicable, menu item. Internal user and order identifiers are never returned.

```json
{
  "error": false,
  "message": "Menu-item reviews retrieved for moderation",
  "data": {
    "reviews": [
      {
        "reviewId": "00000000-0000-4000-8000-000000000001",
        "rating": 2,
        "comment": "Example moderation text",
        "reviewer": { "userId": "usr_example", "fullName": "Example User" },
        "place": { "placeId": "00000000-0000-4000-8000-000000000002", "name": "Cafe" },
        "menuItem": { "menuItemId": "00000000-0000-4000-8000-000000000003", "name": "Coffee" },
        "createdAt": "2026-09-23T00:00:00.000Z",
        "updatedAt": "2026-09-23T00:00:00.000Z"
      }
    ]
  },
  "meta": { "page": 1, "limit": 20, "totalItems": 1, "totalPages": 1 }
}
```

Traceability: SRS-REV-001–013, SRS-API-003–010, SRS-AUTHZ-004/008/011, SRS-AUD-001–006, and SRS-PERF-005/006.
