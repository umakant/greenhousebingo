-- Connect Marketplace orders to Accounting (revenues / customer_payments) and Support (st_tickets).

-- Accounting links on marketplace orders (1:1 with the generated revenue / customer payment rows).
ALTER TABLE "marketplace_orders"
  ADD COLUMN IF NOT EXISTS "accounting_revenue_id" BIGINT;
ALTER TABLE "marketplace_orders"
  ADD COLUMN IF NOT EXISTS "accounting_customer_payment_id" BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS "marketplace_orders_accounting_revenue_id_key"
  ON "marketplace_orders"("accounting_revenue_id");
CREATE UNIQUE INDEX IF NOT EXISTS "marketplace_orders_accounting_customer_payment_id_key"
  ON "marketplace_orders"("accounting_customer_payment_id");

DO $$ BEGIN
  ALTER TABLE "marketplace_orders"
    ADD CONSTRAINT "marketplace_orders_accounting_revenue_id_fkey"
    FOREIGN KEY ("accounting_revenue_id") REFERENCES "revenues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "marketplace_orders"
    ADD CONSTRAINT "marketplace_orders_accounting_customer_payment_id_fkey"
    FOREIGN KEY ("accounting_customer_payment_id") REFERENCES "customer_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Support ticket links to a marketplace order / vendor / delivery event.
ALTER TABLE "st_tickets"
  ADD COLUMN IF NOT EXISTS "marketplace_order_id" BIGINT;
ALTER TABLE "st_tickets"
  ADD COLUMN IF NOT EXISTS "marketplace_vendor_id" BIGINT;
ALTER TABLE "st_tickets"
  ADD COLUMN IF NOT EXISTS "delivery_event_id" BIGINT;

CREATE INDEX IF NOT EXISTS "st_tickets_marketplace_order_id_idx" ON "st_tickets"("marketplace_order_id");
CREATE INDEX IF NOT EXISTS "st_tickets_marketplace_vendor_id_idx" ON "st_tickets"("marketplace_vendor_id");
CREATE INDEX IF NOT EXISTS "st_tickets_delivery_event_id_idx" ON "st_tickets"("delivery_event_id");

DO $$ BEGIN
  ALTER TABLE "st_tickets"
    ADD CONSTRAINT "st_tickets_marketplace_order_id_fkey"
    FOREIGN KEY ("marketplace_order_id") REFERENCES "marketplace_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "st_tickets"
    ADD CONSTRAINT "st_tickets_marketplace_vendor_id_fkey"
    FOREIGN KEY ("marketplace_vendor_id") REFERENCES "marketplace_vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "st_tickets"
    ADD CONSTRAINT "st_tickets_delivery_event_id_fkey"
    FOREIGN KEY ("delivery_event_id") REFERENCES "delivery_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
