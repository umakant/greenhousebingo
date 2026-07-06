-- HRM dashboard / module tables (match Prisma HrmAnnouncement, HrmEvent, HrmAcknowledgment).
-- Safe when tables are missing (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS "hrm_announcements" (
    "id" BIGSERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    CONSTRAINT "hrm_announcements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "hrm_announcements_created_by_idx" ON "hrm_announcements"("created_by");

CREATE TABLE IF NOT EXISTS "hrm_events" (
    "id" BIGSERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3),
    "location" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    CONSTRAINT "hrm_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "hrm_events_created_by_idx" ON "hrm_events"("created_by");
CREATE INDEX IF NOT EXISTS "hrm_events_start_at_idx" ON "hrm_events"("start_at");

CREATE TABLE IF NOT EXISTS "hrm_acknowledgments" (
    "id" BIGSERIAL NOT NULL,
    "employee_id" BIGINT NOT NULL,
    "policy_title" TEXT NOT NULL,
    "acknowledged_at" DATE NOT NULL,
    "notes" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    CONSTRAINT "hrm_acknowledgments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "hrm_acknowledgments_employee_id_idx" ON "hrm_acknowledgments"("employee_id");
CREATE INDEX IF NOT EXISTS "hrm_acknowledgments_created_by_idx" ON "hrm_acknowledgments"("created_by");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hrm_acknowledgments_employee_id_fkey'
  ) THEN
    ALTER TABLE "hrm_acknowledgments"
      ADD CONSTRAINT "hrm_acknowledgments_employee_id_fkey"
      FOREIGN KEY ("employee_id") REFERENCES "hrm_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;
