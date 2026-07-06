-- Align public.hrm_employees with Prisma HrmEmployee when columns are missing (legacy DB / import).
-- Idempotent. Does not drop columns.

ALTER TABLE "hrm_employees" ADD COLUMN IF NOT EXISTS "employee_id" TEXT;
ALTER TABLE "hrm_employees" ADD COLUMN IF NOT EXISTS "first_name" TEXT;
ALTER TABLE "hrm_employees" ADD COLUMN IF NOT EXISTS "last_name" TEXT;
ALTER TABLE "hrm_employees" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "hrm_employees" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "hrm_employees" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "hrm_employees" ADD COLUMN IF NOT EXISTS "date_of_birth" DATE;
ALTER TABLE "hrm_employees" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "hrm_employees" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "hrm_employees" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "hrm_employees" ADD COLUMN IF NOT EXISTS "department_id" BIGINT;
ALTER TABLE "hrm_employees" ADD COLUMN IF NOT EXISTS "designation_id" BIGINT;
ALTER TABLE "hrm_employees" ADD COLUMN IF NOT EXISTS "branch_id" BIGINT;
ALTER TABLE "hrm_employees" ADD COLUMN IF NOT EXISTS "shift_id" BIGINT;
ALTER TABLE "hrm_employees" ADD COLUMN IF NOT EXISTS "manager_id" BIGINT;
ALTER TABLE "hrm_employees" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE "hrm_employees" ADD COLUMN IF NOT EXISTS "employee_type" TEXT;
ALTER TABLE "hrm_employees" ADD COLUMN IF NOT EXISTS "work_type" TEXT;
ALTER TABLE "hrm_employees" ADD COLUMN IF NOT EXISTS "joining_date" DATE;
ALTER TABLE "hrm_employees" ADD COLUMN IF NOT EXISTS "leaving_date" DATE;
ALTER TABLE "hrm_employees" ADD COLUMN IF NOT EXISTS "basic_salary" DECIMAL(15, 2);
ALTER TABLE "hrm_employees" ADD COLUMN IF NOT EXISTS "bank_name" TEXT;
ALTER TABLE "hrm_employees" ADD COLUMN IF NOT EXISTS "bank_account_number" TEXT;
ALTER TABLE "hrm_employees" ADD COLUMN IF NOT EXISTS "bank_branch_code" TEXT;
ALTER TABLE "hrm_employees" ADD COLUMN IF NOT EXISTS "emergency_name" TEXT;
ALTER TABLE "hrm_employees" ADD COLUMN IF NOT EXISTS "emergency_phone" TEXT;
ALTER TABLE "hrm_employees" ADD COLUMN IF NOT EXISTS "profile_photo" TEXT;
ALTER TABLE "hrm_employees" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "hrm_employees" ADD COLUMN IF NOT EXISTS "user_id" BIGINT;
ALTER TABLE "hrm_employees" ADD COLUMN IF NOT EXISTS "created_by" BIGINT;
ALTER TABLE "hrm_employees" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "hrm_employees" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);

UPDATE "hrm_employees"
SET "first_name" = COALESCE(NULLIF(trim("first_name"), ''), 'Unknown')
WHERE "first_name" IS NULL OR trim(coalesce("first_name", '')) = '';

UPDATE "hrm_employees" SET "status" = 'active' WHERE "status" IS NULL OR trim(coalesce("status", '')) = '';

ALTER TABLE "hrm_employees" ALTER COLUMN "first_name" SET NOT NULL;
ALTER TABLE "hrm_employees" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "hrm_employees" ALTER COLUMN "status" SET DEFAULT 'active';

CREATE UNIQUE INDEX IF NOT EXISTS "hrm_employees_user_id_key" ON "hrm_employees" ("user_id");
