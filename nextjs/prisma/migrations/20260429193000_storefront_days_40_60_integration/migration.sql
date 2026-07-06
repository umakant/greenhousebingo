-- Days 40–60: support tickets ↔ storefront, KB tenant scope, order accounting + fulfillment assignee
--
-- Some databases never received a migration that created storefront_orders (Prisma history gap).
-- Create it here before any FK references it.

CREATE TABLE IF NOT EXISTS "storefront_orders" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "website_id" BIGINT NOT NULL,
    "order_number" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'storefront',
    "status" TEXT NOT NULL DEFAULT 'pending_payment',
    "payment_status" TEXT,
    "stripe_payment_intent_id" TEXT,
    "stripe_checkout_session_id" TEXT,
    "subtotal" DECIMAL(15, 4) NOT NULL,
    "tax_total" DECIMAL(15, 4) NOT NULL DEFAULT 0,
    "shipping_total" DECIMAL(15, 4) NOT NULL DEFAULT 0,
    "discount_total" DECIMAL(15, 4) NOT NULL DEFAULT 0,
    "total" DECIMAL(15, 4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "customer_email" TEXT,
    "customer_name" TEXT,
    "shipping_address" JSONB,
    "billing_address" JSONB,
    "storefront_customer_id" BIGINT,
    "internal_notes" TEXT,
    "fulfillment_status" TEXT NOT NULL DEFAULT 'unfulfilled',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "checkout_session_id" TEXT,
    "crm_customer_id" BIGINT,
    "discount_code_id" BIGINT,
    "tax_lines" JSONB,
    "accounting_revenue_id" BIGINT,
    "fulfillment_assignee_user_id" BIGINT,

    CONSTRAINT "storefront_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "storefront_orders_order_number_key" ON "storefront_orders"("order_number");

CREATE INDEX IF NOT EXISTS "storefront_orders_organization_id_website_id_idx" ON "storefront_orders"("organization_id", "website_id");
CREATE INDEX IF NOT EXISTS "storefront_orders_organization_id_status_idx" ON "storefront_orders"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "storefront_orders_status_idx" ON "storefront_orders"("status");
CREATE INDEX IF NOT EXISTS "storefront_orders_crm_customer_id_idx" ON "storefront_orders"("crm_customer_id");
CREATE INDEX IF NOT EXISTS "storefront_orders_discount_code_id_idx" ON "storefront_orders"("discount_code_id");

DO $$ BEGIN
  ALTER TABLE "storefront_orders" ADD CONSTRAINT "storefront_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "storefront_orders" ADD CONSTRAINT "storefront_orders_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "storefront_websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "storefront_orders" ADD CONSTRAINT "storefront_orders_storefront_customer_id_fkey" FOREIGN KEY ("storefront_customer_id") REFERENCES "storefront_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "storefront_orders" ADD CONSTRAINT "storefront_orders_crm_customer_id_fkey" FOREIGN KEY ("crm_customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "storefront_orders" ADD CONSTRAINT "storefront_orders_discount_code_id_fkey" FOREIGN KEY ("discount_code_id") REFERENCES "storefront_discount_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;

ALTER TABLE "st_tickets" ADD COLUMN IF NOT EXISTS "organization_id" BIGINT;
ALTER TABLE "st_tickets" ADD COLUMN IF NOT EXISTS "website_id" BIGINT;
ALTER TABLE "st_tickets" ADD COLUMN IF NOT EXISTS "storefront_customer_id" BIGINT;
ALTER TABLE "st_tickets" ADD COLUMN IF NOT EXISTS "storefront_order_id" BIGINT;
ALTER TABLE "st_tickets" ADD COLUMN IF NOT EXISTS "assigned_staff_user_id" BIGINT;

DO $$ BEGIN
  ALTER TABLE "st_tickets" ADD CONSTRAINT "st_tickets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "st_tickets" ADD CONSTRAINT "st_tickets_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "storefront_websites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "st_tickets" ADD CONSTRAINT "st_tickets_storefront_customer_id_fkey" FOREIGN KEY ("storefront_customer_id") REFERENCES "storefront_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "st_tickets" ADD CONSTRAINT "st_tickets_storefront_order_id_fkey" FOREIGN KEY ("storefront_order_id") REFERENCES "storefront_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "st_tickets" ADD CONSTRAINT "st_tickets_assigned_staff_user_id_fkey" FOREIGN KEY ("assigned_staff_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "st_tickets_organization_id_idx" ON "st_tickets"("organization_id");
CREATE INDEX IF NOT EXISTS "st_tickets_website_id_idx" ON "st_tickets"("website_id");
CREATE INDEX IF NOT EXISTS "st_tickets_storefront_customer_id_idx" ON "st_tickets"("storefront_customer_id");
CREATE INDEX IF NOT EXISTS "st_tickets_storefront_order_id_idx" ON "st_tickets"("storefront_order_id");
CREATE INDEX IF NOT EXISTS "st_tickets_assigned_staff_user_id_idx" ON "st_tickets"("assigned_staff_user_id");

ALTER TABLE "st_knowledge_bases" ADD COLUMN IF NOT EXISTS "organization_id" BIGINT;
DO $$ BEGIN
  ALTER TABLE "st_knowledge_bases" ADD CONSTRAINT "st_knowledge_bases_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "st_knowledge_bases_organization_id_idx" ON "st_knowledge_bases"("organization_id");

ALTER TABLE "storefront_orders" ADD COLUMN IF NOT EXISTS "accounting_revenue_id" BIGINT;
ALTER TABLE "storefront_orders" ADD COLUMN IF NOT EXISTS "fulfillment_assignee_user_id" BIGINT;

DO $$ BEGIN
  ALTER TABLE "storefront_orders" ADD CONSTRAINT "storefront_orders_accounting_revenue_id_fkey" FOREIGN KEY ("accounting_revenue_id") REFERENCES "revenues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "storefront_orders" ADD CONSTRAINT "storefront_orders_fulfillment_assignee_user_id_fkey" FOREIGN KEY ("fulfillment_assignee_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "storefront_orders_accounting_revenue_id_key" ON "storefront_orders"("accounting_revenue_id");
CREATE INDEX IF NOT EXISTS "storefront_orders_fulfillment_assignee_user_id_idx" ON "storefront_orders"("fulfillment_assignee_user_id");
