-- Keep creation and expiry defaults database-generated from the same
-- transaction timestamp. The zero interval prevents Prisma from treating the
-- creation default as a client-generated @default(now()), which can differ by
-- milliseconds and violate the exact-expiry check constraints.

ALTER TABLE "orders"
  ALTER COLUMN "created_at" SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '0 seconds');

ALTER TABLE "idempotency_keys"
  ALTER COLUMN "created_at" SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '0 seconds');
