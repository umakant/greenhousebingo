-- LMS course reviews (rating, text, moderation)

CREATE TYPE "LmsCourseReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE IF NOT EXISTS "lms_course_reviews" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "course_id" BIGINT NOT NULL,
    "student_user_id" BIGINT NOT NULL,
    "enrollment_id" BIGINT,
    "rating" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "status" "LmsCourseReviewStatus" NOT NULL DEFAULT 'PENDING',
    "moderated_by_id" BIGINT,
    "moderated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "lms_course_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "lms_course_reviews_course_id_student_user_id_key"
    ON "lms_course_reviews"("course_id", "student_user_id");
CREATE INDEX IF NOT EXISTS "lms_course_reviews_organization_id_course_id_status_idx"
    ON "lms_course_reviews"("organization_id", "course_id", "status");
CREATE INDEX IF NOT EXISTS "lms_course_reviews_student_user_id_idx"
    ON "lms_course_reviews"("student_user_id");

ALTER TABLE "lms_course_reviews" DROP CONSTRAINT IF EXISTS "lms_course_reviews_organization_id_fkey";
ALTER TABLE "lms_course_reviews" ADD CONSTRAINT "lms_course_reviews_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lms_course_reviews" DROP CONSTRAINT IF EXISTS "lms_course_reviews_course_id_fkey";
ALTER TABLE "lms_course_reviews" ADD CONSTRAINT "lms_course_reviews_course_id_fkey"
    FOREIGN KEY ("course_id") REFERENCES "lms_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lms_course_reviews" DROP CONSTRAINT IF EXISTS "lms_course_reviews_student_user_id_fkey";
ALTER TABLE "lms_course_reviews" ADD CONSTRAINT "lms_course_reviews_student_user_id_fkey"
    FOREIGN KEY ("student_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lms_course_reviews" DROP CONSTRAINT IF EXISTS "lms_course_reviews_enrollment_id_fkey";
ALTER TABLE "lms_course_reviews" ADD CONSTRAINT "lms_course_reviews_enrollment_id_fkey"
    FOREIGN KEY ("enrollment_id") REFERENCES "lms_enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lms_course_reviews" DROP CONSTRAINT IF EXISTS "lms_course_reviews_moderated_by_id_fkey";
ALTER TABLE "lms_course_reviews" ADD CONSTRAINT "lms_course_reviews_moderated_by_id_fkey"
    FOREIGN KEY ("moderated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
