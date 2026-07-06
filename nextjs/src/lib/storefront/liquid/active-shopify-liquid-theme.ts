import "server-only";

import { prisma } from "@/lib/prisma";

import {
  extractShopifyThemeZipForWebsite,
  liquidWebsiteStorefrontExtractExists,
  liquidWebsiteStorefrontRoot,
} from "./extract-shopify-theme";

export type ActiveShopifyLiquidTheme = {
  themeRoot: string;
  /**
   * Segment in `/shop/theme-assets/{id}/…` — **website id** when the ZIP is bound on the website;
   * legacy installs may still use a numeric theme version id until migration runs.
   */
  themeVersionId: string;
  packageFile: string;
};

const PACKAGE_META_KEY = "shopifyLiquidPackageFile";

async function persistWebsitePackageFile(
  websiteId: bigint,
  organizationId: bigint,
  meta: Record<string, unknown>,
  packageFile: string,
): Promise<void> {
  const next = { ...meta, [PACKAGE_META_KEY]: packageFile };
  await prisma.website.update({
    where: { id: websiteId, organizationId },
    data: { metadata: next as object },
  });
}

/**
 * Resolves the live Shopify ZIP theme for `/shop` Liquid.
 *
 * **Website-first:** `Website.metadata.shopifyLiquidPackageFile` points at `public/…` ZIP; files live under
 * `storage/storefront-liquid-themes/{org}/w-{websiteId}/`. No `Theme` / `ThemeVersion` read on the hot path.
 *
 * **One-shot migration:** if that key is missing but `activeThemeVersionId` + `Theme.metadata.packageFile`
 * exist, we copy the path onto the website and extract to the website folder (then drop DB reads on later requests).
 */
export async function getActiveShopifyLiquidTheme(
  organizationId: bigint,
  websiteId: bigint,
): Promise<ActiveShopifyLiquidTheme | null> {
  const site = await prisma.website.findFirst({
    where: { id: websiteId, organizationId },
    select: { id: true, metadata: true },
  });
  if (!site) return null;

  const meta =
    site.metadata && typeof site.metadata === "object" && !Array.isArray(site.metadata)
      ? ({ ...(site.metadata as Record<string, unknown>) } as Record<string, unknown>)
      : {};

  let packageFile =
    typeof meta[PACKAGE_META_KEY] === "string" ? String(meta[PACKAGE_META_KEY]).trim() : "";

  if (!packageFile) {
    const rawTv = meta.activeThemeVersionId;
    if (rawTv == null || rawTv === "") return null;
    let themeVersionId: bigint;
    try {
      themeVersionId = BigInt(String(rawTv));
    } catch {
      return null;
    }

    const tv = await prisma.themeVersion.findFirst({
      where: { id: themeVersionId, organizationId },
      include: { theme: { select: { metadata: true } } },
    });
    if (!tv) return null;

    const thMeta = tv.theme.metadata as Record<string, unknown> | null;
    if (thMeta?.kind !== "shopify_zip" || typeof thMeta.packageFile !== "string") return null;

    packageFile = thMeta.packageFile.trim();
    if (!packageFile) return null;

    await persistWebsitePackageFile(websiteId, organizationId, meta, packageFile);
    meta[PACKAGE_META_KEY] = packageFile;
  }

  const root = liquidWebsiteStorefrontRoot(organizationId, websiteId);
  const ok = await liquidWebsiteStorefrontExtractExists(organizationId, websiteId);
  if (!ok) {
    try {
      await extractShopifyThemeZipForWebsite(organizationId, websiteId, packageFile);
    } catch (e) {
      console.warn("[active-shopify-liquid-theme] website theme extract failed:", e);
      return null;
    }
  }

  return {
    themeRoot: root,
    themeVersionId: websiteId.toString(),
    packageFile,
  };
}
