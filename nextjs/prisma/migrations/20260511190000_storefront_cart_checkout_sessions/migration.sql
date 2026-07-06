-- Storefront cart, cart lines, checkout sessions, stock reservations, order lines & events.
-- Prisma schema defined these models but no prior migration created the tables (production gap).

-- ─── storefront_carts ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "storefront_carts" (
  "id" TEXT NOT NULL,
  "organization_id" BIGINT NOT NULL,
  "website_id" BIGINT NOT NULL,
  "guest_token" TEXT,
  "customer_id" BIGINT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "storefront_carts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "storefront_carts_organization_id_website_id_idx"
  ON "storefront_carts" ("organization_id", "website_id");
CREATE INDEX IF NOT EXISTS "storefront_carts_guest_token_idx" ON "storefront_carts" ("guest_token");
CREATE INDEX IF NOT EXISTS "storefront_carts_customer_id_idx" ON "storefront_carts" ("customer_id");

DO $$ BEGIN
  ALTER TABLE "storefront_carts" ADD CONSTRAINT "storefront_carts_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "storefront_carts" ADD CONSTRAINT "storefront_carts_website_id_fkey"
    FOREIGN KEY ("website_id") REFERENCES "storefront_websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "storefront_carts" ADD CONSTRAINT "storefront_carts_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "storefront_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;

-- ─── storefront_cart_lines ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "storefront_cart_lines" (
  "id" BIGSERIAL NOT NULL,
  "cart_id" TEXT NOT NULL,
  "product_id" BIGINT NOT NULL,
  "variant_key" TEXT NOT NULL DEFAULT '',
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unit_price" DECIMAL(15, 4) NOT NULL,
  CONSTRAINT "storefront_cart_lines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "storefront_cart_lines_cart_id_product_id_variant_key_key"
  ON "storefront_cart_lines" ("cart_id", "product_id", "variant_key");
CREATE INDEX IF NOT EXISTS "storefront_cart_lines_product_id_idx" ON "storefront_cart_lines" ("product_id");

DO $$ BEGIN
  ALTER TABLE "storefront_cart_lines" ADD CONSTRAINT "storefront_cart_lines_cart_id_fkey"
    FOREIGN KEY ("cart_id") REFERENCES "storefront_carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "storefront_cart_lines" ADD CONSTRAINT "storefront_cart_lines_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "pos_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── storefront_checkout_sessions ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "storefront_checkout_sessions" (
  "id" TEXT NOT NULL,
  "organization_id" BIGINT NOT NULL,
  "website_id" BIGINT NOT NULL,
  "cart_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "expires_at" TIMESTAMP(3) NOT NULL,
  "shipping_method_key" TEXT,
  "shipping_amount" DECIMAL(15, 4) NOT NULL DEFAULT 0,
  "tax_amount" DECIMAL(15, 4) NOT NULL DEFAULT 0,
  "discount_amount" DECIMAL(15, 4) NOT NULL DEFAULT 0,
  "stripe_payment_intent_id" TEXT,
  "metadata" JSONB,
  "discount_code_id" BIGINT,
  CONSTRAINT "storefront_checkout_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "storefront_checkout_sessions_organization_id_website_id_idx"
  ON "storefront_checkout_sessions" ("organization_id", "website_id");
CREATE INDEX IF NOT EXISTS "storefront_checkout_sessions_cart_id_idx" ON "storefront_checkout_sessions" ("cart_id");
CREATE INDEX IF NOT EXISTS "storefront_checkout_sessions_expires_at_idx" ON "storefront_checkout_sessions" ("expires_at");

DO $$ BEGIN
  ALTER TABLE "storefront_checkout_sessions" ADD CONSTRAINT "storefront_checkout_sessions_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "storefront_checkout_sessions" ADD CONSTRAINT "storefront_checkout_sessions_website_id_fkey"
    FOREIGN KEY ("website_id") REFERENCES "storefront_websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "storefront_checkout_sessions" ADD CONSTRAINT "storefront_checkout_sessions_cart_id_fkey"
    FOREIGN KEY ("cart_id") REFERENCES "storefront_carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "storefront_checkout_sessions" ADD CONSTRAINT "storefront_checkout_sessions_discount_code_id_fkey"
    FOREIGN KEY ("discount_code_id") REFERENCES "storefront_discount_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;

-- ─── storefront_stock_reservations ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "storefront_stock_reservations" (
  "id" BIGSERIAL NOT NULL,
  "organization_id" BIGINT NOT NULL,
  "product_id" BIGINT NOT NULL,
  "variant_key" TEXT NOT NULL DEFAULT '',
  "quantity" INTEGER NOT NULL,
  "cart_id" TEXT,
  "checkout_session_id" TEXT,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "storefront_stock_reservations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "storefront_stock_reservations_organization_id_idx"
  ON "storefront_stock_reservations" ("organization_id");
CREATE INDEX IF NOT EXISTS "storefront_stock_reservations_product_id_idx"
  ON "storefront_stock_reservations" ("product_id");
CREATE INDEX IF NOT EXISTS "storefront_stock_reservations_expires_at_idx"
  ON "storefront_stock_reservations" ("expires_at");
CREATE INDEX IF NOT EXISTS "storefront_stock_reservations_cart_id_idx"
  ON "storefront_stock_reservations" ("cart_id");

DO $$ BEGIN
  ALTER TABLE "storefront_stock_reservations" ADD CONSTRAINT "storefront_stock_reservations_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "storefront_stock_reservations" ADD CONSTRAINT "storefront_stock_reservations_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "pos_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── storefront_order_lines (checkout creates rows) ─────────────────────────

CREATE TABLE IF NOT EXISTS "storefront_order_lines" (
  "id" BIGSERIAL NOT NULL,
  "order_id" BIGINT NOT NULL,
  "product_id" BIGINT,
  "variant_key" TEXT NOT NULL DEFAULT '',
  "name" TEXT NOT NULL,
  "sku" TEXT,
  "quantity" INTEGER NOT NULL,
  "unit_price" DECIMAL(15, 4) NOT NULL,
  "line_total" DECIMAL(15, 4) NOT NULL,
  CONSTRAINT "storefront_order_lines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "storefront_order_lines_order_id_idx" ON "storefront_order_lines" ("order_id");
CREATE INDEX IF NOT EXISTS "storefront_order_lines_product_id_idx" ON "storefront_order_lines" ("product_id");

DO $$ BEGIN
  ALTER TABLE "storefront_order_lines" ADD CONSTRAINT "storefront_order_lines_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "storefront_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "storefront_order_lines" ADD CONSTRAINT "storefront_order_lines_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "pos_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── storefront_order_events ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "storefront_order_events" (
  "id" BIGSERIAL NOT NULL,
  "order_id" BIGINT NOT NULL,
  "kind" TEXT NOT NULL,
  "message" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "storefront_order_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "storefront_order_events_order_id_idx" ON "storefront_order_events" ("order_id");
CREATE INDEX IF NOT EXISTS "storefront_order_events_created_at_idx" ON "storefront_order_events" ("created_at");

DO $$ BEGIN
  ALTER TABLE "storefront_order_events" ADD CONSTRAINT "storefront_order_events_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "storefront_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── storefront_payment_records ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "storefront_payment_records" (
  "id" BIGSERIAL NOT NULL,
  "order_id" BIGINT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'stripe',
  "amount" DECIMAL(15, 4) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "stripe_payment_intent_id" TEXT,
  "idempotency_key" TEXT,
  "raw_metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3),
  CONSTRAINT "storefront_payment_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "storefront_payment_records_stripe_payment_intent_id_key"
  ON "storefront_payment_records" ("stripe_payment_intent_id");
CREATE INDEX IF NOT EXISTS "storefront_payment_records_order_id_idx" ON "storefront_payment_records" ("order_id");
CREATE INDEX IF NOT EXISTS "storefront_payment_records_status_idx" ON "storefront_payment_records" ("status");

DO $$ BEGIN
  ALTER TABLE "storefront_payment_records" ADD CONSTRAINT "storefront_payment_records_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "storefront_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── storefront_shipments ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "storefront_shipments" (
  "id" BIGSERIAL NOT NULL,
  "order_id" BIGINT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "carrier" VARCHAR(128),
  "tracking_number" VARCHAR(128),
  "shipped_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3),
  CONSTRAINT "storefront_shipments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "storefront_shipments_order_id_idx" ON "storefront_shipments" ("order_id");

DO $$ BEGIN
  ALTER TABLE "storefront_shipments" ADD CONSTRAINT "storefront_shipments_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "storefront_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
