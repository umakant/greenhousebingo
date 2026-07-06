/* eslint-disable no-console */
/**
 * Diagnoses why a theme-customizer change is not showing on the public storefront.
 *
 * It resolves the org + website from a storefront hostname (default phillywaterice.com),
 * then compares:
 *   - the website's ACTIVE theme version pointer (Website.metadata.activeThemeVersionId)
 *     — this is what the public /shop renders, and
 *   - the theme/version you edited in the customizer (default THEME_ID=88, latest version)
 * and reports whether your heading text is present in the ACTIVE version's saved
 * customizerContent. From that it prints a clear verdict: pointer mismatch vs. caching.
 *
 * Usage (run from the nextjs folder on the server):
 *   node ./scripts/diagnose-theme-customizer.js
 *   HOST=phillywaterice.com THEME_ID=88 HEADING="PHILLY WATER ICEs" node ./scripts/diagnose-theme-customizer.js
 */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const HOST = (process.env.HOST ?? "phillywaterice.com").trim().toLowerCase();
const THEME_ID = process.env.THEME_ID ? BigInt(process.env.THEME_ID) : 88n;
const HEADING = (process.env.HEADING ?? "PHILLY WATER ICE").trim();

function asObj(v) {
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

/** Pull every human-readable heading/text out of a customizerContent blob (best-effort, schema-tolerant). */
function summarizeContent(cc) {
  const c = asObj(cc);
  const heroSlides = Array.isArray(asObj(c.heroSlider).slides) ? asObj(c.heroSlider).slides : [];
  const heroHeadings = heroSlides
    .map((s) => (s && typeof s.heading === "string" ? s.heading : ""))
    .filter(Boolean);
  const texts = Array.isArray(c.texts) ? c.texts : [];
  const textRows = texts
    .map((t) => (t && typeof t === "object" ? `${t.find ?? ""} -> ${t.replace ?? ""}` : ""))
    .filter((s) => s.trim() && s !== " -> ");
  const introHeading = typeof asObj(c.introSection).heading === "string" ? asObj(c.introSection).heading : "";
  const bundleHeading = typeof asObj(c.bundleSection).heading === "string" ? asObj(c.bundleSection).heading : "";
  return { heroHeadings, textRows, introHeading, bundleHeading };
}

function containsHeading(cc) {
  try {
    return JSON.stringify(cc ?? {}).toLowerCase().includes(HEADING.toLowerCase());
  } catch {
    return false;
  }
}

async function loadVersionContent(themeVersionId, organizationId) {
  if (themeVersionId == null) return null;
  const tv = await prisma.themeVersion.findFirst({
    where: { id: BigInt(themeVersionId), organizationId },
    select: { id: true, metadata: true },
  });
  if (!tv) return null;
  const meta = asObj(tv.metadata);
  return { id: tv.id, customizerContent: meta.customizerContent ?? null };
}

async function main() {
  console.log(`\n=== Theme customizer diagnostic ===`);
  console.log(`host=${HOST}  themeId=${THEME_ID}  heading="${HEADING}"\n`);

  const domain = await prisma.domain.findUnique({
    where: { hostname: HOST },
    select: { hostname: true, websiteId: true, organizationId: true, status: true },
  });
  if (!domain?.websiteId) {
    console.error(`[FAIL] No domain row for ${HOST}. Run scripts/seed-philly-water-ice-domain.js first.`);
    process.exit(1);
  }
  console.log(`Domain: ${domain.hostname} status=${domain.status} -> websiteId=${domain.websiteId} org=${domain.organizationId}`);

  const organizationId = domain.organizationId;
  const website = await prisma.website.findFirst({
    where: { id: domain.websiteId, organizationId },
    select: { id: true, name: true, slug: true, metadata: true },
  });
  if (!website) {
    console.error(`[FAIL] Website ${domain.websiteId} not found for org ${organizationId}.`);
    process.exit(1);
  }
  const wMeta = asObj(website.metadata);
  const activeThemeId = wMeta.activeThemeId != null ? String(wMeta.activeThemeId) : null;
  const activeThemeVersionId = wMeta.activeThemeVersionId != null ? String(wMeta.activeThemeVersionId) : null;
  console.log(`Website: "${website.name}" (slug=${website.slug})`);
  console.log(`  activeThemeId        = ${activeThemeId ?? "(unset)"}`);
  console.log(`  activeThemeVersionId = ${activeThemeVersionId ?? "(unset)"}`);
  console.log(`  shopifyLiquidPackageFile = ${wMeta.shopifyLiquidPackageFile ?? "(unset)"}\n`);

  // Theme being edited + its versions.
  const editedVersions = await prisma.themeVersion.findMany({
    where: { themeId: THEME_ID, organizationId },
    select: { id: true, createdAt: true },
    orderBy: { id: "desc" },
  });
  const theme = await prisma.theme.findFirst({
    where: { id: THEME_ID, organizationId },
    select: { id: true, name: true, websiteId: true },
  });
  if (!theme) {
    console.log(`[WARN] Theme ${THEME_ID} not found for org ${organizationId} (wrong THEME_ID or org?).`);
  } else {
    console.log(`Edited theme ${theme.id} "${theme.name}" boundWebsiteId=${theme.websiteId ?? "(none)"}`);
  }
  const latestEdited = editedVersions[0]?.id ?? null;
  console.log(`  theme ${THEME_ID} versions (newest first): ${editedVersions.map((v) => v.id).join(", ") || "(none)"}`);
  console.log(`  latest edited version = ${latestEdited ?? "(none)"}\n`);

  // ACTIVE version content (what the public site renders).
  const active = await loadVersionContent(activeThemeVersionId, organizationId);
  // Latest edited version content (what the customizer most likely just saved).
  const edited = await loadVersionContent(latestEdited, organizationId);

  const printContent = (label, vc) => {
    if (!vc) {
      console.log(`${label}: (no version / no metadata)`);
      return;
    }
    const s = summarizeContent(vc.customizerContent);
    console.log(`${label} (versionId=${vc.id}):`);
    console.log(`  hasCustomizerContent = ${vc.customizerContent != null}`);
    console.log(`  hero headings  = ${JSON.stringify(s.heroHeadings)}`);
    console.log(`  intro heading  = ${JSON.stringify(s.introHeading)}`);
    console.log(`  bundle heading = ${JSON.stringify(s.bundleHeading)}`);
    console.log(`  text rows      = ${JSON.stringify(s.textRows)}`);
    console.log(`  contains "${HEADING}" = ${containsHeading(vc.customizerContent)}`);
  };

  printContent("ACTIVE version (rendered by phillywaterice.com)", active);
  console.log("");
  printContent("LATEST edited version (theme " + THEME_ID + ")", edited);

  // ---- Verdict ----
  console.log(`\n=== Verdict ===`);
  const activeHasHeading = active ? containsHeading(active.customizerContent) : false;
  const editedHasHeading = edited ? containsHeading(edited.customizerContent) : false;
  const pointerMatchesEdited =
    activeThemeVersionId != null && latestEdited != null && activeThemeVersionId === String(latestEdited);

  if (!activeThemeVersionId) {
    console.log(`- Website has NO activeThemeVersionId set. The storefront can't render your theme content.`);
    console.log(`  FIX: open the theme in the customizer and Save, or set theme ${THEME_ID} live for this website.`);
  } else if (!pointerMatchesEdited) {
    console.log(`- POINTER MISMATCH: storefront renders version ${activeThemeVersionId}, but you edited version ${latestEdited}.`);
    console.log(`  FIX: set theme ${THEME_ID} as the LIVE/active theme for "${website.name}" (Storefronts -> Themes -> Set live), then re-save.`);
    if (editedHasHeading) {
      console.log(`  (Your "${HEADING}" IS saved on the edited version ${latestEdited} — it just isn't the active one.)`);
    }
  } else if (activeHasHeading) {
    console.log(`- CONTENT IS LIVE IN DB: the active version ${activeThemeVersionId} already contains "${HEADING}".`);
    console.log(`  => This is a CACHE issue. The Concept home HTML is memoized (up to 24h in prod).`);
    console.log(`  FIX: pm2 restart <app>  (clears in-process cache), or set CONCEPT_INDEX_HTML_CACHE_SECONDS=60 in .env and restart.`);
    console.log(`       Then hard-refresh / check in incognito to rule out browser/CDN cache.`);
  } else {
    console.log(`- Active version ${activeThemeVersionId} does NOT contain "${HEADING}".`);
    console.log(`  Your save may not have persisted to this version, or the heading text differs.`);
    console.log(`  Re-save in the customizer and re-run this script; compare the hero headings printed above.`);
  }
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
