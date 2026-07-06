-- Split crm_leads.name into first_name / last_name

ALTER TABLE "crm_leads" ADD COLUMN "first_name" TEXT;
ALTER TABLE "crm_leads" ADD COLUMN "last_name" TEXT;

UPDATE "crm_leads" SET
  "first_name" = CASE
    WHEN trim(coalesce("name", '')) = '' THEN 'Unknown'
    ELSE split_part(trim("name"), ' ', 1)
  END,
  "last_name" = NULLIF(trim(regexp_replace(trim(coalesce("name", '')), '^\S+\s*', '')), '');

UPDATE "crm_leads" SET "first_name" = 'Unknown' WHERE trim(coalesce("first_name", '')) = '';

ALTER TABLE "crm_leads" ALTER COLUMN "first_name" SET NOT NULL;

ALTER TABLE "crm_leads" DROP COLUMN "name";
