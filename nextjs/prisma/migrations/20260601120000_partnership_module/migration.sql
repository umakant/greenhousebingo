-- Partnership module: platform-level partners, referrals, commissions, payouts, landing pages.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "partner_id" BIGINT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referral_source" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referred_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "users_partner_id_idx" ON "users"("partner_id");

CREATE TABLE IF NOT EXISTS "partners" (
    "id" BIGINT NOT NULL,
    "user_id" BIGINT,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(64),
    "brand_name" VARCHAR(255),
    "slug" VARCHAR(255) NOT NULL,
    "referral_code" VARCHAR(255) NOT NULL,
    "commission_rate" DECIMAL(5,2),
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "payout_method" VARCHAR(64),
    "payout_email" VARCHAR(255),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "partners_slug_key" ON "partners"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "partners_referral_code_key" ON "partners"("referral_code");
CREATE INDEX IF NOT EXISTS "partners_user_id_idx" ON "partners"("user_id");
CREATE INDEX IF NOT EXISTS "partners_status_idx" ON "partners"("status");

CREATE TABLE IF NOT EXISTS "partner_referrals" (
    "id" BIGINT NOT NULL,
    "partner_id" BIGINT NOT NULL,
    "company_id" BIGINT,
    "referral_code" VARCHAR(255),
    "partner_slug" VARCHAR(255),
    "source_url" TEXT,
    "signup_date" TIMESTAMP(3),
    "referral_status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    CONSTRAINT "partner_referrals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "partner_referrals_partner_id_idx" ON "partner_referrals"("partner_id");
CREATE INDEX IF NOT EXISTS "partner_referrals_company_id_idx" ON "partner_referrals"("company_id");

CREATE TABLE IF NOT EXISTS "partner_commissions" (
    "id" BIGINT NOT NULL,
    "partner_id" BIGINT NOT NULL,
    "company_id" BIGINT NOT NULL,
    "subscription_id" BIGINT,
    "invoice_id" BIGINT,
    "order_ref" VARCHAR(255),
    "amount" DECIMAL(10,2) NOT NULL,
    "commission_rate" DECIMAL(5,2) NOT NULL,
    "commission_amount" DECIMAL(10,2) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "payout_id" BIGINT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    CONSTRAINT "partner_commissions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "partner_commissions_order_ref_key" ON "partner_commissions"("order_ref");
CREATE INDEX IF NOT EXISTS "partner_commissions_partner_id_idx" ON "partner_commissions"("partner_id");
CREATE INDEX IF NOT EXISTS "partner_commissions_company_id_idx" ON "partner_commissions"("company_id");
CREATE INDEX IF NOT EXISTS "partner_commissions_status_idx" ON "partner_commissions"("status");
CREATE INDEX IF NOT EXISTS "partner_commissions_payout_id_idx" ON "partner_commissions"("payout_id");

CREATE TABLE IF NOT EXISTS "partner_payouts" (
    "id" BIGINT NOT NULL,
    "partner_id" BIGINT NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "payout_method" VARCHAR(64),
    "payout_reference" VARCHAR(255),
    "notes" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    CONSTRAINT "partner_payouts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "partner_payouts_partner_id_idx" ON "partner_payouts"("partner_id");
CREATE INDEX IF NOT EXISTS "partner_payouts_status_idx" ON "partner_payouts"("status");

CREATE TABLE IF NOT EXISTS "partner_landing_pages" (
    "id" BIGINT NOT NULL,
    "partner_id" BIGINT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "headline" VARCHAR(255),
    "subheadline" VARCHAR(255),
    "industry_module" VARCHAR(255),
    "logo" VARCHAR(255),
    "description" TEXT,
    "call_to_action_text" VARCHAR(255),
    "status" VARCHAR(32) NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    CONSTRAINT "partner_landing_pages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "partner_landing_pages_partner_id_slug_key" ON "partner_landing_pages"("partner_id", "slug");
CREATE INDEX IF NOT EXISTS "partner_landing_pages_partner_id_idx" ON "partner_landing_pages"("partner_id");
