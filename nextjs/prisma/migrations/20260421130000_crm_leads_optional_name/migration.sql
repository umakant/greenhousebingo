-- Optional denormalized `name` for display / legacy consumers; keep in sync with first_name + last_name in app.
ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "name" TEXT;

UPDATE "crm_leads" SET "name" = NULLIF(
  trim(concat(coalesce("first_name", ''), ' ', coalesce("last_name", ''))),
  ''
) WHERE "name" IS NULL OR trim(coalesce("name", '')) = '';
