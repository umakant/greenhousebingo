-- LMS live sessions and attendance

CREATE TYPE "LmsLiveMeetingProvider" AS ENUM ('ZOOM', 'GOOGLE_MEET', 'MICROSOFT_TEAMS', 'OTHER');
CREATE TYPE "LmsLiveSessionStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "LmsLiveAttendanceStatus" AS ENUM ('REGISTERED', 'ATTENDED', 'ABSENT');

CREATE TABLE "lms_live_sessions" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "course_id" BIGINT NOT NULL,
    "course_lesson_id" BIGINT,
    "title" VARCHAR(512) NOT NULL,
    "description" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "meeting_provider" "LmsLiveMeetingProvider" NOT NULL DEFAULT 'OTHER',
    "meeting_url" VARCHAR(2048),
    "capacity" INTEGER,
    "status" "LmsLiveSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "created_by_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "lms_live_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lms_live_attendance" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "session_id" BIGINT NOT NULL,
    "enrollment_id" BIGINT NOT NULL,
    "status" "LmsLiveAttendanceStatus" NOT NULL DEFAULT 'REGISTERED',
    "joined_at" TIMESTAMP(3),
    "marked_at" TIMESTAMP(3),
    "marked_by_id" BIGINT,
    "notes" VARCHAR(512),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "lms_live_attendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lms_live_attendance_session_id_enrollment_id_key" ON "lms_live_attendance"("session_id", "enrollment_id");
CREATE INDEX "lms_live_sessions_organization_id_starts_at_idx" ON "lms_live_sessions"("organization_id", "starts_at");
CREATE INDEX "lms_live_sessions_course_id_starts_at_idx" ON "lms_live_sessions"("course_id", "starts_at");
CREATE INDEX "lms_live_sessions_course_lesson_id_idx" ON "lms_live_sessions"("course_lesson_id");
CREATE INDEX "lms_live_attendance_organization_id_idx" ON "lms_live_attendance"("organization_id");
CREATE INDEX "lms_live_attendance_session_id_status_idx" ON "lms_live_attendance"("session_id", "status");
CREATE INDEX "lms_live_attendance_enrollment_id_idx" ON "lms_live_attendance"("enrollment_id");

ALTER TABLE "lms_live_sessions" ADD CONSTRAINT "lms_live_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lms_live_sessions" ADD CONSTRAINT "lms_live_sessions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lms_live_sessions" ADD CONSTRAINT "lms_live_sessions_course_lesson_id_fkey" FOREIGN KEY ("course_lesson_id") REFERENCES "lms_course_lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lms_live_sessions" ADD CONSTRAINT "lms_live_sessions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "lms_live_attendance" ADD CONSTRAINT "lms_live_attendance_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lms_live_attendance" ADD CONSTRAINT "lms_live_attendance_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "lms_live_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lms_live_attendance" ADD CONSTRAINT "lms_live_attendance_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "lms_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lms_live_attendance" ADD CONSTRAINT "lms_live_attendance_marked_by_id_fkey" FOREIGN KEY ("marked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
