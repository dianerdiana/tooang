# Media API Specification

## Upload authorization

`POST /api/v1/media/upload-intents` requires `media.upload`. It accepts a strict target (`PLACE_LOGO`, `PLACE_COVER`, or `MENU_ITEM_IMAGE`), `placeId`, the menu item ID only for menu-item targets, an allowlisted JPEG/PNG/WebP/AVIF MIME type, and an integer size from 1 through 5,242,880 bytes.

OWNER may upload only to owned active resources. ADMIN and SUPER_ADMIN use global scope; USER and CASHIER cannot attempt the permission. Menu items are scoped by both IDs and must be non-deleted. The server generates a random filename/path and five-minute ImageKit authorization. The response contains the upload URL, public key, token, signature, expiry, filename, folder, and fixed provider checks. The private key is never returned or logged.

`POST /api/v1/media/upload-intents/:intentId/complete` accepts only `{ "fileId": string }`. Before database work, the backend fetches provider details and verifies file type, exact MIME and size, generated name/path, account-bound lookup, and configured delivery endpoint. It then rechecks the active actor and exact target in a serializable transaction, creates the ACTIVE metadata, switches the association, consumes the intent, and queues prior media for deletion. Repeating a consumed completion returns the same delivery URL without another provider call.

Expired, wrong-actor, mismatched, and replayed intents return `409`; hidden target changes return `404`. Provider outages are sanitized as `502`, and disabled/misconfigured non-production media returns `503`. Public and feature responses expose delivery URLs only.

## Replacement and cleanup

Associations are removed through:

- `DELETE /api/v1/places/:placeId/media/logo`
- `DELETE /api/v1/places/:placeId/media/cover`
- `DELETE /api/v1/places/:placeId/menu-items/:menuItemId/image`

Detaching and transitioning the old asset to `PENDING_DELETE` are atomic. An empty association is an idempotent success. ImageKit calls happen only after commit. Provider success or `404` converges on `DELETED`; failures become `DELETE_FAILED` with a bounded category, not a raw provider response.

The enabled `MediaCleanupWorker` runs non-overlapping minute cycles through `MediaCleanupService`. It processes bounded batches with optimistic attempt claims, a five-minute abandoned-claim lease, and exponential retry from one minute to 24 hours. Five failures remain observable and trigger an alert marker. It also reconciles expired upload intents by exact server-generated path and periodically compares the dedicated provider folder with persisted file IDs while excluding live intent paths. `MediaAsset` evidence is retained rather than hard-deleted.

Set `IMAGEKIT_ENABLED`, `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT`, and optionally `IMAGEKIT_UPLOAD_FOLDER`. Production refuses to start unless ImageKit is enabled and fully configured. SDK debug logging is disabled.
