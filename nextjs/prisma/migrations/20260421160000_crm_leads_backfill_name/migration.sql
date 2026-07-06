-- Backfill denormalized `name` from first_name / last_name where missing.
-- Avoids runtime errors when existing rows have NULL `name` (e.g. after first/last split).

ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "name" TEXT;

UPDATE "crm_leads"
SET "name" = CASE
  WHEN trim(coalesce("first_name", '')) <> '' THEN NULLIF(trim(concat("first_name", ' ', coalesce("last_name", ''))), '')
  ELSE 'Unknown'
END
WHERE "name" IS NULL OR trim(coalesce("name", '')) = '';
