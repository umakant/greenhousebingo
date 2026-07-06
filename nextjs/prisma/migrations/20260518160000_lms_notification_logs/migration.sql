CREATE TABLE IF NOT EXISTS "lms_notification_logs" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "template_key" VARCHAR(128) NOT NULL,
    "channel" VARCHAR(16) NOT NULL,
    "user_id" BIGINT,
    "reference_type" VARCHAR(64) NOT NULL,
    "reference_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_notification_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "lms_notification_logs_dedupe_key" ON "lms_notification_logs"("template_key", "channel", "reference_type", "reference_id", "user_id");
CREATE INDEX IF NOT EXISTS "lms_notification_logs_organization_id_template_key_idx" ON "lms_notification_logs"("organization_id", "template_key");

ALTER TABLE "lms_notification_logs" DROP CONSTRAINT IF EXISTS "lms_notification_logs_organization_id_fkey";
ALTER TABLE "lms_notification_logs" ADD CONSTRAINT "lms_notification_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
