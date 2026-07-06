-- LMS instructor commission rates, course revenue, accruals, payout placeholder

CREATE TYPE "LmsCourseRevenueSource" AS ENUM ('STOREFRONT_ORDER', 'SUBSCRIPTION_ORDER', 'MANUAL');
CREATE TYPE "LmsInstructorCommissionStatus" AS ENUM ('ACCRUED', 'PAYOUT_PENDING', 'PAID');
CREATE TYPE "LmsInstructorPayoutStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PAID', 'CANCELLED');

ALTER TABLE "lms_instructor_profiles" ADD COLUMN IF NOT EXISTS "commission_percent" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "lms_course_instructors" ADD COLUMN IF NOT EXISTS "commission_percent" DECIMAL(5,2);

CREATE TABLE IF NOT EXISTS "lms_course_revenue_records" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "course_id" BIGINT NOT NULL,
    "source" "LmsCourseRevenueSource" NOT NULL,
    "gross_amount" DECIMAL(15,4) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "storefront_order_id" BIGINT,
    "enrollment_id" BIGINT,
    "accounting_revenue_id" BIGINT,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lms_course_revenue_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "lms_instructor_commissions" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "instructor_profile_id" BIGINT NOT NULL,
    "course_id" BIGINT NOT NULL,
    "revenue_record_id" BIGINT NOT NULL,
    "commission_percent" DECIMAL(5,2) NOT NULL,
    "commission_amount" DECIMAL(15,4) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "status" "LmsInstructorCommissionStatus" NOT NULL DEFAULT 'ACCRUED',
    "accounting_expense_id" BIGINT,
    "payout_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    CONSTRAINT "lms_instructor_commissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "lms_instructor_payouts" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "instructor_profile_id" BIGINT NOT NULL,
    "total_amount" DECIMAL(15,4) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "status" "LmsInstructorPayoutStatus" NOT NULL DEFAULT 'DRAFT',
    "period_start" TIMESTAMP(3),
    "period_end" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "notes" TEXT,
    "accounting_expense_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    CONSTRAINT "lms_instructor_payouts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "lms_course_revenue_records_storefront_order_id_course_id_key"
    ON "lms_course_revenue_records"("storefront_order_id", "course_id");
CREATE INDEX IF NOT EXISTS "lms_course_revenue_records_organization_id_course_id_idx"
    ON "lms_course_revenue_records"("organization_id", "course_id");
CREATE INDEX IF NOT EXISTS "lms_course_revenue_records_recorded_at_idx"
    ON "lms_course_revenue_records"("recorded_at");

CREATE INDEX IF NOT EXISTS "lms_instructor_commissions_organization_id_instructor_profile_id_status_idx"
    ON "lms_instructor_commissions"("organization_id", "instructor_profile_id", "status");
CREATE INDEX IF NOT EXISTS "lms_instructor_commissions_course_id_idx" ON "lms_instructor_commissions"("course_id");
CREATE INDEX IF NOT EXISTS "lms_instructor_commissions_revenue_record_id_idx" ON "lms_instructor_commissions"("revenue_record_id");
CREATE INDEX IF NOT EXISTS "lms_instructor_commissions_payout_id_idx" ON "lms_instructor_commissions"("payout_id");

CREATE INDEX IF NOT EXISTS "lms_instructor_payouts_organization_id_instructor_profile_id_status_idx"
    ON "lms_instructor_payouts"("organization_id", "instructor_profile_id", "status");

ALTER TABLE "lms_course_revenue_records" DROP CONSTRAINT IF EXISTS "lms_course_revenue_records_organization_id_fkey";
ALTER TABLE "lms_course_revenue_records" ADD CONSTRAINT "lms_course_revenue_records_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lms_course_revenue_records" DROP CONSTRAINT IF EXISTS "lms_course_revenue_records_course_id_fkey";
ALTER TABLE "lms_course_revenue_records" ADD CONSTRAINT "lms_course_revenue_records_course_id_fkey"
    FOREIGN KEY ("course_id") REFERENCES "lms_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lms_course_revenue_records" DROP CONSTRAINT IF EXISTS "lms_course_revenue_records_storefront_order_id_fkey";
ALTER TABLE "lms_course_revenue_records" ADD CONSTRAINT "lms_course_revenue_records_storefront_order_id_fkey"
    FOREIGN KEY ("storefront_order_id") REFERENCES "storefront_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lms_course_revenue_records" DROP CONSTRAINT IF EXISTS "lms_course_revenue_records_enrollment_id_fkey";
ALTER TABLE "lms_course_revenue_records" ADD CONSTRAINT "lms_course_revenue_records_enrollment_id_fkey"
    FOREIGN KEY ("enrollment_id") REFERENCES "lms_enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "lms_instructor_commissions" DROP CONSTRAINT IF EXISTS "lms_instructor_commissions_organization_id_fkey";
ALTER TABLE "lms_instructor_commissions" ADD CONSTRAINT "lms_instructor_commissions_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lms_instructor_commissions" DROP CONSTRAINT IF EXISTS "lms_instructor_commissions_instructor_profile_id_fkey";
ALTER TABLE "lms_instructor_commissions" ADD CONSTRAINT "lms_instructor_commissions_instructor_profile_id_fkey"
    FOREIGN KEY ("instructor_profile_id") REFERENCES "lms_instructor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lms_instructor_commissions" DROP CONSTRAINT IF EXISTS "lms_instructor_commissions_course_id_fkey";
ALTER TABLE "lms_instructor_commissions" ADD CONSTRAINT "lms_instructor_commissions_course_id_fkey"
    FOREIGN KEY ("course_id") REFERENCES "lms_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lms_instructor_commissions" DROP CONSTRAINT IF EXISTS "lms_instructor_commissions_revenue_record_id_fkey";
ALTER TABLE "lms_instructor_commissions" ADD CONSTRAINT "lms_instructor_commissions_revenue_record_id_fkey"
    FOREIGN KEY ("revenue_record_id") REFERENCES "lms_course_revenue_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lms_instructor_commissions" DROP CONSTRAINT IF EXISTS "lms_instructor_commissions_payout_id_fkey";
ALTER TABLE "lms_instructor_commissions" ADD CONSTRAINT "lms_instructor_commissions_payout_id_fkey"
    FOREIGN KEY ("payout_id") REFERENCES "lms_instructor_payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "lms_instructor_payouts" DROP CONSTRAINT IF EXISTS "lms_instructor_payouts_organization_id_fkey";
ALTER TABLE "lms_instructor_payouts" ADD CONSTRAINT "lms_instructor_payouts_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lms_instructor_payouts" DROP CONSTRAINT IF EXISTS "lms_instructor_payouts_instructor_profile_id_fkey";
ALTER TABLE "lms_instructor_payouts" ADD CONSTRAINT "lms_instructor_payouts_instructor_profile_id_fkey"
    FOREIGN KEY ("instructor_profile_id") REFERENCES "lms_instructor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
