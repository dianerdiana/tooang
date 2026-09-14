CREATE TABLE "auth_rate_limit_buckets" (
    "source_hash" VARCHAR(64) NOT NULL,
    "policy" VARCHAR(50) NOT NULL,
    "window_started_at" TIMESTAMP(3) NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_rate_limit_buckets_pkey" PRIMARY KEY ("source_hash", "policy")
);

CREATE INDEX "auth_rate_limit_buckets_expires_at_idx"
ON "auth_rate_limit_buckets"("expires_at");
