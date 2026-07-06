-- LMS course cover image + sale pricing + optional POS product link

ALTER TABLE "lms_courses" ADD COLUMN IF NOT EXISTS "cover_image_url" VARCHAR(2048);
ALTER TABLE "lms_courses" ADD COLUMN IF NOT EXISTS "sale_price" DECIMAL(15,4);
ALTER TABLE "lms_courses" ADD COLUMN IF NOT EXISTS "sale_currency" VARCHAR(3) NOT NULL DEFAULT 'USD';
ALTER TABLE "lms_courses" ADD COLUMN IF NOT EXISTS "linked_pos_product_id" BIGINT;

CREATE INDEX IF NOT EXISTS "lms_courses_linked_pos_product_id_idx" ON "lms_courses"("linked_pos_product_id");

DO $$ BEGIN
  ALTER TABLE "lms_courses" ADD CONSTRAINT "lms_courses_linked_pos_product_id_fkey" FOREIGN KEY ("linked_pos_product_id") REFERENCES "pos_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
