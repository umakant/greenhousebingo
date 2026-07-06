-- LMS learner subscription plans (monthly bundles) + student subscriptions

CREATE TYPE "LmsStudentSubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'PAST_DUE');
CREATE TYPE "LmsSubscriptionBillingPeriod" AS ENUM ('MONTHLY', 'YEARLY');

ALTER TYPE "LmsEnrollmentPurchaseKind" ADD VALUE 'SUBSCRIPTION';

CREATE TABLE IF NOT EXISTS "lms_subscription_plans" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "free_plan" BOOLEAN NOT NULL DEFAULT false,
    "package_price_monthly" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "package_price_yearly" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "trial" BOOLEAN NOT NULL DEFAULT false,
    "trial_days" INTEGER NOT NULL DEFAULT 0,
    "linked_pos_product_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "lms_subscription_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "lms_subscription_plan_courses" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "plan_id" BIGINT NOT NULL,
    "course_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_subscription_plan_courses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "lms_student_subscriptions" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "plan_id" BIGINT NOT NULL,
    "student_user_id" BIGINT NOT NULL,
    "status" "LmsStudentSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "billing_period" "LmsSubscriptionBillingPeriod" NOT NULL,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "cancelled_at" TIMESTAMP(3),
    "storefront_order_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "lms_student_subscriptions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "lms_enrollments" ADD COLUMN IF NOT EXISTS "student_subscription_id" BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS "lms_subscription_plan_courses_plan_id_course_id_key"
    ON "lms_subscription_plan_courses"("plan_id", "course_id");
CREATE INDEX IF NOT EXISTS "lms_subscription_plans_organization_id_status_idx"
    ON "lms_subscription_plans"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "lms_subscription_plans_linked_pos_product_id_idx"
    ON "lms_subscription_plans"("linked_pos_product_id");
CREATE INDEX IF NOT EXISTS "lms_subscription_plan_courses_organization_id_idx"
    ON "lms_subscription_plan_courses"("organization_id");
CREATE INDEX IF NOT EXISTS "lms_subscription_plan_courses_course_id_idx"
    ON "lms_subscription_plan_courses"("course_id");
CREATE INDEX IF NOT EXISTS "lms_student_subscriptions_organization_id_student_user_id_status_idx"
    ON "lms_student_subscriptions"("organization_id", "student_user_id", "status");
CREATE INDEX IF NOT EXISTS "lms_student_subscriptions_plan_id_idx"
    ON "lms_student_subscriptions"("plan_id");
CREATE INDEX IF NOT EXISTS "lms_student_subscriptions_storefront_order_id_idx"
    ON "lms_student_subscriptions"("storefront_order_id");
CREATE INDEX IF NOT EXISTS "lms_enrollments_student_subscription_id_idx"
    ON "lms_enrollments"("student_subscription_id");

ALTER TABLE "lms_subscription_plans" DROP CONSTRAINT IF EXISTS "lms_subscription_plans_organization_id_fkey";
ALTER TABLE "lms_subscription_plans" ADD CONSTRAINT "lms_subscription_plans_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lms_subscription_plans" DROP CONSTRAINT IF EXISTS "lms_subscription_plans_linked_pos_product_id_fkey";
ALTER TABLE "lms_subscription_plans" ADD CONSTRAINT "lms_subscription_plans_linked_pos_product_id_fkey"
    FOREIGN KEY ("linked_pos_product_id") REFERENCES "pos_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "lms_subscription_plan_courses" DROP CONSTRAINT IF EXISTS "lms_subscription_plan_courses_organization_id_fkey";
ALTER TABLE "lms_subscription_plan_courses" ADD CONSTRAINT "lms_subscription_plan_courses_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lms_subscription_plan_courses" DROP CONSTRAINT IF EXISTS "lms_subscription_plan_courses_plan_id_fkey";
ALTER TABLE "lms_subscription_plan_courses" ADD CONSTRAINT "lms_subscription_plan_courses_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "lms_subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lms_subscription_plan_courses" DROP CONSTRAINT IF EXISTS "lms_subscription_plan_courses_course_id_fkey";
ALTER TABLE "lms_subscription_plan_courses" ADD CONSTRAINT "lms_subscription_plan_courses_course_id_fkey"
    FOREIGN KEY ("course_id") REFERENCES "lms_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lms_student_subscriptions" DROP CONSTRAINT IF EXISTS "lms_student_subscriptions_organization_id_fkey";
ALTER TABLE "lms_student_subscriptions" ADD CONSTRAINT "lms_student_subscriptions_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lms_student_subscriptions" DROP CONSTRAINT IF EXISTS "lms_student_subscriptions_plan_id_fkey";
ALTER TABLE "lms_student_subscriptions" ADD CONSTRAINT "lms_student_subscriptions_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "lms_subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lms_student_subscriptions" DROP CONSTRAINT IF EXISTS "lms_student_subscriptions_student_user_id_fkey";
ALTER TABLE "lms_student_subscriptions" ADD CONSTRAINT "lms_student_subscriptions_student_user_id_fkey"
    FOREIGN KEY ("student_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lms_student_subscriptions" DROP CONSTRAINT IF EXISTS "lms_student_subscriptions_storefront_order_id_fkey";
ALTER TABLE "lms_student_subscriptions" ADD CONSTRAINT "lms_student_subscriptions_storefront_order_id_fkey"
    FOREIGN KEY ("storefront_order_id") REFERENCES "storefront_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "lms_enrollments" DROP CONSTRAINT IF EXISTS "lms_enrollments_student_subscription_id_fkey";
ALTER TABLE "lms_enrollments" ADD CONSTRAINT "lms_enrollments_student_subscription_id_fkey"
    FOREIGN KEY ("student_subscription_id") REFERENCES "lms_student_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
