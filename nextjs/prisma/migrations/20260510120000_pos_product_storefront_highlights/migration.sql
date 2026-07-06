-- Optional per-product bullets for Concept homepage featured spotlight ("Why you'll love it" row).
ALTER TABLE "pos_products" ADD COLUMN IF NOT EXISTS "storefront_highlights" JSONB;
