import "server-only";

import fs from "fs/promises";
import path from "path";
import { unstable_cache } from "next/cache";

import {
  injectStorefrontAnnouncementBarBrandCss,
  injectStorefrontHideCartRecentlyViewed,
  injectStorefrontHideProductFormAlert,
  injectStorefrontHideThemeSearchDrawer,
  rewriteStorefrontSearchDrawerTriggersToShopSearch,
  injectConceptFooterSocialStack,
  injectStorefrontStickyHeaderCss,
  injectStorefrontPrimaryNavHoverNormalize,
  normalizeShopifyThemeBootNullArtifacts,
  rewritePoweredByShopifyAttribution,
  stripStorefrontShopifyDesignModeAttrs,
} from "@/lib/storefront/liquid/rewrite-storefront-powered-by";
import { rewriteRootShopUrlsInHtml } from "@/lib/storefront/liquid/rewrite-storefront-shop-urls-in-html";
import { normalizeShopThemeAssetUnderscoreUrls } from "@/lib/storefront/liquid/shopify-theme-css-url-rewrite";
import { rewriteStaticHtmlThemeAssetRefs } from "@/lib/storefront/liquid/synthesize-static-html-storefront";
import { stripShopifyHostedRuntimeAssetRefs } from "@/lib/storefront/liquid/strip-shopify-hosted-runtime-scripts";
import { replaceShopifyAccountBlocksForHeadlessStorefront } from "@/lib/storefront/liquid/rewrite-shopify-headless-widgets";
import { joinStorefrontPublicPath } from "@/lib/storefront/custom-domain-hosts";
import { rewriteBrandedRemoteThemeAssetsInHtml } from "@/lib/storefront/liquid/theme-remote-asset-overrides";

/** `public/storefront/theme-packages/concept-theme.zip` — static HTML export, no Liquid templates at runtime. */
export function isConceptThemePackageFile(packageFile: string): boolean {
  const n = packageFile.replace(/\\/g, "/").toLowerCase();
  return n.endsWith("concept-theme.zip") || n.includes("theme-packages/concept-theme.zip");
}

/**
 * Concept `index.html` bootstraps `theme.routes` with Shopify root paths. Runtime fetches use them for
 * section HTML + cart UI; point storefront URLs at `/shop/...` so requests hit this app.
 */
function rewriteConceptThemeBootstrapRoutes(html: string, customDomainRoot: boolean): string {
  if (customDomainRoot) {
    return html;
  }
  return html
    .replace(/\bShopify\.routes\.root\s*=\s*["']\/["']\s*;/g, "Shopify.routes.root = '/shop';")
    .replace(/\bshop_url:\s*['"]\/['"]\s*,/g, "shop_url: '/shop',")
    .replace(/\broot_url:\s*['"]\/['"]\s*,/g, "root_url: '/shop',")
    .replace(/\bcart_url:\s*['"]\/cart['"]\s*,/g, "cart_url: '/shop/cart',")
    .replace(/\bcart_add_url:\s*['"]\/cart\/add['"]\s*,/g, "cart_add_url: '/shop/cart/add',")
    .replace(/\bcart_change_url:\s*['"]\/cart\/change['"]\s*,/g, "cart_change_url: '/shop/cart/change',")
    .replace(/\bcart_update_url:\s*['"]\/cart\/update['"]\s*,/g, "cart_update_url: '/shop/cart/update',")
    .replace(/\bsearch_url:\s*['"]\/search['"]\s*,/g, "search_url: '/shop/search',")
    .replace(/\bpredictive_search_url:\s*['"]\/search\/suggest['"]/g, "predictive_search_url: '/shop/search/suggest'");
}

async function buildRewrittenConceptStorefrontIndexHtml(
  themeRoot: string,
  assetKey: bigint,
  customDomainRoot: boolean,
): Promise<string | null> {
  const abs = path.join(themeRoot, "index.html");
  let raw: string;
  try {
    raw = await fs.readFile(abs, "utf8");
  } catch {
    return null;
  }
  /** Branded URLs first: `rewriteStaticHtmlThemeAssetRefs` strips `./assets/` so `./assets/remote/{hash}` must be swapped before that pass. */
  let html = rewriteBrandedRemoteThemeAssetsInHtml(raw, assetKey.toString());
  html = rewriteStaticHtmlThemeAssetRefs(html, assetKey);
  html = normalizeShopThemeAssetUnderscoreUrls(html);
  html = rewriteBrandedRemoteThemeAssetsInHtml(html, assetKey.toString());
  html = rewriteRootShopUrlsInHtml(html, { customDomainRoot });
  html = rewriteConceptThemeBootstrapRoutes(html, customDomainRoot);
  html = stripShopifyHostedRuntimeAssetRefs(html);
  html = replaceShopifyAccountBlocksForHeadlessStorefront(
    html,
    joinStorefrontPublicPath(customDomainRoot, "account/login"),
  );
  html = normalizeShopifyThemeBootNullArtifacts(html);
  html = stripStorefrontShopifyDesignModeAttrs(html);
  html = injectStorefrontAnnouncementBarBrandCss(html);
  html = injectStorefrontStickyHeaderCss(html);
  html = injectStorefrontPrimaryNavHoverNormalize(html);
  html = injectStorefrontHideCartRecentlyViewed(html);
  html = injectStorefrontHideProductFormAlert(html);
  html = rewriteStorefrontSearchDrawerTriggersToShopSearch(
    html,
    customDomainRoot ? "/search" : "/shop/search",
  );
  html = injectStorefrontHideThemeSearchDrawer(html);
  html = rewritePoweredByShopifyAttribution(html);
  return html;
}

/** Env override in seconds (60–30d). Prod default 24h, dev 3m — evaluated at module load. */
const CONCEPT_INDEX_HTML_REVALIDATE_SECONDS = (() => {
  const raw = process.env.CONCEPT_INDEX_HTML_CACHE_SECONDS?.trim();
  if (raw && /^\d+$/.test(raw)) {
    const n = parseInt(raw, 10);
    if (n >= 60 && n <= 2592000) return n;
  }
  return process.env.NODE_ENV === "production" ? 86400 : 180;
})();

const getCachedRewrittenConceptIndexHtml = unstable_cache(
  async (themeRoot: string, assetKeyStr: string, customDomain: boolean) => {
    const assetKey = BigInt(assetKeyStr);
    return buildRewrittenConceptStorefrontIndexHtml(themeRoot, assetKey, customDomain);
  },
  /** Bump when remote-hash → branded file map or HTML rewrites change (avoids stale src pointing at old `.webp`). */
  ["concept-static-index-html", "v40-footer-logo-size"],
  { revalidate: CONCEPT_INDEX_HTML_REVALIDATE_SECONDS },
);

/**
 * Reads extracted `index.html` from the theme root (ZIP already extracted to disk) and rewrites
 * asset / shop URLs for this deployment. No Liquid engine — the browser runs the theme as shipped.
 *
 * Results are memoized (`CONCEPT_INDEX_HTML_CACHE_SECONDS` or 24h prod / 3m dev) to avoid re-reading multi‑MB HTML every hit.
 */
export async function loadRewrittenConceptStorefrontIndexHtml(
  themeRoot: string,
  /** Same id used in `/shop/theme-assets/{id}/…` (website id in the website-scoped extract flow). */
  assetKey: bigint,
  customDomainRoot = false,
): Promise<string | null> {
  return getCachedRewrittenConceptIndexHtml(themeRoot, assetKey.toString(), customDomainRoot);
}
