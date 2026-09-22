# Places API Specification

## Public discovery

`GET /api/v1/places` accepts `page` (1), `limit` (20, maximum 100), optional `search` (maximum 120), `type` (`RESTAURANT|CAFE|FOOD_STALL|OTHER`), and `city` (maximum 100). It returns only published, non-deleted places ordered by `createdAt DESC, id ASC` with standard metadata.

`GET /api/v1/places/:slug` lowercases and validates a 1–100 character ASCII kebab-case slug. It returns a safe public place, seven-day hours, and current `isOpen`; unknown/unpublished/deleted places return `404`.

## Management

`GET /api/v1/places/management` requires global `place.read`. It accepts `page` (1),
`limit` (20, maximum 100), optional `search` (maximum 120), `type`
(`RESTAURANT|CAFE|FOOD_STALL|OTHER`), and `city` (maximum 100). It returns active
published and draft places ordered by `createdAt DESC, id ASC` with standard metadata.
Place-membership grants do not authorize this global endpoint.

| Route                                      | Permission      | Body                               | Success                   |
| ------------------------------------------ | --------------- | ---------------------------------- | ------------------------- |
| `POST /api/v1/places`                      | `place.create`  | Create fields below                | `201`, `data.place`       |
| `PATCH /api/v1/places/:placeId`            | `place.update`  | At least one mutable field         | `200`, `data.place`       |
| `PATCH /api/v1/places/:placeId/publishing` | `place.publish` | `{ "isPublished": boolean }`       | `200`                     |
| `PATCH /api/v1/places/:placeId/ordering`   | `place.update`  | `{ "isOrderingEnabled": boolean }` | `200`                     |
| `DELETE /api/v1/places/:placeId`           | `place.delete`  | None                               | `200`, soft-deleted place |

Create requires `name` (1–120), unique non-reserved `slug`, `type`, `address` (1–500), and an IANA `timezone`. Optional fields are description (2,000), city (100), latitude/longitude, phone, and WhatsApp (30 each). Update supports the same mutable identity/contact/location fields and nullable optional values, but never publication, ordering, memberships, owners, or provider metadata.

Creation atomically creates the place, assigns the actor as OWNER, and audits both actions. Publishing requires a valid active place, an effective OWNER, and a non-deleted item in an active category; unpublishing disables ordering. Enabling ordering additionally requires publication and an available item. Deletion is blocked by active/non-expired orders and otherwise atomically unpublishes and disables ordering.

Target-place OWNER grants and explicit ADMIN/SUPER_ADMIN global grants are accepted as defined by the permission map. Foreign, deleted, or revoked tenant scope returns hidden `404`; impossible permission paths return `403`; uniqueness/state/invariant conflicts return `409`.

Traceability: SRS-PLC-001–022, SRS-HRS-001–008, SRS-RBAC/AUTHZ, SRS-API-003–010, and SRS-AUD-001–006.
