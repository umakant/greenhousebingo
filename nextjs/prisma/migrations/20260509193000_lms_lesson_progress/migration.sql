-- LMS per-enrollment lesson progress (student dashboard)

CREATE TABLE IF NOT EXISTS "lms_lesson_progress" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "enrollment_id" BIGINT NOT NULL,
    "lesson_id" BIGINT NOT NULL,
    "completed_at" TIMESTAMP(3),
    "last_engaged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    CONSTRAINT "lms_lesson_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "lms_lesson_progress_enrollment_id_lesson_id_key" ON "lms_lesson_progress"("enrollment_id", "lesson_id");

CREATE INDEX IF NOT EXISTS "lms_lesson_progress_organization_id_idx" ON "lms_lesson_progress"("organization_id");
CREATE INDEX IF NOT EXISTS "lms_lesson_progress_enrollment_id_idx" ON "lms_lesson_progress"("enrollment_id");
CREATE INDEX IF NOT EXISTS "lms_lesson_progress_lesson_id_idx" ON "lms_lesson_progress"("lesson_id");

DO $$ BEGIN
  ALTER TABLE "lms_lesson_progress" ADD CONSTRAINT "lms_lesson_progress_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "lms_lesson_progress" ADD CONSTRAINT "lms_lesson_progress_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "lms_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "lms_lesson_progress" ADD CONSTRAINT "lms_lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lms_course_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
