-- LMS instructor profile: avatar + expertise

ALTER TABLE "lms_instructor_profiles" ADD COLUMN IF NOT EXISTS "avatar_url" VARCHAR(2048);
ALTER TABLE "lms_instructor_profiles" ADD COLUMN IF NOT EXISTS "expertise" JSONB;
