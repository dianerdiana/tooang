# Menus API Specification

## Category management

All routes are protected beneath `/api/v1/places/:placeId/menu-categories`.

| Route                 | Permission    | Success                               |
| --------------------- | ------------- | ------------------------------------- |
| `GET /`               | `menu.update` | `200 data.categories` plus pagination |
| `GET /:categoryId`    | `menu.update` | `200 data.category`                   |
| `POST /`              | `menu.create` | `201 data.category`                   |
| `PATCH /:categoryId`  | `menu.update` | `200 data.category`                   |
| `DELETE /:categoryId` | `menu.delete` | `200 data.category`                   |

Lists use page 1, limit 20 (maximum 100), optional `isActive`, and `sortOrder ASC, id ASC`. Create accepts `name`, optional `sortOrder`, and optional `isActive`; update requires at least one supported field. Names are trimmed/whitespace-collapsed, 1–100 code points, and unique by lowercase normalized form per place, including deleted rows. V1 does not expose category descriptions.

Deletion sets inactive/deleted state, removes affected cart rows, and returns `409` while non-deleted items remain.

## Item management

Protected routes are `GET/POST /api/v1/places/:placeId/menu-items` and `GET/PATCH/DELETE /api/v1/places/:placeId/menu-items/:menuItemId`. Reads require `menu.update`; writes require the corresponding create/update/delete permission. Lists support standard pagination and optional `type`, `categoryId`, and `isAvailable`.

Create requires `categoryId`, `name`, `type` (`FOOD|DRINK`), and numeric `price`; description, availability, and non-negative sort order are optional. Names are 1–120 code points, descriptions at most 1,000 and empty-to-null, and prices are finite non-negative `Decimal(15,2)` values with at most two fractional digits. Update requires at least one supported field.

Category/item lookups include `placeId`. Unavailability, movement into an inactive category, or deletion removes affected cart rows. Deletion sets unavailable/deleted state; order snapshots remain unchanged. Eligibility-reducing changes may disable ordering or unpublish as required but never cancel orders.

## Public menu

`GET /api/v1/places/:placeId/menu` is public and accepts standard pagination plus optional `type` and `categoryId`. The place must be published/non-deleted. Only available non-deleted items in active non-deleted categories qualify. Pagination is over items before grouping; output is `data.categories[].items[]` with standard item-count metadata.

OWNER scope is limited to an active owned place; ADMIN/SUPER_ADMIN use explicit global grants. Foreign/deleted children return hidden `404`; invalid input returns `400`; duplicate names, state conflicts, and exhausted serialization return `409`. Public/management responses expose active `imageUrl` only, never ImageKit IDs or lifecycle fields.

Traceability: SRS-MNU-001–014, SRS-API-003–010, SRS-AUTHZ-004/008–011, SRS-CART-006–010, and SRS-PERF-002/005/006.
