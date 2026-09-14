# Places API Specification

## Public discovery

`GET /api/v1/places` is public. It accepts `page` (default 1), `limit` (default 20, maximum 100), and optional `search`, `type`, and `city`. Search matches name or city case-insensitively; city is an exact case-insensitive filter. Only published, non-deleted places are returned, ordered by `createdAt DESC, id ASC`, with pagination metadata.

`GET /api/v1/places/:slug` is public. The slug is trimmed and lowercased before lookup. Unknown, unpublished, and deleted places return `404`. The safe place profile includes ordering state, the seven-day business-hours representation, and `isOpen` calculated for the current instant in the place timezone. Internal media-provider identifiers, memberships, and deletion state are never returned.

## Creation and profile management

`POST /api/v1/places` requires `place.create`. The authenticated actor becomes the initial OWNER. Place, membership, and the `PLACE_CREATED` and `PLACE_MEMBER_ASSIGNED` audits commit atomically. Clients cannot supply an owner, publication state, or ordering state.

`PATCH /api/v1/places/:placeId` requires target-place `place.update`. It accepts at least one supported identity/contact/location field and rejects publication, ordering, membership, owner, and media-provider fields. Optional text fields may be cleared with `null` or a trimmed empty string.

`DELETE /api/v1/places/:placeId` requires target-place `place.delete`. It returns `409` while a CONFIRMED, PREPARING, READY, or non-expired PENDING order exists. Otherwise it atomically sets `deletedAt`, `isPublished=false`, and `isOrderingEnabled=false`. Terminal orders and logically expired PENDING orders do not block deletion; historical orders are preserved.

OWNER permissions apply only to owned places. ADMIN and SUPER_ADMIN use global place permissions. Foreign, revoked, and deleted tenant resources are hidden as `404`; impossible permission paths are `403`.

## Slugs and validation

Slugs are client-supplied, trimmed, lowercased ASCII kebab-case values of 1–100 characters. `api`, `admin`, `auth`, `me`, `users`, and `places` are reserved. Names are 1–120 Unicode characters, descriptions at most 2,000, addresses 1–500, cities at most 100, and phone/WhatsApp values at most 30. Coordinates use geographic ranges. Timezones must be recognized IANA identifiers.

Duplicate/reserved slugs, readiness failures, and exhausted concurrent mutations return sanitized `409` responses.

## Publishing and ordering

`PATCH /api/v1/places/:placeId/publishing` accepts strict `{ "isPublished": boolean }` and requires `place.publish`. Publishing requires an active place with name, type, address, valid timezone, at least one effective active OWNER, and one non-deleted menu item in an active, non-deleted category. Menu-item availability is not needed merely to publish. Unpublishing also disables ordering.

`PATCH /api/v1/places/:placeId/ordering` accepts strict `{ "isOrderingEnabled": boolean }` and requires `place.update`. Enabling requires an active published place and an available non-deleted item in an active, non-deleted category. Disabling does not alter existing orders. Actual checkout opening-state enforcement is handled by the checkout feature.

Every explicit ordering change emits `ORDERING_SETTING_UPDATED`. ADMIN/SUPER_ADMIN global place mutations also emit `ADMIN_CROSS_PLACE_MUTATION` with the operation, permission, place ID, and safe changed-field names.
