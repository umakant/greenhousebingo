import type { PrismaClient } from "@prisma/client";

/**
 * Legacy DBs often predate full `ThemeTemplate` columns. Prisma expects `slug`, `metadata`,
 * `preview_url`, etc. Idempotent — safe before ThemeTemplate queries (API) or on server boot.
 */
export async function ensureStorefrontThemeTemplateColumns(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(`
DO $ef$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'storefront_theme_templates'
      AND column_name = 'slug'
  ) THEN
    ALTER TABLE storefront_theme_templates ADD COLUMN slug TEXT;
    UPDATE storefront_theme_templates SET slug = 'theme-' || id::text WHERE slug IS NULL;
    ALTER TABLE storefront_theme_templates ALTER COLUMN slug SET NOT NULL;
  END IF;
END $ef$;
`);

    // One statement per call — Postgres rejects multiple commands in a single prepared statement (42601).
    const alters = [
      `ALTER TABLE storefront_theme_templates ADD COLUMN IF NOT EXISTS metadata JSONB`,
      `ALTER TABLE storefront_theme_templates ADD COLUMN IF NOT EXISTS preview_url TEXT`,
      `ALTER TABLE storefront_theme_templates ADD COLUMN IF NOT EXISTS description TEXT`,
      `ALTER TABLE storefront_theme_templates ADD COLUMN IF NOT EXISTS created_by_id BIGINT`,
      `ALTER TABLE storefront_theme_templates ADD COLUMN IF NOT EXISTS updated_by_id BIGINT`,
    ];
    for (const sql of alters) {
      await prisma.$executeRawUnsafe(sql);
    }
  } catch (e) {
    console.error("[storefront] ensureStorefrontThemeTemplateColumns failed:", e);
    throw e;
  }
}

/** @deprecated Use ensureStorefrontThemeTemplateColumns */
export const ensureThemeTemplateSlugColumn = ensureStorefrontThemeTemplateColumns;
