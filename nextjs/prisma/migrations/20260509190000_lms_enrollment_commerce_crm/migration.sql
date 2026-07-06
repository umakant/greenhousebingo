-- LMS enrollments: storefront order + CRM customer + purchase kind

DO $$ BEGIN
  CREATE TYPE "LmsEnrollmentPurchaseKind" AS ENUM ('FREE', 'PAID_STOREFRONT', 'MANUAL', 'COMPED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "lms_enrollments" ADD COLUMN IF NOT EXISTS "storefront_order_id" BIGINT;
ALTER TABLE "lms_enrollments" ADD COLUMN IF NOT EXISTS "crm_customer_id" BIGINT;
ALTER TABLE "lms_enrollments" ADD COLUMN IF NOT EXISTS "purchase_kind" "LmsEnrollmentPurchaseKind";

CREATE INDEX IF NOT EXISTS "lms_enrollments_storefront_order_id_idx" ON "lms_enrollments"("storefront_order_id");
CREATE INDEX IF NOT EXISTS "lms_enrollments_crm_customer_id_idx" ON "lms_enrollments"("crm_customer_id");

DO $$ BEGIN
  ALTER TABLE "lms_enrollments" ADD CONSTRAINT "lms_enrollments_storefront_order_id_fkey" FOREIGN KEY ("storefront_order_id") REFERENCES "storefront_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "lms_enrollments" ADD CONSTRAINT "lms_enrollments_crm_customer_id_fkey" FOREIGN KEY ("crm_customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
