-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "PlaceMemberRole" AS ENUM ('OWNER', 'CASHIER');

-- CreateEnum
CREATE TYPE "PlaceType" AS ENUM ('RESTAURANT', 'CAFE', 'FOOD_STALL', 'OTHER');

-- CreateEnum
CREATE TYPE "MenuItemType" AS ENUM ('FOOD', 'DRINK');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "FulfillmentType" AS ENUM ('DINE_IN', 'TAKEAWAY');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MediaAssetStatus" AS ENUM ('ACTIVE', 'PENDING_DELETE', 'DELETE_FAILED', 'DELETED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "id_user" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "platform_role" "PlatformRole" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deletion_requested_at" TIMESTAMP(3),
    "anonymized_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_sessions" (
    "id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "replaced_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "before_data" JSONB,
    "after_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "places" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "type" "PlaceType" NOT NULL,
    "description" VARCHAR(2000),
    "address" VARCHAR(500) NOT NULL,
    "city" VARCHAR(100),
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "phone" VARCHAR(30),
    "whatsapp" VARCHAR(30),
    "timezone" TEXT NOT NULL,
    "logo_asset_id" TEXT,
    "cover_asset_id" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "is_ordering_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "place_members" (
    "id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "PlaceMemberRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "place_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_hours" (
    "id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "day" "DayOfWeek" NOT NULL,
    "opens_at" TIME(0),
    "closes_at" TIME(0),
    "is_closed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "business_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dining_tables" (
    "id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "name" VARCHAR(30) NOT NULL,
    "normalized_name" VARCHAR(30) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "dining_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "imagekit_file_id" TEXT NOT NULL,
    "delivery_url" TEXT NOT NULL,
    "delivery_path" TEXT,
    "mime_type" VARCHAR(50) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "status" "MediaAssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "cleanup_attempts" INTEGER NOT NULL DEFAULT 0,
    "cleanup_last_error" TEXT,
    "cleanup_requested_at" TIMESTAMP(3),
    "cleanup_completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_categories" (
    "id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "normalized_name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "menu_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_items" (
    "id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(1000),
    "type" "MenuItemType" NOT NULL,
    "price" DECIMAL(15,2) NOT NULL,
    "image_asset_id" TEXT,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "place_reviews" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" VARCHAR(2000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "place_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item_reviews" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "menu_item_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" VARCHAR(2000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "menu_item_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "menu_item_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "note" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "order_code" TEXT NOT NULL,
    "verification_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "dining_table_id" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "status_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fulfillment_type" "FulfillmentType" NOT NULL DEFAULT 'DINE_IN',
    "customer_name" VARCHAR(100) NOT NULL,
    "dining_table_name" VARCHAR(30),
    "customer_note" VARCHAR(500),
    "cancellation_reason" VARCHAR(500),
    "subtotal" DECIMAL(15,2) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "verification_disabled_at" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "menu_item_id" TEXT,
    "item_name" TEXT NOT NULL,
    "item_type" "MenuItemType" NOT NULL,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" VARCHAR(500),
    "line_total" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "response_status" INTEGER NOT NULL,
    "response_body" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_id_user_key" ON "users"("id_user");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_platform_role_deleted_at_idx" ON "users"("platform_role", "deleted_at");

-- CreateIndex
CREATE INDEX "users_deleted_at_created_at_idx" ON "users"("deleted_at", "created_at");

-- CreateIndex
CREATE INDEX "users_deletion_requested_at_idx" ON "users"("deletion_requested_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_sessions_token_hash_key" ON "refresh_sessions"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_sessions_replaced_by_id_key" ON "refresh_sessions"("replaced_by_id");

-- CreateIndex
CREATE INDEX "refresh_sessions_user_id_revoked_at_idx" ON "refresh_sessions"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "refresh_sessions_family_id_revoked_at_idx" ON "refresh_sessions"("family_id", "revoked_at");

-- CreateIndex
CREATE INDEX "refresh_sessions_expires_at_idx" ON "refresh_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_target_type_target_id_created_at_idx" ON "audit_logs"("target_type", "target_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "places_slug_key" ON "places"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "places_logo_asset_id_key" ON "places"("logo_asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "places_cover_asset_id_key" ON "places"("cover_asset_id");

-- CreateIndex
CREATE INDEX "places_is_published_deleted_at_created_at_idx" ON "places"("is_published", "deleted_at", "created_at");

-- CreateIndex
CREATE INDEX "places_type_is_published_deleted_at_idx" ON "places"("type", "is_published", "deleted_at");

-- CreateIndex
CREATE INDEX "place_members_place_id_revoked_at_role_idx" ON "place_members"("place_id", "revoked_at", "role");

-- CreateIndex
CREATE INDEX "place_members_user_id_revoked_at_role_idx" ON "place_members"("user_id", "revoked_at", "role");

-- CreateIndex
CREATE UNIQUE INDEX "place_members_place_id_user_id_key" ON "place_members"("place_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_hours_place_id_day_key" ON "business_hours"("place_id", "day");

-- CreateIndex
CREATE INDEX "dining_tables_place_id_is_active_deleted_at_idx" ON "dining_tables"("place_id", "is_active", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "dining_tables_place_id_normalized_name_key" ON "dining_tables"("place_id", "normalized_name");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_imagekit_file_id_key" ON "media_assets"("imagekit_file_id");

-- CreateIndex
CREATE INDEX "media_assets_status_cleanup_requested_at_idx" ON "media_assets"("status", "cleanup_requested_at");

-- CreateIndex
CREATE INDEX "menu_categories_place_id_is_active_deleted_at_sort_order_idx" ON "menu_categories"("place_id", "is_active", "deleted_at", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "menu_categories_place_id_normalized_name_key" ON "menu_categories"("place_id", "normalized_name");

-- CreateIndex
CREATE UNIQUE INDEX "menu_items_image_asset_id_key" ON "menu_items"("image_asset_id");

-- CreateIndex
CREATE INDEX "menu_items_place_id_type_is_available_deleted_at_idx" ON "menu_items"("place_id", "type", "is_available", "deleted_at");

-- CreateIndex
CREATE INDEX "menu_items_category_id_is_available_deleted_at_idx" ON "menu_items"("category_id", "is_available", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "place_reviews_order_id_key" ON "place_reviews"("order_id");

-- CreateIndex
CREATE INDEX "place_reviews_place_id_deleted_at_created_at_idx" ON "place_reviews"("place_id", "deleted_at", "created_at");

-- CreateIndex
CREATE INDEX "place_reviews_user_id_created_at_idx" ON "place_reviews"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "menu_item_reviews_menu_item_id_deleted_at_created_at_idx" ON "menu_item_reviews"("menu_item_id", "deleted_at", "created_at");

-- CreateIndex
CREATE INDEX "menu_item_reviews_user_id_created_at_idx" ON "menu_item_reviews"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "menu_item_reviews_order_id_menu_item_id_key" ON "menu_item_reviews"("order_id", "menu_item_id");

-- CreateIndex
CREATE INDEX "carts_place_id_idx" ON "carts"("place_id");

-- CreateIndex
CREATE UNIQUE INDEX "carts_user_id_place_id_key" ON "carts"("user_id", "place_id");

-- CreateIndex
CREATE INDEX "cart_items_menu_item_id_idx" ON "cart_items"("menu_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cart_id_menu_item_id_key" ON "cart_items"("cart_id", "menu_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_code_key" ON "orders"("order_code");

-- CreateIndex
CREATE UNIQUE INDEX "orders_verification_token_key" ON "orders"("verification_token");

-- CreateIndex
CREATE INDEX "orders_user_id_created_at_idx" ON "orders"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "orders_place_id_status_created_at_idx" ON "orders"("place_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "orders_status_expires_at_idx" ON "orders"("status", "expires_at");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_menu_item_id_idx" ON "order_items"("menu_item_id");

-- CreateIndex
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_user_id_endpoint_key_key" ON "idempotency_keys"("user_id", "endpoint", "key");

-- AddForeignKey
ALTER TABLE "refresh_sessions" ADD CONSTRAINT "refresh_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_sessions" ADD CONSTRAINT "refresh_sessions_replaced_by_id_fkey" FOREIGN KEY ("replaced_by_id") REFERENCES "refresh_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "places" ADD CONSTRAINT "places_logo_asset_id_fkey" FOREIGN KEY ("logo_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "places" ADD CONSTRAINT "places_cover_asset_id_fkey" FOREIGN KEY ("cover_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_members" ADD CONSTRAINT "place_members_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_members" ADD CONSTRAINT "place_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_hours" ADD CONSTRAINT "business_hours_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dining_tables" ADD CONSTRAINT "dining_tables_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "menu_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_image_asset_id_fkey" FOREIGN KEY ("image_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_reviews" ADD CONSTRAINT "place_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_reviews" ADD CONSTRAINT "place_reviews_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_reviews" ADD CONSTRAINT "place_reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_reviews" ADD CONSTRAINT "menu_item_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_reviews" ADD CONSTRAINT "menu_item_reviews_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_reviews" ADD CONSTRAINT "menu_item_reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_dining_table_id_fkey" FOREIGN KEY ("dining_table_id") REFERENCES "dining_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
