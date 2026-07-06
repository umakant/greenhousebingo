CREATE TABLE IF NOT EXISTS "em_notification_logs" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "template_key" VARCHAR(128) NOT NULL,
    "channel" VARCHAR(16) NOT NULL,
    "user_id" BIGINT,
    "reference_type" VARCHAR(64) NOT NULL,
    "reference_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "em_notification_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "em_notification_logs_dedupe_key"
    ON "em_notification_logs"("template_key", "channel", "reference_type", "reference_id", "user_id");

CREATE INDEX IF NOT EXISTS "em_notification_logs_organization_id_template_key_idx"
    ON "em_notification_logs"("organization_id", "template_key");

DO $$ BEGIN
  ALTER TABLE "em_notification_logs"
    ADD CONSTRAINT "em_notification_logs_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
