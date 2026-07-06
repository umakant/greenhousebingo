-- Google Calendar integration for LMS live sessions

ALTER TABLE "lms_live_sessions" ADD COLUMN IF NOT EXISTS "google_calendar_event_id" VARCHAR(256);

CREATE TABLE IF NOT EXISTS "user_google_calendar_connections" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "google_email" VARCHAR(320),
    "refresh_token" TEXT NOT NULL,
    "access_token" TEXT,
    "access_token_expires_at" TIMESTAMP(3),
    "calendar_id" VARCHAR(256) NOT NULL DEFAULT 'primary',
    "sync_live_sessions" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "user_google_calendar_connections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_google_calendar_connections_user_id_key" ON "user_google_calendar_connections"("user_id");
CREATE INDEX IF NOT EXISTS "user_google_calendar_connections_organization_id_idx" ON "user_google_calendar_connections"("organization_id");

CREATE TABLE IF NOT EXISTS "lms_user_calendar_event_links" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "session_id" BIGINT NOT NULL,
    "google_event_id" VARCHAR(256) NOT NULL,
    "google_calendar_id" VARCHAR(256) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "lms_user_calendar_event_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "lms_user_calendar_event_links_user_id_session_id_key" ON "lms_user_calendar_event_links"("user_id", "session_id");
CREATE INDEX IF NOT EXISTS "lms_user_calendar_event_links_session_id_idx" ON "lms_user_calendar_event_links"("session_id");

ALTER TABLE "user_google_calendar_connections" DROP CONSTRAINT IF EXISTS "user_google_calendar_connections_user_id_fkey";
ALTER TABLE "user_google_calendar_connections" ADD CONSTRAINT "user_google_calendar_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_google_calendar_connections" DROP CONSTRAINT IF EXISTS "user_google_calendar_connections_organization_id_fkey";
ALTER TABLE "user_google_calendar_connections" ADD CONSTRAINT "user_google_calendar_connections_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lms_user_calendar_event_links" DROP CONSTRAINT IF EXISTS "lms_user_calendar_event_links_user_id_fkey";
ALTER TABLE "lms_user_calendar_event_links" ADD CONSTRAINT "lms_user_calendar_event_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lms_user_calendar_event_links" DROP CONSTRAINT IF EXISTS "lms_user_calendar_event_links_session_id_fkey";
ALTER TABLE "lms_user_calendar_event_links" ADD CONSTRAINT "lms_user_calendar_event_links_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "lms_live_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
