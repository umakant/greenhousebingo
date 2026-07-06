/* eslint-disable no-console */
/**
 * Removes Concept theme installs so you can reinstall cleanly:
 * - Deletes all files under storage/storefront-liquid-themes/ (this tree is git-tracked for deploys;
 *   after running, restore with `git restore nextjs/storage/storefront-liquid-themes` or re-upload the theme)
 * - Clears Website.metadata when shopifyLiquidPackageFile references concept-theme.zip
 * - Deletes tenant Theme rows from the Concept template or with concept-theme.zip in metadata
 * - Deletes global ThemeTemplate row slug concept-tech-html (re-seeded on next server boot from instrumentation)
 *
 * Does NOT delete public/storefront/theme-packages/concept-theme.zip
 *
 * Usage (from nextjs/): node ./scripts/remove-concept-theme-install.js
 */
const path = require("node:path");
const fs = require("node:fs/promises");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const CONCEPT_ZIP_SNIPPET = "concept-theme.zip";

function metaRecord(meta) {
  return meta && typeof meta === "object" && !Array.isArray(meta) ? { ...meta } : {};
}

function packageFileFromThemeMetadata(metadata) {
  const m = metaRecord(metadata);
  return typeof m.packageFile === "string" ? m.packageFile : "";
}

function isConceptPackagePath(p) {
  return typeof p === "string" && p.toLowerCase().includes(CONCEPT_ZIP_SNIPPET);
}

async function clearConceptFromAllWebsites() {
  const sites = await prisma.website.findMany({
    select: { id: true, metadata: true },
  });
  let n = 0;
  for (const w of sites) {
    const meta = metaRecord(w.metadata);
    const pkg = typeof meta.shopifyLiquidPackageFile === "string" ? meta.shopifyLiquidPackageFile : "";
    if (!isConceptPackagePath(pkg)) continue;
    delete meta.shopifyLiquidPackageFile;
    delete meta.activeThemeId;
    delete meta.activeThemeVersionId;
    await prisma.website.update({
      where: { id: w.id },
      data: { metadata: meta },
    });
    n += 1;
  }
  console.log(`[remove-concept] Cleared Concept package / active pointers on ${n} website(s).`);
}

async function main() {
  const storageRoot = path.join(__dirname, "..", "storage", "storefront-liquid-themes");
  try {
    await fs.rm(storageRoot, { recursive: true, force: true });
    await fs.mkdir(storageRoot, { recursive: true });
    console.log("[remove-concept] Emptied storage/storefront-liquid-themes/");
  } catch (e) {
    console.warn("[remove-concept] storage cleanup:", e);
  }

  await clearConceptFromAllWebsites();

  const tmpl = await prisma.themeTemplate.findFirst({
    where: { organizationId: null, slug: "concept-tech-html" },
    select: { id: true },
  });

  const allThemes = await prisma.theme.findMany({
    select: { id: true, organizationId: true, sourceTemplateId: true, metadata: true, name: true },
  });

  const toDelete = allThemes.filter((t) => {
    if (tmpl && t.sourceTemplateId === tmpl.id) return true;
    return isConceptPackagePath(packageFileFromThemeMetadata(t.metadata));
  });

  for (const t of toDelete) {
    await prisma.$transaction(async (tx) => {
      const tid = t.id.toString();
      const sites = await tx.website.findMany({
        where: { organizationId: t.organizationId },
        select: { id: true, metadata: true },
      });
      for (const w of sites) {
        const meta = metaRecord(w.metadata);
        if (String(meta.activeThemeId ?? "") !== tid) continue;
        delete meta.activeThemeId;
        delete meta.activeThemeVersionId;
        delete meta.shopifyLiquidPackageFile;
        await tx.website.update({
          where: { id: w.id },
          data: { metadata: meta },
        });
      }
      await tx.theme.delete({ where: { id: t.id } });
    });
    console.log(`[remove-concept] Deleted theme ${t.id} (${t.name}) org ${t.organizationId}`);
  }

  if (tmpl) {
    await prisma.themeTemplate.deleteMany({
      where: { id: tmpl.id, slug: "concept-tech-html", organizationId: null },
    });
    console.log("[remove-concept] Removed global ThemeTemplate concept-tech-html (will re-seed on next app start).");
  }

  if (toDelete.length === 0) {
    console.log("[remove-concept] No installed Concept Theme rows found.");
  }

  console.log("[remove-concept] Done. Reinstall: Storefronts → Themes → install Concept — Tech (HTML export).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
