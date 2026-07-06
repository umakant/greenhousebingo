-- LMS core models (organization_id → users.id)

DO $$ BEGIN
  CREATE TYPE "LmsDeliveryType" AS ENUM ('VIDEO', 'TEXT', 'LIVE_CLASS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LmsCourseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'SCHEDULED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LmsEnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'SUSPENDED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "lms_course_categories" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    CONSTRAINT "lms_course_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "lms_course_tags" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    CONSTRAINT "lms_course_tags_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "lms_instructor_profiles" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "display_name" VARCHAR(255),
    "headline" VARCHAR(512),
    "bio" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    CONSTRAINT "lms_instructor_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "lms_courses" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "category_id" BIGINT,
    "title" VARCHAR(512) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "delivery_type" "LmsDeliveryType" NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "capacity" INTEGER,
    "access_starts_at" TIMESTAMP(3),
    "access_ends_at" TIMESTAMP(3),
    "status" "LmsCourseStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    CONSTRAINT "lms_courses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "lms_course_sections" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "course_id" BIGINT NOT NULL,
    "title" VARCHAR(512) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    CONSTRAINT "lms_course_sections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "lms_course_lessons" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "course_id" BIGINT NOT NULL,
    "section_id" BIGINT NOT NULL,
    "title" VARCHAR(512) NOT NULL,
    "lesson_type" "LmsDeliveryType" NOT NULL,
    "body_text" TEXT,
    "video_url" VARCHAR(2048),
    "video_metadata" JSONB,
    "live_starts_at" TIMESTAMP(3),
    "live_ends_at" TIMESTAMP(3),
    "external_live_url" VARCHAR(2048),
    "duration_seconds" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    CONSTRAINT "lms_course_lessons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "lms_enrollments" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "course_id" BIGINT NOT NULL,
    "student_user_id" BIGINT NOT NULL,
    "instructor_user_id" BIGINT,
    "status" "LmsEnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "access_starts_at" TIMESTAMP(3),
    "access_ends_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    CONSTRAINT "lms_enrollments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "lms_course_instructors" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "course_id" BIGINT NOT NULL,
    "instructor_profile_id" BIGINT NOT NULL,
    "role" VARCHAR(64),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lms_course_instructors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "lms_course_tag_on_course" (
    "organization_id" BIGINT NOT NULL,
    "course_id" BIGINT NOT NULL,
    "tag_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lms_course_tag_on_course_pkey" PRIMARY KEY ("course_id", "tag_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "lms_course_categories_organization_id_slug_key" ON "lms_course_categories"("organization_id", "slug");
CREATE INDEX IF NOT EXISTS "lms_course_categories_organization_id_sort_order_idx" ON "lms_course_categories"("organization_id", "sort_order");

CREATE UNIQUE INDEX IF NOT EXISTS "lms_course_tags_organization_id_slug_key" ON "lms_course_tags"("organization_id", "slug");
CREATE INDEX IF NOT EXISTS "lms_course_tags_organization_id_idx" ON "lms_course_tags"("organization_id");

CREATE UNIQUE INDEX IF NOT EXISTS "lms_instructor_profiles_organization_id_user_id_key" ON "lms_instructor_profiles"("organization_id", "user_id");
CREATE INDEX IF NOT EXISTS "lms_instructor_profiles_organization_id_is_active_idx" ON "lms_instructor_profiles"("organization_id", "is_active");

CREATE UNIQUE INDEX IF NOT EXISTS "lms_courses_organization_id_slug_key" ON "lms_courses"("organization_id", "slug");
CREATE INDEX IF NOT EXISTS "lms_courses_organization_id_status_idx" ON "lms_courses"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "lms_courses_organization_id_is_public_idx" ON "lms_courses"("organization_id", "is_public");
CREATE INDEX IF NOT EXISTS "lms_courses_category_id_idx" ON "lms_courses"("category_id");

CREATE INDEX IF NOT EXISTS "lms_course_sections_organization_id_idx" ON "lms_course_sections"("organization_id");
CREATE INDEX IF NOT EXISTS "lms_course_sections_course_id_sort_order_idx" ON "lms_course_sections"("course_id", "sort_order");

CREATE INDEX IF NOT EXISTS "lms_course_lessons_organization_id_idx" ON "lms_course_lessons"("organization_id");
CREATE INDEX IF NOT EXISTS "lms_course_lessons_course_id_idx" ON "lms_course_lessons"("course_id");
CREATE INDEX IF NOT EXISTS "lms_course_lessons_section_id_sort_order_idx" ON "lms_course_lessons"("section_id", "sort_order");

CREATE UNIQUE INDEX IF NOT EXISTS "lms_enrollments_course_id_student_user_id_key" ON "lms_enrollments"("course_id", "student_user_id");
CREATE INDEX IF NOT EXISTS "lms_enrollments_organization_id_idx" ON "lms_enrollments"("organization_id");
CREATE INDEX IF NOT EXISTS "lms_enrollments_organization_id_status_idx" ON "lms_enrollments"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "lms_enrollments_student_user_id_idx" ON "lms_enrollments"("student_user_id");
CREATE INDEX IF NOT EXISTS "lms_enrollments_instructor_user_id_idx" ON "lms_enrollments"("instructor_user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "lms_course_instructors_course_id_instructor_profile_id_key" ON "lms_course_instructors"("course_id", "instructor_profile_id");
CREATE INDEX IF NOT EXISTS "lms_course_instructors_organization_id_idx" ON "lms_course_instructors"("organization_id");
CREATE INDEX IF NOT EXISTS "lms_course_instructors_instructor_profile_id_idx" ON "lms_course_instructors"("instructor_profile_id");

CREATE INDEX IF NOT EXISTS "lms_course_tag_on_course_organization_id_idx" ON "lms_course_tag_on_course"("organization_id");
CREATE INDEX IF NOT EXISTS "lms_course_tag_on_course_tag_id_idx" ON "lms_course_tag_on_course"("tag_id");

DO $$ BEGIN
  ALTER TABLE "lms_course_categories" ADD CONSTRAINT "lms_course_categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "lms_course_tags" ADD CONSTRAINT "lms_course_tags_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "lms_instructor_profiles" ADD CONSTRAINT "lms_instructor_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "lms_instructor_profiles" ADD CONSTRAINT "lms_instructor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "lms_courses" ADD CONSTRAINT "lms_courses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "lms_courses" ADD CONSTRAINT "lms_courses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "lms_course_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "lms_courses" ADD CONSTRAINT "lms_courses_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "lms_courses" ADD CONSTRAINT "lms_courses_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "lms_course_sections" ADD CONSTRAINT "lms_course_sections_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "lms_course_sections" ADD CONSTRAINT "lms_course_sections_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "lms_course_lessons" ADD CONSTRAINT "lms_course_lessons_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "lms_course_lessons" ADD CONSTRAINT "lms_course_lessons_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "lms_course_lessons" ADD CONSTRAINT "lms_course_lessons_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "lms_course_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "lms_enrollments" ADD CONSTRAINT "lms_enrollments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "lms_enrollments" ADD CONSTRAINT "lms_enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "lms_enrollments" ADD CONSTRAINT "lms_enrollments_student_user_id_fkey" FOREIGN KEY ("student_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "lms_enrollments" ADD CONSTRAINT "lms_enrollments_instructor_user_id_fkey" FOREIGN KEY ("instructor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "lms_course_instructors" ADD CONSTRAINT "lms_course_instructors_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "lms_course_instructors" ADD CONSTRAINT "lms_course_instructors_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "lms_course_instructors" ADD CONSTRAINT "lms_course_instructors_instructor_profile_id_fkey" FOREIGN KEY ("instructor_profile_id") REFERENCES "lms_instructor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "lms_course_tag_on_course" ADD CONSTRAINT "lms_course_tag_on_course_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "lms_course_tag_on_course" ADD CONSTRAINT "lms_course_tag_on_course_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "lms_course_tag_on_course" ADD CONSTRAINT "lms_course_tag_on_course_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "lms_course_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
