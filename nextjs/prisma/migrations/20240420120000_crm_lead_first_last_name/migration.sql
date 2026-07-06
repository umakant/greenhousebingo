-- Stub migration: production databases may list this exact name as a failed migration
-- (historical typo vs repo name `20260420120000_crm_lead_first_last_name`).
-- The real CRM column split lives in `20260420120000_crm_lead_first_last_name`.
-- This file exists so `prisma migrate resolve --applied "20240420120000_crm_lead_first_last_name"` can resolve P3009.
-- On fresh installs, running this before the 202604 migration is harmless.
SELECT 1;
