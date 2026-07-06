-- Emergency fix when production is missing storefront catalog schema
-- (P2022 pos_products.slug, P2021 storefront_collections missing, etc.) but `prisma migrate deploy` cannot run yet.
-- Prefer (loads .env like Prisma; strips Prisma-only URL params before calling psql):
--   cd /path/to/nextjs && npm run db:apply-storefront-gap
--
-- If DATABASE_URL password contains `@`, encode it as `%40` in .env or libpq mis-parses the host.
-- Or manually:
--   psql "$DATABASE_URL" -f prisma/ops/apply-pos-products-storefront-columns-manually.sql
-- Idempotent where possible. Requires public.users and public.storefront_websites to exist.
-- After this, restart the Next.js app. Still run `npx prisma migrate deploy` when Prisma is unblocked.

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
ALTER TABLE "pos_products" ADD COLUMN IF NOT EXISTS "storefront_featured" BOOLEAN NOT NULL DEFAULT false;

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
CREATE INDEX IF NOT EXISTS "pos_products_organization_id_storefront_featured_idx"
  ON "pos_products" ("organization_id", "storefront_featured");

-- ─── storefront_collections + junction (Prisma @@map names) ─────────────────

CREATE TABLE IF NOT EXISTS "storefront_collections" (
  "id" BIGSERIAL PRIMARY KEY,
  "organization_id" BIGINT NOT NULL,
  "website_id" BIGINT,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "seo_title" TEXT,
  "seo_description" TEXT,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3)
);

DO $$
BEGIN
  ALTER TABLE "storefront_collections"
    ADD CONSTRAINT "storefront_collections_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "storefront_collections"
    ADD CONSTRAINT "storefront_collections_website_id_fkey"
    FOREIGN KEY ("website_id") REFERENCES "storefront_websites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "storefront_collections_organization_id_slug_key"
  ON "storefront_collections" ("organization_id", "slug");
CREATE INDEX IF NOT EXISTS "storefront_collections_organization_id_published_idx"
  ON "storefront_collections" ("organization_id", "published");
CREATE INDEX IF NOT EXISTS "storefront_collections_website_id_idx" ON "storefront_collections" ("website_id");

CREATE TABLE IF NOT EXISTS "storefront_collection_products" (
  "id" BIGSERIAL PRIMARY KEY,
  "collection_id" BIGINT NOT NULL,
  "product_id" BIGINT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0
);

DO $$
BEGIN
  ALTER TABLE "storefront_collection_products"
    ADD CONSTRAINT "storefront_collection_products_collection_id_fkey"
    FOREIGN KEY ("collection_id") REFERENCES "storefront_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "storefront_collection_products"
    ADD CONSTRAINT "storefront_collection_products_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "pos_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "storefront_collection_products_collection_id_product_id_key"
  ON "storefront_collection_products" ("collection_id", "product_id");
CREATE INDEX IF NOT EXISTS "storefront_collection_products_product_id_idx"
  ON "storefront_collection_products" ("product_id");
