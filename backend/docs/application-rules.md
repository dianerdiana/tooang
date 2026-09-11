# Application Service and Transaction Rules

This document defines business rules that cannot be fully enforced by `prisma/schema.prisma`. All services, controllers, guards, jobs, and seeds must follow these rules.

## 1. General Principles

- Do not accept `userId`, roles, or owner identity from a request as the source of truth. Obtain the user's identity from a verified access token.
- Use `User.id` as the internal foreign key. Use `User.userId` only as a public identifier when required by the API.
- All active-data queries must exclude records where `deletedAt != null`, except for administrative endpoints that explicitly display archived records.
- Validate input in DTOs and revalidate important invariants within transactions.
- Do not trust prices, subtotals, menu names, roles, or statuses submitted by the client without recalculating or verifying them on the server.
- Operations that read and then modify multiple related records must use `prisma.$transaction`.

## 2. Identity and RBAC

### User Roles

- Every active user must have at least one `UserRole`.
- Standard user registration must create the `User` and assign the `USER` role within a single transaction.
- Only `SUPER_ADMIN` may add or remove roles.
- A user's last role must not be removed while the user remains active.
- A user who is a `PlaceOwner` must have the `OWNER` role.
- The `OWNER` role must not be removed while the user still has a `PlaceOwner` relationship.
- System roles in the `Role` table must be seeded and must not be deleted through general-purpose endpoints.
- Authentication tokens must represent all active roles assigned to the user, or the service must reload roles from the database for sensitive operations. Do not rely on a single role.

### Access Matrix

| Operation | USER | OWNER | SUPER_ADMIN |
| --- | --- | --- | --- |
| View published places/menus | Yes | Yes | Yes |
| Write own reviews | Yes | Yes | Yes |
| Manage own cart/orders | Yes | Yes | Yes |
| Manage owned places | No | Yes | Yes |
| View and process a place's orders | No | Owned places only | Yes |
| Manage roles and all data | No | No | Yes |

`ADMIN` is retained in the schema for compatibility with existing code, but its permissions must be explicitly defined before use. Do not automatically treat it as equivalent to `SUPER_ADMIN`.

### Ownership Checks

- For OWNER operations, mutation queries must include a `placeId` restriction linked to `PlaceOwner.userId = authenticatedUser.id`.
- Do not check only for the `OWNER` role; always verify ownership of the target place.
- Child entities—business hours, categories, menus, administrative reviews, carts, and orders—must be traced back to `Place.id` before they are modified.
- `SUPER_ADMIN` may bypass ownership checks but remains subject to business validation and auditing.
- If an entity exists but does not belong to the OWNER, the recommended response is `404` to avoid exposing the existence of another tenant's resource.

## 3. Places and Ownership

- Creating a `Place`, assigning a `PlaceOwner`, and granting the `OWNER` role when necessary must be atomic within a single transaction.
- An active place must have at least one OWNER, unless it is temporarily managed by `SUPER_ADMIN` under a documented operational policy.
- The last owner must not be removed from an active place.
- The `slug` must be normalized, unique, and must not use reserved application paths.
- A place may be published only when the minimum required data is complete: name, type, address, at least one OWNER, and at least one active menu item, according to product policy.
- Ordering may be enabled only when the place is active, published, and has at least one available menu item.
- Disabling ordering prevents new checkouts but does not cancel existing orders.
- Soft-deleting a place must disable publishing and ordering. Active orders must be completed or cancelled first.

## 4. Business Hours

- The unique constraint already helps enforce a maximum of one `BusinessHour` record per day for each place.
- If `isClosed = true`, `opensAt` and `closesAt` must be `null`.
- If `isClosed = false`, `opensAt` and `closesAt` are required and must not be equal.
- Hours that cross midnight must be handled explicitly by the service; for example, `18:00–02:00` means the place closes on the following day.
- All opening-hours evaluations must use the place's timezone or the agreed application timezone, not the client device's timezone.

## 5. Categories and Menus

- `MenuCategory.placeId` must equal `MenuItem.placeId`. The service must look up the category using the combination of `categoryId` and `placeId`.
- Category names must be unique within a place using case-insensitive comparison. Normalize whitespace before validation.
- Menu prices must be greater than or equal to zero and use `Decimal`; do not use JavaScript floating-point arithmetic for monetary calculations.
- `sortOrder` must not be negative.
- A menu item that is deleted, belongs to an inactive category, or has `isAvailable = false` must not be added to a cart or ordered.
- Changing a menu item's price must not alter stored `OrderItem` history.
- Soft-deleting a menu item must not delete order history. Related items in active carts must be removed or marked invalid when the cart is read.
- An OWNER may create, update, move between categories, or delete menu items only in places they own.

## 6. Reviews

- Ratings must be integers from 1 through 5.
- A user may have only one active review per place and one active review per menu item, in accordance with the current unique constraints.
- If a review has been soft-deleted and the user submits another review, the service must restore and update the old record; creating a new record would violate the unique constraint.
- Users may update or delete only their own reviews. `SUPER_ADMIN` may moderate reviews.
- A reviewed place must be active and published. A reviewed menu item must belong to that place and must not be deleted.
- Define the purchase-verification policy before restricting reviews to verified buyers. If implemented, check for an `OrderStatus.COMPLETED` order containing the relevant menu item or place.
- Average ratings and review counts must include only reviews where `deletedAt = null`.
- If rating summaries are cached, review and cache updates must occur in the same transaction or through an idempotent event mechanism.

## 7. Carts

- A cart may contain menu items from only one place. `Cart.placeId` must equal `MenuItem.placeId` for every `CartItem`.
- Users may read and modify only their own carts.
- Quantity must be an integer greater than zero and should have a product-defined maximum.
- Adding the same item must update the quantity of the existing `CartItem` because the combination of `cartId` and `menuItemId` is unique.
- Changing the quantity to zero must delete the item instead of storing a zero quantity.
- Prices are not stored in the cart; current prices are reloaded from `MenuItem` when the cart is displayed and during checkout.
- A cart may be retained while ordering is disabled, but checkout must be rejected.
- Every cart read must flag or remove menu items that are unavailable, deleted, or belong to inactive categories.
- Item notes must have a length limit and must be sanitized when displayed.

## 8. Checkout and Order Creation

Checkout must be performed in a single transaction using the following logical sequence:

1. Load the active user and their cart, including the place, categories, and all menu items.
2. Ensure the cart is not empty and every item belongs to `Cart.placeId`.
3. Ensure the place is active, published, and has `isOrderingEnabled = true`.
4. Ensure every menu item is not deleted, is available, belongs to an active category, and has a valid quantity.
5. Recalculate `unitPrice`, `lineTotal`, and `subtotal` on the server using `Decimal`.
6. Generate a unique, human-readable `orderCode`. Handle collisions by retrying unique-constraint failures a limited number of times.
7. Create the `Order` and all `OrderItem` records. Copy `itemName`, `itemType`, and `unitPrice` as snapshots.
8. Set `expiresAt` according to place or application policy.
9. Empty the cart only after the order and all its items have been created successfully.

Additional rules:

- `subtotal` must equal the sum of all `OrderItem.lineTotal` values.
- `lineTotal` must equal `unitPrice × quantity`.
- `customerName` is a snapshot and must not change automatically when the user's profile is updated.
- `tableNumber` is required for `DINE_IN` only if the place uses table numbers; it must be empty for `TAKEAWAY`.
- The checkout endpoint must use an idempotency key so network retries do not create duplicate orders.
- Under high concurrency, use an appropriate isolation level or optimistic concurrency control to prevent prices or availability from changing during checkout.

## 9. Order Lifecycle

Allowed status transitions:

```text
PENDING   -> CONFIRMED | CANCELLED | EXPIRED
CONFIRMED -> PREPARING | CANCELLED
PREPARING -> READY | CANCELLED
READY     -> COMPLETED | CANCELLED
COMPLETED -> terminal
CANCELLED -> terminal
EXPIRED   -> terminal
```

- Users may cancel only their own orders while the status is `PENDING`, unless the place's policy allows otherwise.
- An OWNER may view or update only orders belonging to their places.
- `SUPER_ADMIN` may update any order but must not bypass transition rules without a recorded override flow.
- Every status change must use a conditional update against the previous status to prevent race conditions.
- Populate the appropriate timestamp when the status changes: `confirmedAt`, `completedAt`, or `cancelledAt`.
- An idempotent job must change `PENDING` orders that have passed `expiresAt` to `EXPIRED`.
- Terminal orders must not be edited, except for administrative metadata that does not alter transaction values.
- Because there is no payment gateway, do not add payment statuses or claim that an order has been paid based solely on its order status.

## 10. Codes, QR Codes, and Verification Links

- `orderCode` is used for human communication and cashier lookups; do not use a short code as the sole proof of authorization.
- A QR code should contain a URL that uses `verificationToken`, not `Order.id`, `userId`, or personal information.
- The token-verification endpoint must display only the minimum data required by the cashier.
- Tokens must be compared exactly, must not be logged in full, and must not be sent to analytics services.
- A cashier or OWNER may process an order only after ownership of the place has been verified from their session; possession of the QR code alone does not grant mutation permissions.
- Apply rate limits to code- and token-based lookups to reduce brute-force attempts.
- Links for `CANCELLED` or `EXPIRED` orders, or orders beyond the retention period, must return a safe response without exposing personal data.

## 11. Soft Deletion and Retention

- Soft-deleted users must not be able to log in, create reviews, modify carts, or create orders.
- Historical order data must be retained according to audit requirements and privacy policies.
- Do not hard-delete a `User`, `Place`, or `MenuItem` that is still referenced by order history without a dedicated retention process.
- User-data anonymization must preserve order integrity while removing personal data that is no longer required.
- Restoring a record must recheck conflicts involving email addresses, slugs, category names, and other unique constraints.

## 12. Error Handling and Auditing

- Use `400` for invalid input, `401` for invalid tokens, `403` for global role-based restrictions, `404` for missing resources or resources owned by another tenant, and `409` for state or unique-constraint conflicts.
- Do not return stack traces, password hashes, verification tokens, or internal Prisma details to clients.
- Log sensitive actions: role changes, OWNER assignments, ordering-setting changes, review moderation, and order-status changes.
- Audit logs must include, at minimum, the actor, action, target, timestamp, and safe before/after values. Do not store passwords, tokens, or secrets.

## 13. Recommended Additional Database Constraints

The Prisma schema does not express every `CHECK constraint`. Manual SQL migrations are recommended for:

- `rating BETWEEN 1 AND 5` on both review tables.
- `price >= 0`, `unit_price >= 0`, `line_total >= 0`, and `subtotal >= 0`.
- `quantity > 0` on cart items and order items.
- `sort_order >= 0`.
- Consistency between `is_closed`, `opens_at`, and `closes_at` for business hours.

Service-level validation remains mandatory even after these database constraints are added so the API can return clear error messages.

## 14. Minimum Test Scenarios

- A user is created atomically with the `USER` role, and their last role cannot be removed.
- OWNER A cannot read or modify private entities or orders belonging to OWNER B.
- `SUPER_ADMIN` can manage all places.
- A category from another place is rejected when creating or moving a menu item.
- A menu item from another place is rejected when added to a cart.
- Checkout is rejected when ordering is disabled, the place is unpublished, the cart is empty, or any menu item is unavailable.
- A price change before checkout produces a snapshot of the latest price, while existing orders remain unchanged.
- Retrying checkout with the same idempotency key creates only one order.
- Illegal status transitions and two concurrent status updates are rejected correctly.
- A valid QR token exposes only the minimum data and does not grant mutation permissions without a valid OWNER session.
- Reviews with ratings outside 1–5 are rejected, and deleted reviews can be restored without unique-constraint conflicts.
