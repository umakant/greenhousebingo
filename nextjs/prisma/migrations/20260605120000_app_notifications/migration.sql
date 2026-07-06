CREATE TABLE IF NOT EXISTS "app_notifications" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "organization_id" BIGINT,
    "module" VARCHAR(64),
    "type" VARCHAR(64),
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT,
    "link" VARCHAR(512),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "app_notifications_user_id_read_at_idx"
    ON "app_notifications"("user_id", "read_at");

CREATE INDEX IF NOT EXISTS "app_notifications_user_id_created_at_idx"
    ON "app_notifications"("user_id", "created_at");

DO $$ BEGIN
  ALTER TABLE "app_notifications"
    ADD CONSTRAINT "app_notifications_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
