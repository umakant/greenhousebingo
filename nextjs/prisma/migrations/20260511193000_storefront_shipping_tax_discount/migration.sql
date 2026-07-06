-- Storefront shipping zones/methods, tax rules/settings, discount rules/codes (Days 31–33).
-- Prisma models existed without migrations; checkout `/quote` calls these tables.

-- ─── storefront_discount_rules ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "storefront_discount_rules" (
  "id" BIGSERIAL NOT NULL,
  "organization_id" BIGINT NOT NULL,
  "website_id" BIGINT,
  "name" TEXT NOT NULL,
  "scope" TEXT NOT NULL DEFAULT 'order',
  "kind" TEXT NOT NULL,
  "value" DECIMAL(15, 4) NOT NULL,
  "starts_at" TIMESTAMP(3),
  "ends_at" TIMESTAMP(3),
  "max_uses" INTEGER,
  "per_customer_limit" INTEGER,
  "product_ids" JSONB,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3),
  CONSTRAINT "storefront_discount_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "storefront_discount_rules_organization_id_idx"
  ON "storefront_discount_rules" ("organization_id");
CREATE INDEX IF NOT EXISTS "storefront_discount_rules_website_id_idx"
  ON "storefront_discount_rules" ("website_id");

DO $$ BEGIN
  ALTER TABLE "storefront_discount_rules" ADD CONSTRAINT "storefront_discount_rules_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "storefront_discount_rules" ADD CONSTRAINT "storefront_discount_rules_website_id_fkey"
    FOREIGN KEY ("website_id") REFERENCES "storefront_websites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;

-- ─── storefront_discount_codes ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "storefront_discount_codes" (
  "id" BIGSERIAL NOT NULL,
  "organization_id" BIGINT NOT NULL,
  "rule_id" BIGINT NOT NULL,
  "code" TEXT NOT NULL,
  "uses_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "storefront_discount_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "storefront_discount_codes_organization_id_code_key"
  ON "storefront_discount_codes" ("organization_id", "code");
CREATE INDEX IF NOT EXISTS "storefront_discount_codes_rule_id_idx"
  ON "storefront_discount_codes" ("rule_id");

DO $$ BEGIN
  ALTER TABLE "storefront_discount_codes" ADD CONSTRAINT "storefront_discount_codes_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "storefront_discount_codes" ADD CONSTRAINT "storefront_discount_codes_rule_id_fkey"
    FOREIGN KEY ("rule_id") REFERENCES "storefront_discount_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── storefront_shipping_zones ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "storefront_shipping_zones" (
  "id" BIGSERIAL NOT NULL,
  "organization_id" BIGINT NOT NULL,
  "website_id" BIGINT,
  "name" TEXT NOT NULL,
  "countries" JSONB NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3),
  CONSTRAINT "storefront_shipping_zones_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "storefront_shipping_zones_organization_id_idx"
  ON "storefront_shipping_zones" ("organization_id");
CREATE INDEX IF NOT EXISTS "storefront_shipping_zones_website_id_idx"
  ON "storefront_shipping_zones" ("website_id");

DO $$ BEGIN
  ALTER TABLE "storefront_shipping_zones" ADD CONSTRAINT "storefront_shipping_zones_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "storefront_shipping_zones" ADD CONSTRAINT "storefront_shipping_zones_website_id_fkey"
    FOREIGN KEY ("website_id") REFERENCES "storefront_websites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;

-- ─── storefront_shipping_methods ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "storefront_shipping_methods" (
  "id" BIGSERIAL NOT NULL,
  "zone_id" BIGINT NOT NULL,
  "name" TEXT NOT NULL,
  "method_key" TEXT NOT NULL,
  "flat_rate" DECIMAL(15, 4) NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3),
  CONSTRAINT "storefront_shipping_methods_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "storefront_shipping_methods_zone_id_method_key_key"
  ON "storefront_shipping_methods" ("zone_id", "method_key");
CREATE INDEX IF NOT EXISTS "storefront_shipping_methods_zone_id_idx"
  ON "storefront_shipping_methods" ("zone_id");

DO $$ BEGIN
  ALTER TABLE "storefront_shipping_methods" ADD CONSTRAINT "storefront_shipping_methods_zone_id_fkey"
    FOREIGN KEY ("zone_id") REFERENCES "storefront_shipping_zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── storefront_tax_rules ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "storefront_tax_rules" (
  "id" BIGSERIAL NOT NULL,
  "organization_id" BIGINT NOT NULL,
  "website_id" BIGINT,
  "country" VARCHAR(2) NOT NULL,
  "region" VARCHAR(64),
  "rate_percent" DECIMAL(10, 4) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3),
  CONSTRAINT "storefront_tax_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "storefront_tax_rules_organization_id_country_idx"
  ON "storefront_tax_rules" ("organization_id", "country");

DO $$ BEGIN
  ALTER TABLE "storefront_tax_rules" ADD CONSTRAINT "storefront_tax_rules_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "storefront_tax_rules" ADD CONSTRAINT "storefront_tax_rules_website_id_fkey"
    FOREIGN KEY ("website_id") REFERENCES "storefront_websites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;

-- ─── storefront_tax_settings ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "storefront_tax_settings" (
  "id" BIGSERIAL NOT NULL,
  "organization_id" BIGINT NOT NULL,
  "website_id" BIGINT,
  "price_mode" TEXT NOT NULL DEFAULT 'exclusive',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3),
  CONSTRAINT "storefront_tax_settings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "storefront_tax_settings_organization_id_idx"
  ON "storefront_tax_settings" ("organization_id");
CREATE INDEX IF NOT EXISTS "storefront_tax_settings_website_id_idx"
  ON "storefront_tax_settings" ("website_id");

DO $$ BEGIN
  ALTER TABLE "storefront_tax_settings" ADD CONSTRAINT "storefront_tax_settings_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "storefront_tax_settings" ADD CONSTRAINT "storefront_tax_settings_website_id_fkey"
    FOREIGN KEY ("website_id") REFERENCES "storefront_websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;

-- ─── storefront_discount_redemptions (orders + codes must exist) ───────────

CREATE TABLE IF NOT EXISTS "storefront_discount_redemptions" (
  "id" BIGSERIAL NOT NULL,
  "order_id" BIGINT NOT NULL,
  "code_id" BIGINT NOT NULL,
  "amount" DECIMAL(15, 4) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "storefront_discount_redemptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "storefront_discount_redemptions_order_id_idx"
  ON "storefront_discount_redemptions" ("order_id");
CREATE INDEX IF NOT EXISTS "storefront_discount_redemptions_code_id_idx"
  ON "storefront_discount_redemptions" ("code_id");

DO $$ BEGIN
  ALTER TABLE "storefront_discount_redemptions" ADD CONSTRAINT "storefront_discount_redemptions_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "storefront_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "storefront_discount_redemptions" ADD CONSTRAINT "storefront_discount_redemptions_code_id_fkey"
    FOREIGN KEY ("code_id") REFERENCES "storefront_discount_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
