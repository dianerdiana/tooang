# Reviews API Specification

## Customer reviews

Authenticated active users create verified-purchase reviews with strict `{ orderId, rating, comment? }` bodies. Ratings are integers from 1 through 5. Comments are NFC-normalized, trimmed, converted to `null` when empty, and limited to 2,000 Unicode characters.

- `POST /api/v1/places/:placeId/reviews` requires an order owned by the actor that is `COMPLETED`, belongs to the route place, and targets a currently published, non-deleted place.
- `POST /api/v1/places/:placeId/menu-items/:menuItemId/reviews` additionally requires a matching menu-item ID in that order's item snapshots and a current non-deleted menu item belonging to the route place.
- `PATCH` and `DELETE` beneath `/api/v1/me/place-reviews/:reviewId` and `/api/v1/me/menu-item-reviews/:reviewId` operate only on the actor's active review. DELETE is a soft deletion.

An active duplicate returns `409 REVIEW_ALREADY_EXISTS`. Re-submitting a deleted matching review restores and updates the existing row, returning `200`; a new row returns `201`. A non-completed order, place mismatch, or missing item snapshot returns a stable `409` domain error. Missing and foreign resources are hidden as `404`.

## Public reads

`GET /api/v1/places/:placeId/reviews` and `GET /api/v1/places/:placeId/menu-items/:menuItemId/reviews` use `page=1`, `limit=20`, and a maximum limit of 100. Responses contain a newest-first page plus `{ reviewCount, averageRating }`. Both the page and summary exclude soft-deleted reviews. Place reviews require a published active place; menu-item reviews require the same target eligibility as the public menu.

Review responses expose the review ID, rating, comment, reviewer public ID/name, and timestamps. Internal user IDs and qualifying order IDs are not exposed.

## Moderation

`DELETE /api/v1/place-reviews/:reviewId` and `DELETE /api/v1/menu-item-reviews/:reviewId` require the global `review.moderate` permission. ADMIN and SUPER_ADMIN may soft-delete an active review regardless of parent-resource lifecycle state. Moderation does not edit content, restore reviews, accept a reason, or hard-delete data.

The soft deletion and `REVIEW_MODERATED` audit are atomic. Audit data records only the actor, review type/ID, operation, changed field, and deletion timestamp; review text and reviewer/order data are excluded.
