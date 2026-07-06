-- Repair: ensure `first_name` / `last_name` exist (e.g. DB never ran 20260420120000 or was restored from backup).
-- Safe to run multiple times (uses IF NOT EXISTS + conditional backfill).

ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "first_name" TEXT;
ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "last_name" TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'crm_leads'
      AND column_name = 'name'
  ) THEN
    EXECUTE $fb$
      UPDATE "crm_leads" SET
        "first_name" = CASE
          WHEN trim(coalesce("first_name", '')) <> '' THEN "first_name"
          WHEN trim(coalesce("name", '')) = '' THEN 'Unknown'
          ELSE split_part(trim("name"), ' ', 1)
        END,
        "last_name" = CASE
          WHEN "last_name" IS NOT NULL AND trim(coalesce("last_name", '')) <> '' THEN "last_name"
          ELSE NULLIF(trim(regexp_replace(trim(coalesce("name", '')), '^\S+\s*', '')), '')
        END
      WHERE "first_name" IS NULL OR trim(coalesce("first_name", '')) = '';
    $fb$;
  END IF;
END $$;

UPDATE "crm_leads" SET "first_name" = 'Unknown' WHERE "first_name" IS NULL OR trim(coalesce("first_name", '')) = '';

ALTER TABLE "crm_leads" ALTER COLUMN "first_name" SET NOT NULL;
