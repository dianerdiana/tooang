# Dining Tables API Specification

All routes are beneath `/api/v1/places/:placeId/dining-tables` and require current target-place scope or an explicitly global grant.

| Method/path        | Permission     | Body                               | Success                          |
| ------------------ | -------------- | ---------------------------------- | -------------------------------- |
| `GET /`            | `table.read`   | None                               | `200`, `data.tables`             |
| `GET /:tableId`    | `table.read`   | None                               | `200`, `data.table`              |
| `POST /`           | `table.create` | `{ "name": string }`               | `201`, `data.table`              |
| `PATCH /:tableId`  | `table.update` | At least one of `name`, `isActive` | `200`, `data.table`              |
| `DELETE /:tableId` | `table.delete` | None                               | `200`, soft-deleted `data.table` |

Names are trimmed, internal whitespace is collapsed, and display length is 1–30 Unicode code points. The lowercase normalized key is unique per place, including deleted rows. Duplicate create/rename returns `409`; restoration is not exposed.

CASHIER reads include active, non-deleted tables only. OWNER and global ADMIN/SUPER_ADMIN reads may include inactive, non-deleted tables. Responses expose `tableId`, `placeId`, name, active state, and timestamps, never `normalizedName` or `deletedAt`. Child lookup always uses both IDs; cross-place, deleted, or revoked scope returns hidden `404`.

The collection is currently unpaginated. Unlike the fixed seven-day hours collection, table count is not intrinsically bounded; pagination is an open SRS-API-004 implementation gap. Soft deletion preserves historical `Order.diningTableName` snapshots.

Traceability: SRS-TBL-001–011, SRS-API-003/004/006/007/009, SRS-AUTHZ-004/008–011, and SRS-DATA-006.
