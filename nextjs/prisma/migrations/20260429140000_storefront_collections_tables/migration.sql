-- Storefront collection tables (matches Prisma StorefrontCollection / StorefrontCollectionProduct).
-- Idempotent for production DBs that never received these tables.

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
