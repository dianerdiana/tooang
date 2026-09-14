# Dining Tables API Specification

Endpoints are scoped beneath `/api/v1/places/:placeId/dining-tables`:

- `GET /` and `GET /:tableId` require `table.read`. CASHIER sees active, non-deleted tables only; OWNER and global ADMIN/SUPER_ADMIN may also see inactive, non-deleted tables.
- `POST /` requires `table.create` and strict `{ "name": string }`.
- `PATCH /:tableId` requires `table.update` and at least one of `name` or `isActive`.
- `DELETE /:tableId` requires `table.delete` and atomically marks the row inactive and deleted.

Names are trimmed, internal whitespace is collapsed, and the normalized key is lowercased. Display names contain 1–30 Unicode characters. The normalized key is unique per place, including soft-deleted rows; duplicate creation or rename returns `409`. Restoration is not supported.

Responses expose `tableId`, `placeId`, display `name`, active state, and timestamps. They never expose `normalizedName` or `deletedAt`. Every child lookup is scoped by both place ID and table ID, so cross-place identifiers return `404`. Soft deletion does not modify historical `Order.diningTableName` snapshots.
