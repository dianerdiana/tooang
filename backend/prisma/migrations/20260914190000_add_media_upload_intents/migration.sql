CREATE TYPE "MediaTargetType" AS ENUM ('PLACE_LOGO', 'PLACE_COVER', 'MENU_ITEM_IMAGE');

CREATE TABLE "media_upload_intents" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "menu_item_id" TEXT,
    "target" "MediaTargetType" NOT NULL,
    "provider_token_hash" VARCHAR(64) NOT NULL,
    "expected_file_name" VARCHAR(255) NOT NULL,
    "expected_file_path" TEXT NOT NULL,
    "expected_mime_type" VARCHAR(50) NOT NULL,
    "expected_size_bytes" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "completed_asset_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_upload_intents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "media_upload_intents_size_check" CHECK ("expected_size_bytes" BETWEEN 1 AND 5242880),
    CONSTRAINT "media_upload_intents_target_check" CHECK (
      ("target" = 'MENU_ITEM_IMAGE' AND "menu_item_id" IS NOT NULL) OR
      ("target" IN ('PLACE_LOGO', 'PLACE_COVER') AND "menu_item_id" IS NULL)
    )
);

CREATE UNIQUE INDEX "media_upload_intents_provider_token_hash_key" ON "media_upload_intents"("provider_token_hash");
CREATE UNIQUE INDEX "media_upload_intents_completed_asset_id_key" ON "media_upload_intents"("completed_asset_id");
CREATE INDEX "media_upload_intents_actor_user_id_expires_at_idx" ON "media_upload_intents"("actor_user_id", "expires_at");
CREATE INDEX "media_upload_intents_completed_at_expires_at_idx" ON "media_upload_intents"("completed_at", "expires_at");
CREATE INDEX "media_upload_intents_place_id_target_idx" ON "media_upload_intents"("place_id", "target");

ALTER TABLE "media_upload_intents" ADD CONSTRAINT "media_upload_intents_actor_user_id_fkey"
FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "media_upload_intents" ADD CONSTRAINT "media_upload_intents_place_id_fkey"
FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "media_upload_intents" ADD CONSTRAINT "media_upload_intents_menu_item_id_fkey"
FOREIGN KEY ("menu_item_id", "place_id") REFERENCES "menu_items"("id", "place_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "media_upload_intents" ADD CONSTRAINT "media_upload_intents_completed_asset_id_fkey"
FOREIGN KEY ("completed_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
