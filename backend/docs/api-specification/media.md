# Media API Specification

## Upload intents

`POST /api/v1/media/upload-intents` requires `media.upload`. The strict body contains `target` (`PLACE_LOGO|PLACE_COVER|MENU_ITEM_IMAGE`), `placeId`, allowlisted JPEG/PNG/WebP/AVIF `mimeType`, integer `sizeBytes` from 1 through 5,242,880, and `menuItemId` only for menu-item images. Success is `201` with `data.upload`: upload URL, public key, short-lived token/signature/expiry, generated filename/folder, and fixed provider checks. Private credentials are excluded.

`POST /api/v1/media/upload-intents/:intentId/complete` accepts only `{ "fileId": string }` (trimmed, 1–255). Success is `201 data.media`. The backend fetches and verifies provider type, exact MIME/size/name/path/account and delivery endpoint, then rechecks the actor and target inside a serializable database transaction.

An identical completion of an already consumed intent is idempotent and returns the same media result without another provider call. Wrong actor, expired intent, different provider file, or mismatched replay returns sanitized `409`; hidden target changes return `404`; provider failure returns `502`; disabled/misconfigured non-production media returns `503`.

OWNER membership grants apply only to the owned target place. ADMIN/SUPER_ADMIN use global grants. A platform USER with only CASHIER membership has no `media.upload` or `media.delete` membership grant.

## Detach and cleanup

All return `200 data.media` and require `media.delete`:

- `DELETE /api/v1/places/:placeId/media/logo`
- `DELETE /api/v1/places/:placeId/media/cover`
- `DELETE /api/v1/places/:placeId/menu-items/:menuItemId/image`

Empty associations are idempotent. Detach plus transition to `PENDING_DELETE` is atomic; ImageKit calls occur after commit. Provider success or 404 converges on `DELETED`; failures become observable `DELETE_FAILED` with bounded categories.

The cleanup worker uses non-overlapping minute cycles, bounded batches, attempt claims, a five-minute abandoned-claim lease, exponential retry up to 24 hours, alert markers after five failures, expired-intent reconciliation, and provider-folder comparison. `MediaAsset` evidence is retained. Public contracts expose delivery URLs only.

Traceability: SRS-MED-001–018, SRS-REL-006/013/014, SRS-SEC-003/006/014/015, SRS-API-003/007–010, and SRS-AUD-001–006.
