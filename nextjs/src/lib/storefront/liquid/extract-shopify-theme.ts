import "server-only";

import fs from "fs/promises";
import path from "path";

import StreamZip from "node-stream-zip";

import { isConceptThemePackageFile } from "@/lib/storefront/liquid/concept-static-storefront-html";
import { synthesizeStaticHtmlStorefrontTheme } from "@/lib/storefront/liquid/synthesize-static-html-storefront";

/** On-disk extract root for a published theme version (Shopify ZIP → Liquid runtime). */
export function liquidThemeExtractRoot(organizationId: bigint, themeVersionId: bigint): string {
  // Use normalize + template for the dynamic tail so Turbopack does not treat this as a
  // path.join(..., <dynamic>, <dynamic>) filesystem glob over storage/storefront-liquid-themes/**.
  const org = organizationId.toString();
  const vid = themeVersionId.toString();
  return path.normalize(`${process.cwd()}/storage/storefront-liquid-themes/${org}/${vid}`);
}

/**
 * Live `/shop` Liquid extract keyed by **website** (ZIP path on `Website.metadata.shopifyLiquidPackageFile`).
 * Prefixed `w-` so it never collides with legacy numeric `ThemeVersion` extract folders under the same org.
 */
export function liquidWebsiteStorefrontRoot(organizationId: bigint, websiteId: bigint): string {
  const org = organizationId.toString();
  const wid = websiteId.toString();
  return path.normalize(`${process.cwd()}/storage/storefront-liquid-themes/${org}/w-${wid}`);
}

/**
 * ThemeForest / macOS ZIPs often wrap the theme in one top-level folder so `layout/theme.liquid`
 * would sit at `{dest}/{folder}/layout/...`. Our Liquid runtime expects `{dest}/layout/theme.liquid`.
 */
async function hoistSingleNestedShopifyThemeRoot(dest: string): Promise<void> {
  try {
    await fs.access(path.join(dest, "layout", "theme.liquid"));
    return;
  } catch {
    /* continue */
  }
  let entries;
  try {
    entries = await fs.readdir(dest, { withFileTypes: true });
  } catch {
    return;
  }
  const dirs = entries.filter((d) => d.isDirectory() && !d.name.startsWith(".") && d.name !== "__MACOSX");
  if (dirs.length !== 1) return;
  const inner = path.join(dest, dirs[0]!.name);
  try {
    await fs.access(path.join(inner, "layout", "theme.liquid"));
  } catch {
    return;
  }
  const innerNames = await fs.readdir(inner);
  for (const name of innerNames) {
    await fs.rename(path.join(inner, name), path.join(dest, name));
  }
  await fs.rm(inner, { recursive: true, force: true });
  await fs.rm(path.join(dest, "__MACOSX"), { recursive: true, force: true }).catch(() => {});
}

/** When the ZIP has a single top-level folder containing `index.html` (static HTML export), flatten to `dest`. */
async function hoistSingleNestedStaticHtmlRoot(dest: string): Promise<void> {
  try {
    await fs.access(path.join(dest, "index.html"));
    return;
  } catch {
    /* continue */
  }
  let entries;
  try {
    entries = await fs.readdir(dest, { withFileTypes: true });
  } catch {
    return;
  }
  const dirs = entries.filter((d) => d.isDirectory() && !d.name.startsWith(".") && d.name !== "__MACOSX");
  if (dirs.length !== 1) return;
  const inner = path.join(dest, dirs[0]!.name);
  try {
    await fs.access(path.join(inner, "index.html"));
  } catch {
    return;
  }
  const innerNames = await fs.readdir(inner);
  for (const name of innerNames) {
    await fs.rename(path.join(inner, name), path.join(dest, name));
  }
  await fs.rm(inner, { recursive: true, force: true });
  await fs.rm(path.join(dest, "__MACOSX"), { recursive: true, force: true }).catch(() => {});
}

async function extractShopifyZipToDest(
  packageFile: string,
  dest: string,
  /** Passed into static HTML synthesis for `/shop/theme-assets/{id}/` URL prefixes. */
  assetKeyForSynthesis: bigint,
): Promise<string> {
  const rel = packageFile.startsWith("/") ? packageFile.slice(1) : packageFile;
  const zipAbs = path.join(process.cwd(), "public", rel);
  await fs.rm(dest, { recursive: true, force: true });
  await fs.mkdir(dest, { recursive: true });
  const zip = new StreamZip.async({ file: zipAbs });
  try {
    await zip.extract(null, dest);
  } finally {
    await zip.close();
  }
  await hoistSingleNestedShopifyThemeRoot(dest);
  await hoistSingleNestedStaticHtmlRoot(dest);
  await fs.rm(path.join(dest, "__MACOSX"), { recursive: true, force: true }).catch(() => {});

  let synthesizedStaticHtml = false;
  try {
    await fs.access(path.join(dest, "layout", "theme.liquid"));
  } catch {
    /** Concept export: keep the ZIP’s HTML only — do not generate `layout/*.liquid` or `templates/*.liquid`. */
    if (isConceptThemePackageFile(packageFile)) {
      await fs.access(path.join(dest, "index.html"));
    } else {
      synthesizedStaticHtml = await synthesizeStaticHtmlStorefrontTheme(dest, assetKeyForSynthesis);
    }
  }

  await fs.writeFile(
    path.join(dest, ".pf-extracted.json"),
    JSON.stringify(
      { packageFile, extractedAt: new Date().toISOString(), synthesizedStaticHtml },
      null,
      2,
    ),
    "utf8",
  );
  return dest;
}

/**
 * Extracts a Shopify theme ZIP from `public/…` into `storage/storefront-liquid-themes/{org}/{themeVersionId}/`.
 * Used by tests and legacy flows; live storefront prefers {@link extractShopifyThemeZipForWebsite}.
 */
export async function extractShopifyThemeForLiquid(
  organizationId: bigint,
  themeVersionId: bigint,
  packageFile: string,
): Promise<string> {
  const dest = liquidThemeExtractRoot(organizationId, themeVersionId);
  await extractShopifyZipToDest(packageFile, dest, themeVersionId);
  return dest;
}

/**
 * Extracts the active storefront theme ZIP for a **website** (no `ThemeVersion` disk path).
 * `packageFile` is the same `public/…` relative path as theme ZIP metadata (e.g. `/storefront/theme-packages/concept-theme.zip`).
 */
export async function extractShopifyThemeZipForWebsite(
  organizationId: bigint,
  websiteId: bigint,
  packageFile: string,
): Promise<string> {
  const dest = liquidWebsiteStorefrontRoot(organizationId, websiteId);
  await extractShopifyZipToDest(packageFile, dest, websiteId);
  return dest;
}

/**
 * Extract is usable for `/shop` when the theme root already has runnable files on disk.
 *
 * **Liquid ZIP:** `layout/theme.liquid` must exist.
 *
 * **Concept / static HTML export:** `index.html` at the theme root is enough — no `.pf-extracted.json`
 * and no ZIP read on the request path. `storage/storefront-liquid-themes/{org}/w-{id}/` is committed in-repo
 * so production matches dev; theme upload still overwrites this path locally.
 */
/** Avoid path.join(dynamicRoot, …) — Turbopack treats that as a project-wide filesystem glob. */
async function accessThemeFile(root: string, relativePath: string): Promise<boolean> {
  try {
    await fs.access(/* turbopackIgnore: true */ `${root}/${relativePath}`);
    return true;
  } catch {
    return false;
  }
}

async function storefrontExtractThemeReady(root: string): Promise<boolean> {
  if (await accessThemeFile(root, "layout/theme.liquid")) return true;
  return accessThemeFile(root, "index.html");
}

export async function liquidThemeExtractExists(organizationId: bigint, themeVersionId: bigint): Promise<boolean> {
  return storefrontExtractThemeReady(liquidThemeExtractRoot(organizationId, themeVersionId));
}

export async function liquidWebsiteStorefrontExtractExists(organizationId: bigint, websiteId: bigint): Promise<boolean> {
  return storefrontExtractThemeReady(liquidWebsiteStorefrontRoot(organizationId, websiteId));
}

/** Resolve on-disk theme folder (website-scoped extract preferred, then legacy version id folder). */
export async function resolveThemeExtractRootPath(
  organizationId: bigint,
  themeWebsiteId: bigint | null,
  themeVersionId: bigint,
): Promise<string | null> {
  if (themeWebsiteId != null) {
    const wRoot = liquidWebsiteStorefrontRoot(organizationId, themeWebsiteId);
    if (await storefrontExtractThemeReady(wRoot)) return wRoot;
  }
  const vRoot = liquidThemeExtractRoot(organizationId, themeVersionId);
  if (await storefrontExtractThemeReady(vRoot)) return vRoot;
  return null;
}

export async function removeLiquidWebsiteStorefrontDir(organizationId: bigint, websiteId: bigint): Promise<void> {
  const root = liquidWebsiteStorefrontRoot(organizationId, websiteId);
  await fs.rm(root, { recursive: true, force: true }).catch(() => {});
}
