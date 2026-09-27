ALTER TYPE "MediaTargetType" ADD VALUE 'MENU_CATEGORY_THUMBNAIL';

CREATE TYPE "OrderSource" AS ENUM ('CUSTOMER', 'MANUAL');

ALTER TABLE "menu_categories"
  ADD COLUMN "thumbnail_asset_id" TEXT;

ALTER TABLE "media_upload_intents"
  ADD COLUMN "category_id" TEXT;

ALTER TABLE "orders"
  ADD COLUMN "source" "OrderSource" NOT NULL DEFAULT 'CUSTOMER',
  ADD COLUMN "created_by_user_id" TEXT,
  ALTER COLUMN "user_id" DROP NOT NULL;

CREATE UNIQUE INDEX "menu_categories_thumbnail_asset_id_key"
  ON "menu_categories"("thumbnail_asset_id");

CREATE INDEX "orders_created_by_user_id_created_at_idx"
  ON "orders"("created_by_user_id", "created_at");

ALTER TABLE "menu_categories"
  ADD CONSTRAINT "menu_categories_thumbnail_asset_id_fkey"
  FOREIGN KEY ("thumbnail_asset_id") REFERENCES "media_assets"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "media_upload_intents"
  ADD CONSTRAINT "media_upload_intents_category_id_fkey"
  FOREIGN KEY ("category_id", "place_id") REFERENCES "menu_categories"("id", "place_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_source_identity_check"
  CHECK (
    ("source" = 'CUSTOMER' AND "user_id" IS NOT NULL AND "created_by_user_id" IS NULL)
    OR
    ("source" = 'MANUAL' AND "user_id" IS NULL AND "created_by_user_id" IS NOT NULL)
  );
