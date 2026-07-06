-- Add optional audit columns expected by Prisma (Theme*, ThemeVersion, section/block/style rows).
-- Fixes P2022: created_by_id / updated_by_id missing on production (theme.findFirst, themeStyleToken.createMany, etc.).
-- Idempotent: safe to re-run.

-- storefront_theme_templates
ALTER TABLE "storefront_theme_templates" ADD COLUMN IF NOT EXISTS "created_by_id" BIGINT;
ALTER TABLE "storefront_theme_templates" ADD COLUMN IF NOT EXISTS "updated_by_id" BIGINT;

DO $$
BEGIN
  ALTER TABLE "storefront_theme_templates"
    ADD CONSTRAINT "storefront_theme_templates_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE "storefront_theme_templates"
    ADD CONSTRAINT "storefront_theme_templates_updated_by_id_fkey"
    FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- storefront_themes
ALTER TABLE "storefront_themes" ADD COLUMN IF NOT EXISTS "created_by_id" BIGINT;
ALTER TABLE "storefront_themes" ADD COLUMN IF NOT EXISTS "updated_by_id" BIGINT;

DO $$
BEGIN
  ALTER TABLE "storefront_themes"
    ADD CONSTRAINT "storefront_themes_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE "storefront_themes"
    ADD CONSTRAINT "storefront_themes_updated_by_id_fkey"
    FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- storefront_theme_versions
ALTER TABLE "storefront_theme_versions" ADD COLUMN IF NOT EXISTS "created_by_id" BIGINT;
ALTER TABLE "storefront_theme_versions" ADD COLUMN IF NOT EXISTS "updated_by_id" BIGINT;

DO $$
BEGIN
  ALTER TABLE "storefront_theme_versions"
    ADD CONSTRAINT "storefront_theme_versions_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE "storefront_theme_versions"
    ADD CONSTRAINT "storefront_theme_versions_updated_by_id_fkey"
    FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- storefront_theme_section_definitions
ALTER TABLE "storefront_theme_section_definitions" ADD COLUMN IF NOT EXISTS "created_by_id" BIGINT;
ALTER TABLE "storefront_theme_section_definitions" ADD COLUMN IF NOT EXISTS "updated_by_id" BIGINT;

DO $$
BEGIN
  ALTER TABLE "storefront_theme_section_definitions"
    ADD CONSTRAINT "storefront_theme_section_definitions_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE "storefront_theme_section_definitions"
    ADD CONSTRAINT "storefront_theme_section_definitions_updated_by_id_fkey"
    FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- storefront_theme_block_definitions
ALTER TABLE "storefront_theme_block_definitions" ADD COLUMN IF NOT EXISTS "created_by_id" BIGINT;
ALTER TABLE "storefront_theme_block_definitions" ADD COLUMN IF NOT EXISTS "updated_by_id" BIGINT;

DO $$
BEGIN
  ALTER TABLE "storefront_theme_block_definitions"
    ADD CONSTRAINT "storefront_theme_block_definitions_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE "storefront_theme_block_definitions"
    ADD CONSTRAINT "storefront_theme_block_definitions_updated_by_id_fkey"
    FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- storefront_theme_style_tokens
ALTER TABLE "storefront_theme_style_tokens" ADD COLUMN IF NOT EXISTS "created_by_id" BIGINT;
ALTER TABLE "storefront_theme_style_tokens" ADD COLUMN IF NOT EXISTS "updated_by_id" BIGINT;

DO $$
BEGIN
  ALTER TABLE "storefront_theme_style_tokens"
    ADD CONSTRAINT "storefront_theme_style_tokens_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE "storefront_theme_style_tokens"
    ADD CONSTRAINT "storefront_theme_style_tokens_updated_by_id_fkey"
    FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
