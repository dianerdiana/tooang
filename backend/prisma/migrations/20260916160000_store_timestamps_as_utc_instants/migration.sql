-- SRS-HRS-006 requires database timestamps to represent UTC instants.
-- Existing TIMESTAMP values were written and read by Prisma as UTC, so the
-- conversion explicitly interprets them as UTC instead of using the session zone.

ALTER TABLE "users"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "deletion_requested_at" TYPE TIMESTAMPTZ(3) USING "deletion_requested_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "anonymized_at" TYPE TIMESTAMPTZ(3) USING "anonymized_at" AT TIME ZONE 'UTC';

ALTER TABLE "refresh_sessions"
  ALTER COLUMN "expires_at" TYPE TIMESTAMPTZ(3) USING "expires_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "revoked_at" TYPE TIMESTAMPTZ(3) USING "revoked_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

ALTER TABLE "auth_rate_limit_buckets"
  ALTER COLUMN "window_started_at" TYPE TIMESTAMPTZ(3) USING "window_started_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "expires_at" TYPE TIMESTAMPTZ(3) USING "expires_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "audit_logs"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

ALTER TABLE "places"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC';

ALTER TABLE "place_members"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "revoked_at" TYPE TIMESTAMPTZ(3) USING "revoked_at" AT TIME ZONE 'UTC';

ALTER TABLE "dining_tables"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC';

ALTER TABLE "media_assets"
  ALTER COLUMN "cleanup_requested_at" TYPE TIMESTAMPTZ(3) USING "cleanup_requested_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "cleanup_completed_at" TYPE TIMESTAMPTZ(3) USING "cleanup_completed_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "media_upload_intents"
  ALTER COLUMN "expires_at" TYPE TIMESTAMPTZ(3) USING "expires_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "completed_at" TYPE TIMESTAMPTZ(3) USING "completed_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "menu_categories"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC';

ALTER TABLE "menu_items"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC';

ALTER TABLE "place_reviews"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC';

ALTER TABLE "menu_item_reviews"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC';

ALTER TABLE "carts"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "cart_items"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "orders"
  ALTER COLUMN "status_updated_at" TYPE TIMESTAMPTZ(3) USING "status_updated_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "expires_at" TYPE TIMESTAMPTZ(3) USING "expires_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "verification_disabled_at" TYPE TIMESTAMPTZ(3) USING "verification_disabled_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "confirmed_at" TYPE TIMESTAMPTZ(3) USING "confirmed_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "completed_at" TYPE TIMESTAMPTZ(3) USING "completed_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "cancelled_at" TYPE TIMESTAMPTZ(3) USING "cancelled_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "idempotency_keys"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "expires_at" TYPE TIMESTAMPTZ(3) USING "expires_at" AT TIME ZONE 'UTC';
