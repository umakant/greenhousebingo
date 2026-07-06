-- Align storefront theme tables with Prisma (ThemeVersion, ThemeSectionDefinition, ThemeBlockDefinition, ThemeStyleToken).
-- Fixes: Invalid `prisma.themeVersion.create()` … column `organization_id` does not exist.
-- Idempotent: safe to re-run.

-- 1) Theme versions: denormalized org from parent theme
ALTER TABLE "storefront_theme_versions" ADD COLUMN IF NOT EXISTS "organization_id" BIGINT;

DELETE FROM "storefront_theme_versions" AS tv
WHERE NOT EXISTS (SELECT 1 FROM "storefront_themes" AS t WHERE t.id = tv.theme_id);

UPDATE "storefront_theme_versions" AS tv
SET "organization_id" = t.organization_id
FROM "storefront_themes" AS t
WHERE tv.theme_id = t.id
  AND (tv.organization_id IS NULL OR tv.organization_id IS DISTINCT FROM t.organization_id);

ALTER TABLE "storefront_theme_versions" ALTER COLUMN "organization_id" SET NOT NULL;

DO $$
BEGIN
  ALTER TABLE "storefront_theme_versions"
    ADD CONSTRAINT "storefront_theme_versions_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "storefront_theme_versions_organization_id_idx" ON "storefront_theme_versions" ("organization_id");
CREATE INDEX IF NOT EXISTS "storefront_theme_versions_organization_id_status_idx" ON "storefront_theme_versions" ("organization_id", "status");

-- 2) Section definitions: from theme version
ALTER TABLE "storefront_theme_section_definitions" ADD COLUMN IF NOT EXISTS "organization_id" BIGINT;

UPDATE "storefront_theme_section_definitions" AS sd
SET "organization_id" = tv.organization_id
FROM "storefront_theme_versions" AS tv
WHERE sd.theme_version_id = tv.id
  AND (sd.organization_id IS NULL OR sd.organization_id IS DISTINCT FROM tv.organization_id);

ALTER TABLE "storefront_theme_section_definitions" ALTER COLUMN "organization_id" SET NOT NULL;

DO $$
BEGIN
  ALTER TABLE "storefront_theme_section_definitions"
    ADD CONSTRAINT "storefront_theme_section_definitions_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "storefront_theme_section_definitions_organization_id_idx"
  ON "storefront_theme_section_definitions" ("organization_id");
CREATE INDEX IF NOT EXISTS "storefront_theme_section_definitions_org_theme_version_idx"
  ON "storefront_theme_section_definitions" ("organization_id", "theme_version_id");

-- 3) Block definitions: from section definition
ALTER TABLE "storefront_theme_block_definitions" ADD COLUMN IF NOT EXISTS "organization_id" BIGINT;

UPDATE "storefront_theme_block_definitions" AS bd
SET "organization_id" = sd.organization_id
FROM "storefront_theme_section_definitions" AS sd
WHERE bd.theme_section_def_id = sd.id
  AND (bd.organization_id IS NULL OR bd.organization_id IS DISTINCT FROM sd.organization_id);

ALTER TABLE "storefront_theme_block_definitions" ALTER COLUMN "organization_id" SET NOT NULL;

DO $$
BEGIN
  ALTER TABLE "storefront_theme_block_definitions"
    ADD CONSTRAINT "storefront_theme_block_definitions_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "storefront_theme_block_definitions_organization_id_idx"
  ON "storefront_theme_block_definitions" ("organization_id");
CREATE INDEX IF NOT EXISTS "storefront_theme_block_definitions_org_section_idx"
  ON "storefront_theme_block_definitions" ("organization_id", "theme_section_def_id");

-- 4) Style tokens: from theme version
ALTER TABLE "storefront_theme_style_tokens" ADD COLUMN IF NOT EXISTS "organization_id" BIGINT;

UPDATE "storefront_theme_style_tokens" AS st
SET "organization_id" = tv.organization_id
FROM "storefront_theme_versions" AS tv
WHERE st.theme_version_id = tv.id
  AND (st.organization_id IS NULL OR st.organization_id IS DISTINCT FROM tv.organization_id);

ALTER TABLE "storefront_theme_style_tokens" ALTER COLUMN "organization_id" SET NOT NULL;

DO $$
BEGIN
  ALTER TABLE "storefront_theme_style_tokens"
    ADD CONSTRAINT "storefront_theme_style_tokens_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "storefront_theme_style_tokens_organization_id_idx"
  ON "storefront_theme_style_tokens" ("organization_id");
CREATE INDEX IF NOT EXISTS "storefront_theme_style_tokens_org_theme_version_idx"
  ON "storefront_theme_style_tokens" ("organization_id", "theme_version_id");
CREATE INDEX IF NOT EXISTS "storefront_theme_style_tokens_theme_version_token_key_idx"
  ON "storefront_theme_style_tokens" ("theme_version_id", "token_key");
