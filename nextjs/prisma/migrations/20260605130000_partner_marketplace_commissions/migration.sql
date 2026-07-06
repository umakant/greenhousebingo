-- Connect Marketplace orders to the Partnership module:
-- separate marketplace commissions from subscription commissions, and add optional
-- per-partner marketplace commission rules (percentage or flat).

-- Partner commissions: distinguish source + link to a marketplace order.
ALTER TABLE "partner_commissions"
  ADD COLUMN IF NOT EXISTS "source_type" VARCHAR(32) NOT NULL DEFAULT 'subscription';
ALTER TABLE "partner_commissions"
  ADD COLUMN IF NOT EXISTS "marketplace_order_id" BIGINT;

CREATE INDEX IF NOT EXISTS "partner_commissions_source_type_idx"
  ON "partner_commissions"("source_type");
CREATE INDEX IF NOT EXISTS "partner_commissions_marketplace_order_id_idx"
  ON "partner_commissions"("marketplace_order_id");

-- Optional marketplace commission rule per partner (separate from subscription commission_rate).
ALTER TABLE "partners"
  ADD COLUMN IF NOT EXISTS "marketplace_commission_type" VARCHAR(16);
ALTER TABLE "partners"
  ADD COLUMN IF NOT EXISTS "marketplace_commission_value" DECIMAL(10,2);

-- Marketplace orders referral attribution (idempotent; also ensured by ensure-marketplace-domain-schema.js).
ALTER TABLE "marketplace_orders"
  ADD COLUMN IF NOT EXISTS "partner_id" BIGINT;
ALTER TABLE "marketplace_orders"
  ADD COLUMN IF NOT EXISTS "referral_source" VARCHAR(255);
CREATE INDEX IF NOT EXISTS "marketplace_orders_partner_id_idx"
  ON "marketplace_orders"("partner_id");
