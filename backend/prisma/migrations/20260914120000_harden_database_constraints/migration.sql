-- Keep the expand/backfill/constraint swap atomic on PostgreSQL.
BEGIN;

-- Expand cart items with the tenant key used by the composite foreign keys.
ALTER TABLE "cart_items" ADD COLUMN "place_id" TEXT;

UPDATE "cart_items" AS ci
SET "place_id" = c."place_id"
FROM "carts" AS c
WHERE c."id" = ci."cart_id";

-- Abort instead of silently rewriting business data that violates the new rules.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "cart_items" WHERE "place_id" IS NULL) THEN
        RAISE EXCEPTION 'Preflight failed: cart_items contains an orphaned cart reference';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "cart_items" ci
        JOIN "menu_items" mi ON mi."id" = ci."menu_item_id"
        WHERE ci."place_id" <> mi."place_id"
    ) THEN
        RAISE EXCEPTION 'Preflight failed: cart_items contains cross-place menu items';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "menu_items" mi
        JOIN "menu_categories" mc ON mc."id" = mi."category_id"
        WHERE mi."place_id" <> mc."place_id"
    ) THEN
        RAISE EXCEPTION 'Preflight failed: menu_items contains a category from another place';
    END IF;

    IF EXISTS (
        SELECT 1 FROM "business_hours"
        WHERE NOT (
            ("is_closed" AND "opens_at" IS NULL AND "closes_at" IS NULL)
            OR
            (NOT "is_closed" AND "opens_at" IS NOT NULL AND "closes_at" IS NOT NULL AND "opens_at" <> "closes_at")
        )
    ) THEN
        RAISE EXCEPTION 'Preflight failed: business_hours contains inconsistent open/closed times';
    END IF;

    IF EXISTS (
        SELECT 1 FROM "dining_tables"
        WHERE char_length(btrim("name")) = 0
           OR "normalized_name" <> lower(regexp_replace(btrim("name"), '[[:space:]]+', ' ', 'g'))
    ) THEN
        RAISE EXCEPTION 'Preflight failed: dining_tables contains a non-canonical name';
    END IF;

    IF EXISTS (
        SELECT 1 FROM "menu_categories"
        WHERE char_length(btrim("name")) = 0
           OR "normalized_name" <> lower(regexp_replace(btrim("name"), '[[:space:]]+', ' ', 'g'))
           OR "sort_order" < 0
    ) THEN
        RAISE EXCEPTION 'Preflight failed: menu_categories contains an invalid name or sort order';
    END IF;

    IF EXISTS (
        SELECT 1 FROM "menu_items"
        WHERE char_length(btrim("name")) = 0 OR "price" < 0 OR "sort_order" < 0
    ) THEN
        RAISE EXCEPTION 'Preflight failed: menu_items contains an invalid name, price, or sort order';
    END IF;

    IF EXISTS (SELECT 1 FROM "place_reviews" WHERE "rating" NOT BETWEEN 1 AND 5)
       OR EXISTS (SELECT 1 FROM "menu_item_reviews" WHERE "rating" NOT BETWEEN 1 AND 5) THEN
        RAISE EXCEPTION 'Preflight failed: review rating is outside the range 1 through 5';
    END IF;

    IF EXISTS (SELECT 1 FROM "cart_items" WHERE "quantity" NOT BETWEEN 1 AND 99) THEN
        RAISE EXCEPTION 'Preflight failed: cart item quantity is outside the range 1 through 99';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "cart_items"
        GROUP BY "cart_id"
        HAVING count(*) > 50 OR sum("quantity") > 200
    ) THEN
        RAISE EXCEPTION 'Preflight failed: a cart exceeds its item or total quantity limit';
    END IF;

    IF EXISTS (
        SELECT 1 FROM "order_items"
        WHERE char_length(btrim("item_name")) = 0
           OR char_length("item_name") > 120
           OR "quantity" <= 0
           OR "unit_price" < 0
           OR "line_total" < 0
    ) THEN
        RAISE EXCEPTION 'Preflight failed: order_items contains an invalid snapshot or monetary value';
    END IF;

    IF EXISTS (
        SELECT 1 FROM "orders"
        WHERE "subtotal" < 0
           OR "expires_at" <> "created_at" + INTERVAL '15 minutes'
           OR NOT (
               ("fulfillment_type" = 'TAKEAWAY' AND "dining_table_id" IS NULL AND "dining_table_name" IS NULL)
               OR
               ("fulfillment_type" = 'DINE_IN' AND "dining_table_name" IS NOT NULL AND char_length(btrim("dining_table_name")) > 0)
           )
    ) THEN
        RAISE EXCEPTION 'Preflight failed: orders contains an invalid monetary, expiry, or table snapshot value';
    END IF;

    IF EXISTS (
        SELECT 1 FROM "idempotency_keys"
        WHERE "expires_at" <> "created_at" + INTERVAL '24 hours'
           OR "response_status" NOT BETWEEN 100 AND 599
    ) THEN
        RAISE EXCEPTION 'Preflight failed: idempotency_keys contains an invalid expiry or response status';
    END IF;
END $$;

-- Composite unique keys support tenant-consistent foreign keys.
CREATE UNIQUE INDEX "menu_categories_id_place_id_key" ON "menu_categories"("id", "place_id");
CREATE UNIQUE INDEX "menu_items_id_place_id_key" ON "menu_items"("id", "place_id");
CREATE UNIQUE INDEX "carts_id_place_id_key" ON "carts"("id", "place_id");

ALTER TABLE "menu_items" DROP CONSTRAINT "menu_items_category_id_fkey";
ALTER TABLE "menu_items"
    ADD CONSTRAINT "menu_items_category_id_place_id_fkey"
    FOREIGN KEY ("category_id", "place_id")
    REFERENCES "menu_categories"("id", "place_id")
    ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "menu_items" VALIDATE CONSTRAINT "menu_items_category_id_place_id_fkey";

ALTER TABLE "cart_items" DROP CONSTRAINT "cart_items_cart_id_fkey";
ALTER TABLE "cart_items" DROP CONSTRAINT "cart_items_menu_item_id_fkey";
ALTER TABLE "cart_items"
    ADD CONSTRAINT "cart_items_cart_id_place_id_fkey"
    FOREIGN KEY ("cart_id", "place_id")
    REFERENCES "carts"("id", "place_id")
    ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
ALTER TABLE "cart_items"
    ADD CONSTRAINT "cart_items_menu_item_id_place_id_fkey"
    FOREIGN KEY ("menu_item_id", "place_id")
    REFERENCES "menu_items"("id", "place_id")
    ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
ALTER TABLE "cart_items" VALIDATE CONSTRAINT "cart_items_cart_id_place_id_fkey";
ALTER TABLE "cart_items" VALIDATE CONSTRAINT "cart_items_menu_item_id_place_id_fkey";
ALTER TABLE "cart_items" ALTER COLUMN "place_id" SET NOT NULL;

-- Match Prisma's hardened snapshot type and database-generated lifetimes.
ALTER TABLE "order_items" ALTER COLUMN "item_name" TYPE VARCHAR(120);
ALTER TABLE "orders" ALTER COLUMN "expires_at" SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '15 minutes');
ALTER TABLE "idempotency_keys" ALTER COLUMN "expires_at" SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours');

-- Simple row-local invariants. NOT VALID minimizes the initial lock; validation is explicit.
ALTER TABLE "business_hours" ADD CONSTRAINT "business_hours_consistency_check" CHECK (
    ("is_closed" AND "opens_at" IS NULL AND "closes_at" IS NULL)
    OR
    (NOT "is_closed" AND "opens_at" IS NOT NULL AND "closes_at" IS NOT NULL AND "opens_at" <> "closes_at")
) NOT VALID;

ALTER TABLE "dining_tables" ADD CONSTRAINT "dining_tables_normalized_name_check" CHECK (
    char_length(btrim("name")) BETWEEN 1 AND 30
    AND "normalized_name" = lower(regexp_replace(btrim("name"), '[[:space:]]+', ' ', 'g'))
) NOT VALID;

ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_normalized_name_check" CHECK (
    char_length(btrim("name")) BETWEEN 1 AND 100
    AND "normalized_name" = lower(regexp_replace(btrim("name"), '[[:space:]]+', ' ', 'g'))
) NOT VALID;
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_sort_order_check" CHECK ("sort_order" >= 0) NOT VALID;

ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_name_check" CHECK (char_length(btrim("name")) BETWEEN 1 AND 120) NOT VALID;
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_price_check" CHECK ("price" >= 0) NOT VALID;
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_sort_order_check" CHECK ("sort_order" >= 0) NOT VALID;

ALTER TABLE "place_reviews" ADD CONSTRAINT "place_reviews_rating_check" CHECK ("rating" BETWEEN 1 AND 5) NOT VALID;
ALTER TABLE "menu_item_reviews" ADD CONSTRAINT "menu_item_reviews_rating_check" CHECK ("rating" BETWEEN 1 AND 5) NOT VALID;

ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_quantity_check" CHECK ("quantity" BETWEEN 1 AND 99) NOT VALID;

ALTER TABLE "order_items" ADD CONSTRAINT "order_items_name_check" CHECK (char_length(btrim("item_name")) BETWEEN 1 AND 120) NOT VALID;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_quantity_check" CHECK ("quantity" > 0) NOT VALID;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_unit_price_check" CHECK ("unit_price" >= 0) NOT VALID;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_line_total_check" CHECK ("line_total" >= 0) NOT VALID;

ALTER TABLE "orders" ADD CONSTRAINT "orders_subtotal_check" CHECK ("subtotal" >= 0) NOT VALID;
ALTER TABLE "orders" ADD CONSTRAINT "orders_fulfillment_table_snapshot_check" CHECK (
    ("fulfillment_type" = 'TAKEAWAY' AND "dining_table_id" IS NULL AND "dining_table_name" IS NULL)
    OR
    ("fulfillment_type" = 'DINE_IN' AND "dining_table_name" IS NOT NULL AND char_length(btrim("dining_table_name")) > 0)
) NOT VALID;
ALTER TABLE "orders" ADD CONSTRAINT "orders_expiry_check" CHECK ("expires_at" = "created_at" + INTERVAL '15 minutes') NOT VALID;

ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_expiry_check" CHECK ("expires_at" = "created_at" + INTERVAL '24 hours') NOT VALID;
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_response_status_check" CHECK ("response_status" BETWEEN 100 AND 599) NOT VALID;

ALTER TABLE "business_hours" VALIDATE CONSTRAINT "business_hours_consistency_check";
ALTER TABLE "dining_tables" VALIDATE CONSTRAINT "dining_tables_normalized_name_check";
ALTER TABLE "menu_categories" VALIDATE CONSTRAINT "menu_categories_normalized_name_check";
ALTER TABLE "menu_categories" VALIDATE CONSTRAINT "menu_categories_sort_order_check";
ALTER TABLE "menu_items" VALIDATE CONSTRAINT "menu_items_name_check";
ALTER TABLE "menu_items" VALIDATE CONSTRAINT "menu_items_price_check";
ALTER TABLE "menu_items" VALIDATE CONSTRAINT "menu_items_sort_order_check";
ALTER TABLE "place_reviews" VALIDATE CONSTRAINT "place_reviews_rating_check";
ALTER TABLE "menu_item_reviews" VALIDATE CONSTRAINT "menu_item_reviews_rating_check";
ALTER TABLE "cart_items" VALIDATE CONSTRAINT "cart_items_quantity_check";
ALTER TABLE "order_items" VALIDATE CONSTRAINT "order_items_name_check";
ALTER TABLE "order_items" VALIDATE CONSTRAINT "order_items_quantity_check";
ALTER TABLE "order_items" VALIDATE CONSTRAINT "order_items_unit_price_check";
ALTER TABLE "order_items" VALIDATE CONSTRAINT "order_items_line_total_check";
ALTER TABLE "orders" VALIDATE CONSTRAINT "orders_subtotal_check";
ALTER TABLE "orders" VALIDATE CONSTRAINT "orders_fulfillment_table_snapshot_check";
ALTER TABLE "orders" VALIDATE CONSTRAINT "orders_expiry_check";
ALTER TABLE "idempotency_keys" VALIDATE CONSTRAINT "idempotency_keys_expiry_check";
ALTER TABLE "idempotency_keys" VALIDATE CONSTRAINT "idempotency_keys_response_status_check";

-- Serialize writes per cart before evaluating aggregate limits.
CREATE FUNCTION "enforce_cart_item_limits"() RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    target_item_count BIGINT;
    target_quantity_total BIGINT;
BEGIN
    IF TG_OP = 'UPDATE' AND OLD."cart_id" <> NEW."cart_id" THEN
        PERFORM 1
        FROM "carts"
        WHERE "id" IN (OLD."cart_id", NEW."cart_id")
        ORDER BY "id"
        FOR UPDATE;
    ELSE
        PERFORM 1 FROM "carts" WHERE "id" = NEW."cart_id" FOR UPDATE;
    END IF;

    SELECT count(*), COALESCE(sum("quantity"), 0)
    INTO target_item_count, target_quantity_total
    FROM "cart_items"
    WHERE "cart_id" = NEW."cart_id"
      AND "id" <> NEW."id";

    IF target_item_count + 1 > 50 THEN
        RAISE EXCEPTION 'A cart cannot contain more than 50 distinct menu items'
            USING ERRCODE = '23514', CONSTRAINT = 'cart_items_distinct_limit_check';
    END IF;

    IF target_quantity_total + NEW."quantity" > 200 THEN
        RAISE EXCEPTION 'A cart cannot contain a total quantity greater than 200'
            USING ERRCODE = '23514', CONSTRAINT = 'cart_items_total_quantity_check';
    END IF;

    RETURN NEW;
END $$;

CREATE TRIGGER "cart_items_limits_trigger"
BEFORE INSERT OR UPDATE OF "cart_id", "quantity" ON "cart_items"
FOR EACH ROW EXECUTE FUNCTION "enforce_cart_item_limits"();

-- Retention and public-menu query indexes represented in the Prisma schema.
DROP INDEX "users_deletion_requested_at_idx";
CREATE INDEX "users_anonymized_at_deletion_requested_at_idx" ON "users"("anonymized_at", "deletion_requested_at");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at");

DROP INDEX "menu_items_place_id_type_is_available_deleted_at_idx";
DROP INDEX "menu_items_category_id_is_available_deleted_at_idx";
CREATE INDEX "menu_items_place_id_type_is_available_deleted_at_sort_order_idx"
    ON "menu_items"("place_id", "type", "is_available", "deleted_at", "sort_order");
CREATE INDEX "menu_items_category_id_is_available_deleted_at_sort_order_idx"
    ON "menu_items"("category_id", "is_available", "deleted_at", "sort_order");

COMMIT;
