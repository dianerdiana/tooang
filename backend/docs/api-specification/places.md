# Places API Specification

## Create a place

`POST /api/v1/places` requires the code-defined `place.create` platform permission. The authenticated actor becomes the initial `PlaceMember(role=OWNER)`; owner identity is never accepted from the request. Place creation, initial membership creation, and both audit records are committed atomically.

The request accepts `name`, normalized unique `slug`, `type`, `address`, valid IANA `timezone`, and the optional place fields modeled in Prisma. New places are unpublished with ordering disabled. Reserved route slugs are rejected.

Creating a place does not change `User.platformRole`. Any later OWNER membership assignment or revocation remains SUPER_ADMIN-only.
