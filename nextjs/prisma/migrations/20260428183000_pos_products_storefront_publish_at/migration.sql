-- Scheduled storefront publishing (Shopify-style): product stays hidden until `storefront_publish_at`.
ALTER TABLE "pos_products" ADD COLUMN IF NOT EXISTS "storefront_publish_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "pos_products_organization_id_storefront_publish_at_idx"
  ON "pos_products" ("organization_id", "storefront_publish_at");
