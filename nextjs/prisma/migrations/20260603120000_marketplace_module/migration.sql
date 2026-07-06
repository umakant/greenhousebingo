-- Marketplace module (platform-operated): global vendors/products, buyer orders,
-- delivery queues + deliveries + delivery events, and a key/value config table.
-- Idempotent so it can be replayed by scripts/ensure-marketplace-schema.js.

CREATE TABLE IF NOT EXISTS "marketplace_vendors" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "contact_email" VARCHAR(255),
    "phone" VARCHAR(64),
    "description" TEXT,
    "logo_url" VARCHAR(2048),
    "commission_rate" DECIMAL(5,2),
    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    CONSTRAINT "marketplace_vendors_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "marketplace_vendors_slug_key" ON "marketplace_vendors"("slug");
CREATE INDEX IF NOT EXISTS "marketplace_vendors_status_idx" ON "marketplace_vendors"("status");

CREATE TABLE IF NOT EXISTS "marketplace_products" (
    "id" BIGSERIAL NOT NULL,
    "vendor_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "sku" VARCHAR(128),
    "description" TEXT,
    "price" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'USD',
    "image_url" VARCHAR(2048),
    "category" VARCHAR(128),
    "stock" INTEGER,
    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    CONSTRAINT "marketplace_products_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "marketplace_products_slug_key" ON "marketplace_products"("slug");
CREATE INDEX IF NOT EXISTS "marketplace_products_vendor_id_idx" ON "marketplace_products"("vendor_id");
CREATE INDEX IF NOT EXISTS "marketplace_products_status_idx" ON "marketplace_products"("status");
CREATE INDEX IF NOT EXISTS "marketplace_products_category_idx" ON "marketplace_products"("category");

CREATE TABLE IF NOT EXISTS "marketplace_orders" (
    "id" BIGSERIAL NOT NULL,
    "order_number" VARCHAR(64) NOT NULL,
    "buyer_organization_id" BIGINT NOT NULL,
    "placed_by_user_id" BIGINT,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "payment_status" VARCHAR(32) NOT NULL DEFAULT 'unpaid',
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    CONSTRAINT "marketplace_orders_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "marketplace_orders_order_number_key" ON "marketplace_orders"("order_number");
CREATE INDEX IF NOT EXISTS "marketplace_orders_buyer_organization_id_idx" ON "marketplace_orders"("buyer_organization_id");
CREATE INDEX IF NOT EXISTS "marketplace_orders_status_idx" ON "marketplace_orders"("status");
CREATE INDEX IF NOT EXISTS "marketplace_orders_payment_status_idx" ON "marketplace_orders"("payment_status");

CREATE TABLE IF NOT EXISTS "marketplace_order_lines" (
    "id" BIGSERIAL NOT NULL,
    "order_id" BIGINT NOT NULL,
    "product_id" BIGINT,
    "vendor_id" BIGINT,
    "title" VARCHAR(255) NOT NULL,
    "unit_price" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "line_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    CONSTRAINT "marketplace_order_lines_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "marketplace_order_lines_order_id_idx" ON "marketplace_order_lines"("order_id");
CREATE INDEX IF NOT EXISTS "marketplace_order_lines_product_id_idx" ON "marketplace_order_lines"("product_id");
CREATE INDEX IF NOT EXISTS "marketplace_order_lines_vendor_id_idx" ON "marketplace_order_lines"("vendor_id");

CREATE TABLE IF NOT EXISTS "marketplace_delivery_queues" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "region" VARCHAR(128),
    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    CONSTRAINT "marketplace_delivery_queues_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "marketplace_delivery_queues_status_idx" ON "marketplace_delivery_queues"("status");

CREATE TABLE IF NOT EXISTS "marketplace_deliveries" (
    "id" BIGSERIAL NOT NULL,
    "order_id" BIGINT NOT NULL,
    "queue_id" BIGINT,
    "buyer_organization_id" BIGINT NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'queued',
    "assigned_to" VARCHAR(255),
    "address_line" VARCHAR(255),
    "city" VARCHAR(128),
    "state" VARCHAR(128),
    "postal_code" VARCHAR(32),
    "country" VARCHAR(128),
    "scheduled_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    CONSTRAINT "marketplace_deliveries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "marketplace_deliveries_order_id_idx" ON "marketplace_deliveries"("order_id");
CREATE INDEX IF NOT EXISTS "marketplace_deliveries_queue_id_idx" ON "marketplace_deliveries"("queue_id");
CREATE INDEX IF NOT EXISTS "marketplace_deliveries_buyer_organization_id_idx" ON "marketplace_deliveries"("buyer_organization_id");
CREATE INDEX IF NOT EXISTS "marketplace_deliveries_status_idx" ON "marketplace_deliveries"("status");

CREATE TABLE IF NOT EXISTS "marketplace_delivery_events" (
    "id" BIGSERIAL NOT NULL,
    "delivery_id" BIGINT NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "note" TEXT,
    "created_by_user_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "marketplace_delivery_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "marketplace_delivery_events_delivery_id_idx" ON "marketplace_delivery_events"("delivery_id");

CREATE TABLE IF NOT EXISTS "marketplace_config" (
    "id" BIGSERIAL NOT NULL,
    "key" VARCHAR(128) NOT NULL,
    "value" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    CONSTRAINT "marketplace_config_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "marketplace_config_key_key" ON "marketplace_config"("key");

-- Foreign keys (guarded so the migration is replayable).
DO $$ BEGIN
  ALTER TABLE "marketplace_products" ADD CONSTRAINT "marketplace_products_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "marketplace_vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "marketplace_order_lines" ADD CONSTRAINT "marketplace_order_lines_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "marketplace_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "marketplace_deliveries" ADD CONSTRAINT "marketplace_deliveries_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "marketplace_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "marketplace_deliveries" ADD CONSTRAINT "marketplace_deliveries_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "marketplace_delivery_queues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "marketplace_delivery_events" ADD CONSTRAINT "marketplace_delivery_events_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "marketplace_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
