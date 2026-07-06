import "server-only";
import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";
import { applyThemeCustomizerContentToHtml } from "@/lib/storefront/theme-customizer-content";
import { tryRenderStorefrontThemeChromeHtml } from "@/lib/storefront/liquid/render-storefront-theme-chrome";
import { buildPublicStorefrontSettings, type PublicStorefrontBrandSettings } from "@/lib/storefront/public-storefront-settings";
import {
  shopRouteFindDomainByHostname,
  shopRouteGetActiveShopifyLiquidTheme,
  shopRouteGetSettingsForOwner,
  shopRouteGetStorefrontThemeCssVars,
  shopRouteGetStorefrontThemeCustomizerContent,
} from "@/lib/storefront/shop-route-request-cache";
import { storefrontAuthorityForUrls, storefrontHostnameForLookup } from "@/lib/storefront/storefront-host-header";

export type StorefrontShellContext = {
  /** Database identifiers resolved from the active host. */
  organizationId: bigint;
  websiteId: bigint;
  /** Public-facing brand settings (logo, store name, currency display, etc.). */
  publicSettings: PublicStorefrontBrandSettings;
  /** Shopify-style CSS variables prefixed with `--`, ready to spread onto a wrapper element. */
  cssVars: Record<string, string>;
  /**
   * Full Liquid theme document with the `<main id="MainContent">` block replaced by a React mount
   * slot, ready to hand to `<StorefrontLiquidReactChrome html=...>`. `null` when the storefront has
   * no active Liquid theme — callers should fall back to a React-only shell in that case.
   */
  themeChromeHtml: string | null;
};

/**
 * Resolve the storefront context (org, website, branded settings, and a Liquid theme chrome
 * document) for any top-level public route that wants to render *inside* the same header/footer
 * shell as `/shop`.
 *
 * Mirrors the setup the `/shop/[[...segments]]` catch-all does for blog/help/cart/checkout — kept
 * here as a small helper so other routes (`/events`, future PR pages, etc.) can opt in without
 * duplicating the host-resolution + theme-loading + customizer-overrides plumbing.
 *
 * Returns `null` when:
 *  - the request hostname has no matching `Domain` row, or
 *  - the matched `Domain` has no associated `Website`.
 *
 * On all other failures (theme load, customizer content, etc.) the helper degrades gracefully:
 * partial data is returned with `themeChromeHtml: null` so callers can still render their content
 * without the Liquid shell.
 */
export async function resolveStorefrontShellContextFromHeaders(): Promise<StorefrontShellContext | null> {
  const h = await headers();
  const hostRaw = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const hostname = storefrontHostnameForLookup(hostRaw);
  if (!hostname) return null;

  const domain = await shopRouteFindDomainByHostname(hostname);
  if (!domain?.website) return null;

  const organizationId = domain.website.organizationId;
  const websiteId = domain.website.id;
  return loadStorefrontShellContextForOrgWebsite(organizationId, websiteId);
}

async function loadStorefrontShellContextForOrgWebsite(
  organizationId: bigint,
  websiteId: bigint,
): Promise<StorefrontShellContext | null> {
  const h = await headers();
  const hostRaw = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const requestAuthority = storefrontAuthorityForUrls(hostRaw);
  const xfProto = h.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  const protocol = xfProto === "http" ? "http:" : "https:";

  const [settings, styleVars, liquidTheme, customizerContent] = await Promise.all([
    shopRouteGetSettingsForOwner(organizationId),
    shopRouteGetStorefrontThemeCssVars(organizationId, websiteId).catch((e) => {
      console.warn("[resolveStorefrontShellContext] getStorefrontThemeCssVars failed:", e);
      return {} as Record<string, string>;
    }),
    shopRouteGetActiveShopifyLiquidTheme(organizationId, websiteId).catch((e) => {
      console.warn("[resolveStorefrontShellContext] getActiveShopifyLiquidTheme failed:", e);
      return null;
    }),
    shopRouteGetStorefrontThemeCustomizerContent(organizationId, websiteId).catch((e) => {
      console.warn("[resolveStorefrontShellContext] getStorefrontThemeCustomizerContent failed:", e);
      return null;
    }),
  ]);

  const publicSettings = buildPublicStorefrontSettings(settings);

  const cssVars = Object.entries(styleVars).reduce<Record<string, string>>((acc, [k, v]) => {
    acc[`--${k.replace(/[^a-zA-Z0-9-_]/g, "-")}`] = v;
    return acc;
  }, {});

  let themeChromeHtml: string | null = null;
  if (liquidTheme) {
    const themeAssetRouteId =
      liquidTheme.themeVersionId != null && liquidTheme.themeVersionId !== ""
        ? String(liquidTheme.themeVersionId)
        : undefined;
    const applyContentOverrides = (html: string) =>
      applyThemeCustomizerContentToHtml(html, customizerContent, { themeAssetRouteId });

    try {
      themeChromeHtml = await tryRenderStorefrontThemeChromeHtml({
        themeRoot: liquidTheme.themeRoot,
        themeVersionId: liquidTheme.themeVersionId,
        packageFile: liquidTheme.packageFile,
        protocol,
        requestAuthority,
        applyContentOverrides,
        publicSettings,
        organizationId,
        websiteId,
      });
    } catch (e) {
      console.warn("[resolveStorefrontShellContext] tryRenderStorefrontThemeChromeHtml failed:", e);
      themeChromeHtml = null;
    }
  }

  return {
    organizationId,
    websiteId,
    publicSettings,
    cssVars,
    themeChromeHtml,
  };
}

/** Resolve Liquid theme chrome for a website id (customer account routes under `/storefront/account/w/...`). */
export async function resolveStorefrontShellContextForWebsite(
  websiteId: string,
): Promise<StorefrontShellContext | null> {
  if (!/^\d+$/.test(websiteId.trim())) return null;
  let wid: bigint;
  try {
    wid = BigInt(websiteId.trim());
  } catch {
    return null;
  }
  const site = await prisma.website.findFirst({
    where: { id: wid },
    select: { organizationId: true },
  });
  if (!site) return null;
  return loadStorefrontShellContextForOrgWebsite(site.organizationId, wid);
}
