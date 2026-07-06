-- Production hotfix: P2022 "column pos_products.slug does not exist" when migrations were skipped
-- or the DB was restored from an older snapshot. Idempotent (IF NOT EXISTS).

ALTER TABLE "pos_products" ADD COLUMN IF NOT EXISTS "organization_id" BIGINT;
ALTER TABLE "pos_products" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "pos_products" ADD COLUMN IF NOT EXISTS "sku" TEXT;
ALTER TABLE "pos_products" ADD COLUMN IF NOT EXISTS "compare_at_price" DECIMAL(15, 4);
ALTER TABLE "pos_products" ADD COLUMN IF NOT EXISTS "storefront_published" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "pos_products" ADD COLUMN IF NOT EXISTS "storefront_publish_at" TIMESTAMP(3);
ALTER TABLE "pos_products" ADD COLUMN IF NOT EXISTS "storefront_seo_title" VARCHAR(512);
ALTER TABLE "pos_products" ADD COLUMN IF NOT EXISTS "storefront_seo_description" TEXT;
ALTER TABLE "pos_products" ADD COLUMN IF NOT EXISTS "gallery_images" JSONB;
ALTER TABLE "pos_products" ADD COLUMN IF NOT EXISTS "related_product_ids" JSONB;
ALTER TABLE "pos_products" ADD COLUMN IF NOT EXISTS "page_template_key" TEXT DEFAULT 'product';
ALTER TABLE "pos_products" ADD COLUMN IF NOT EXISTS "variants" JSONB;
ALTER TABLE "pos_products" ADD COLUMN IF NOT EXISTS "inventory_policy" TEXT NOT NULL DEFAULT 'track';

DO $$
BEGIN
  ALTER TABLE "pos_products"
    ADD CONSTRAINT "pos_products_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "pos_products_organization_id_idx" ON "pos_products" ("organization_id");
CREATE INDEX IF NOT EXISTS "pos_products_organization_id_slug_idx" ON "pos_products" ("organization_id", "slug");
CREATE INDEX IF NOT EXISTS "pos_products_organization_id_storefront_published_idx"
  ON "pos_products" ("organization_id", "storefront_published");
CREATE INDEX IF NOT EXISTS "pos_products_organization_id_storefront_publish_at_idx"
  ON "pos_products" ("organization_id", "storefront_publish_at");
