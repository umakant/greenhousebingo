-- Partnership module schema (idempotent).
-- Run this ONCE on production as the database OWNER or a superuser
-- (e.g. postgres / lnicely), because it ALTERs the `users` table which the
-- application's limited DB user is not permitted to do.
--
--   psql -U postgres -d <your_database> -f scripts/partnership-schema.sql
--   (or)  sudo -u postgres psql -d <your_database> -f scripts/partnership-schema.sql

BEGIN;

-- users referral columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS partner_id BIGINT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_source VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_at TIMESTAMP NULL;
CREATE INDEX IF NOT EXISTS users_partner_id_idx ON users(partner_id);

-- partners
CREATE TABLE IF NOT EXISTS partners (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(64) NULL,
  brand_name VARCHAR(255) NULL,
  slug VARCHAR(255) NOT NULL,
  referral_code VARCHAR(255) NOT NULL,
  commission_rate NUMERIC(5,2) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  payout_method VARCHAR(64) NULL,
  payout_email VARCHAR(255) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS partners_slug_key ON partners(slug);
CREATE UNIQUE INDEX IF NOT EXISTS partners_referral_code_key ON partners(referral_code);
CREATE INDEX IF NOT EXISTS partners_user_id_idx ON partners(user_id);
CREATE INDEX IF NOT EXISTS partners_status_idx ON partners(status);

-- partner_referrals
CREATE TABLE IF NOT EXISTS partner_referrals (
  id BIGINT PRIMARY KEY,
  partner_id BIGINT NOT NULL,
  company_id BIGINT NULL,
  referral_code VARCHAR(255) NULL,
  partner_slug VARCHAR(255) NULL,
  source_url TEXT NULL,
  signup_date TIMESTAMP NULL,
  referral_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS partner_referrals_partner_id_idx ON partner_referrals(partner_id);
CREATE INDEX IF NOT EXISTS partner_referrals_company_id_idx ON partner_referrals(company_id);

-- partner_commissions
CREATE TABLE IF NOT EXISTS partner_commissions (
  id BIGINT PRIMARY KEY,
  partner_id BIGINT NOT NULL,
  company_id BIGINT NOT NULL,
  subscription_id BIGINT NULL,
  invoice_id BIGINT NULL,
  order_ref VARCHAR(255) NULL,
  amount NUMERIC(10,2) NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  payout_id BIGINT NULL,
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS partner_commissions_order_ref_key ON partner_commissions(order_ref);
CREATE INDEX IF NOT EXISTS partner_commissions_partner_id_idx ON partner_commissions(partner_id);
CREATE INDEX IF NOT EXISTS partner_commissions_company_id_idx ON partner_commissions(company_id);
CREATE INDEX IF NOT EXISTS partner_commissions_status_idx ON partner_commissions(status);
CREATE INDEX IF NOT EXISTS partner_commissions_payout_id_idx ON partner_commissions(payout_id);

-- partner_payouts
CREATE TABLE IF NOT EXISTS partner_payouts (
  id BIGINT PRIMARY KEY,
  partner_id BIGINT NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  payout_method VARCHAR(64) NULL,
  payout_reference VARCHAR(255) NULL,
  notes TEXT NULL,
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS partner_payouts_partner_id_idx ON partner_payouts(partner_id);
CREATE INDEX IF NOT EXISTS partner_payouts_status_idx ON partner_payouts(status);

-- partner_landing_pages
CREATE TABLE IF NOT EXISTS partner_landing_pages (
  id BIGINT PRIMARY KEY,
  partner_id BIGINT NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  headline VARCHAR(255) NULL,
  subheadline VARCHAR(255) NULL,
  industry_module VARCHAR(255) NULL,
  logo VARCHAR(255) NULL,
  description TEXT NULL,
  call_to_action_text VARCHAR(255) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS partner_landing_pages_partner_slug_key ON partner_landing_pages(partner_id, slug);
CREATE INDEX IF NOT EXISTS partner_landing_pages_partner_id_idx ON partner_landing_pages(partner_id);

-- Make the app's DB user able to use the new tables. Replace <app_db_user>
-- with the user from your production DATABASE_URL if it differs from the owner.
-- (Safe to leave commented out if the app user already inherits privileges.)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON
--   partners, partner_referrals, partner_commissions, partner_payouts, partner_landing_pages
--   TO <app_db_user>;

COMMIT;
