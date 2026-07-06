-- Storefront "featured" flag for homepage spotlight / grid ordering (separate from collection membership).
ALTER TABLE "pos_products" ADD COLUMN "storefront_featured" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "pos_products_organization_id_storefront_featured_idx" ON "pos_products"("organization_id", "storefront_featured");
