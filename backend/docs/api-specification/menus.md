# Menus API Specification

## Category management

The protected category endpoints are `GET`, `POST`, `PATCH`, and `DELETE` beneath `/api/v1/places/:placeId/menu-categories`, with `GET` and `PATCH` by `:categoryId`. Management reads require `menu.update`; writes require the corresponding `menu.create`, `menu.update`, or `menu.delete` permission. OWNER access is limited to owned places, while ADMIN and SUPER_ADMIN use global scope.

Lists use `page=1`, `limit=20` (maximum 100), and optional `isActive`, ordered by `sortOrder ASC, id ASC`. Names contain 1–100 Unicode characters after trimming and whitespace collapse. Their lowercase normalized form is unique per place, including soft-deleted rows. `sortOrder` is a non-negative integer. V1 does not expose category descriptions.

Deleting a category sets `isActive=false` and `deletedAt`; a category containing non-deleted menu items returns `409`. Deactivation removes the category's cart rows. Deleted categories are not restored through this API.

## Item management

Protected item endpoints are `GET`, `POST`, `PATCH`, and `DELETE` beneath `/api/v1/places/:placeId/menu-items`, with read/update/delete by `:menuItemId`. Management lists support bounded pagination plus `type`, `categoryId`, and `isAvailable` filters.

Create requires `categoryId`, `name`, `type` (`FOOD` or `DRINK`), and numeric `price`; description, availability, and sort order are optional. Names contain 1–120 Unicode characters, descriptions at most 1,000, and empty descriptions become null. Prices must be finite, non-negative, have at most two fractional digits, and fit `Decimal(15,2)`. The service converts accepted values directly to `Prisma.Decimal`.

Category and item lookups are always scoped by `placeId`. Moving an item to an inactive category is allowed but removes it from public/orderable content. Unavailability, movement to an inactive category, and deletion remove affected cart rows. Deletion sets `isAvailable=false` and `deletedAt`. OrderItem snapshots are never changed.

Eligibility-reducing changes disable ordering when no available item remains in an active category and unpublish the place when no non-deleted item remains in an active category. They never cancel orders. New or reactivated content does not publish or enable ordering automatically.

## Public menu

`GET /api/v1/places/:placeId/menu` is public. It accepts bounded `page`/`limit` plus optional `type` and `categoryId`. The place must be published and non-deleted. Only available, non-deleted items in active, non-deleted categories qualify.

Pagination is over items before grouping. Results are ordered by category sort order and ID, then item sort order and ID, and returned as `categories[]` with their page-local `items[]`. Metadata counts qualifying items. An unknown, inactive, or foreign category filter returns an empty page. Item responses expose only the active delivery `imageUrl`, never provider identifiers or media lifecycle fields.

Duplicate normalized category names, uniqueness races, and exhausted serializable transactions return `409`. Foreign/deleted tenant children return `404`. Global administrative mutations emit a safe `ADMIN_CROSS_PLACE_MUTATION` audit.
