CREATE TYPE "AuditActorType" AS ENUM ('USER', 'SYSTEM');

ALTER TABLE "audit_logs"
    ADD COLUMN "actor_type" "AuditActorType" NOT NULL DEFAULT 'USER',
    ADD COLUMN "system_actor" VARCHAR(100),
    ALTER COLUMN "actor_user_id" DROP NOT NULL;

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_check" CHECK (
    ("actor_type" = 'USER' AND "actor_user_id" IS NOT NULL AND "system_actor" IS NULL)
    OR
    ("actor_type" = 'SYSTEM' AND "actor_user_id" IS NULL AND "system_actor" IS NOT NULL
      AND char_length(btrim("system_actor")) BETWEEN 1 AND 100)
);

CREATE INDEX "audit_logs_actor_type_system_actor_created_at_idx"
    ON "audit_logs"("actor_type", "system_actor", "created_at");
