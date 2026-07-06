import "server-only";

import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";
import {
  STOREFRONT_HTML_REVALIDATE_SECONDS,
  storefrontChromeHtmlCacheTag,
  storefrontHtmlContentHash,
} from "@/lib/storefront/cached-concept-home-html";
import { applyStorefrontBrandIdentityToHtml } from "@/lib/storefront/apply-storefront-brand-to-html";
import type { PublicStorefrontBrandSettings } from "@/lib/storefront/public-storefront-settings";
import { storefrontProductPublicLiveWhere } from "@/lib/storefront/storefront-product-public-visibility";
import {
  isConceptThemePackageFile,
  loadRewrittenConceptStorefrontIndexHtml,
} from "@/lib/storefront/liquid/concept-static-storefront-html";
import { htmlHasPfReactMainSlot, injectPfReactMainSlot } from "@/lib/storefront/liquid/inject-react-main-slot";
import { injectStorefrontReactMainSlotThemeCss } from "@/lib/storefront/liquid/rewrite-storefront-powered-by";
import { stripPaperFlightUnsupportedConceptNav } from "@/lib/storefront/liquid/rewrite-storefront-shop-urls-in-html";
import { tryRenderShopifyLiquidStorefront } from "@/lib/storefront/liquid/render-storefront-liquid";
import { joinStorefrontPublicPath } from "@/lib/storefront/custom-domain-hosts";
import {
  listFeaturedTabsCollectionsForConceptHome,
  listPublicStorefrontCollections,
} from "@/lib/storefront/public-catalog";
import { applyCartDrawerEmptyCollectionsToHtml } from "@/lib/storefront/theme-concept-cart-drawer-empty-collections";
import { applyFooterStorefrontCollectionsToHtml } from "@/lib/storefront/theme-concept-footer-collections";
import { applyShopMegaMenuFeaturedTabsToHtml } from "@/lib/storefront/theme-concept-shop-mega-menu";
import { applyCollectionsMegaMenuCardsToHtml } from "@/lib/storefront/theme-concept-collections-mega-cards";

/**
 * Full theme HTML (homepage shell) with `<main id="MainContent">` replaced by a React mount slot.
 * Used for `/shop/cart`, `/shop/checkout`, etc. so header/footer match the landing page.
 */
type StorefrontThemeChromeOpts = {
  themeRoot: string;
  themeVersionId: string;
  packageFile: string | null | undefined;
  protocol: string;
  requestAuthority: string;
  applyContentOverrides: (html: string) => string;
  publicSettings: PublicStorefrontBrandSettings;
  organizationId: bigint;
  websiteId: bigint;
  /** True on merchant custom domains (phillywaterice.com) so chrome URLs stay root-relative (no `/shop`). */
  customDomainRoot?: boolean;
  /**
   * When provided, the rendered chrome is cached across requests keyed by site + theme + host +
   * a hash of this string (customizer / brand / footer content). Omit to render uncached.
   */
  contentVersionKey?: string;
};

/**
 * The chrome (header/footer shell) is website-scoped, not page-specific, so the same shell is reused
 * by every storefront page. When `contentVersionKey` is supplied we memoize it across requests to
 * avoid re-running the product count + collections + featured-tabs queries + Liquid render per hit.
 * Theme/customizer/brand edits change the key (instant refresh); catalog data is bounded by
 * `STOREFRONT_HTML_REVALIDATE_SECONDS`, or call `revalidateTag(storefrontChromeHtmlCacheTag(id))`.
 */
export async function tryRenderStorefrontThemeChromeHtml(
  opts: StorefrontThemeChromeOpts,
): Promise<string | null> {
  if (!opts.contentVersionKey) {
    return buildStorefrontThemeChromeHtml(opts);
  }
  const websiteIdStr = opts.websiteId.toString();
  const cached = unstable_cache(
    () => buildStorefrontThemeChromeHtml(opts),
    [
      "storefront-theme-chrome-html",
      "v1",
      websiteIdStr,
      opts.customDomainRoot ? "cd" : "shop",
      opts.themeVersionId || "nover",
      opts.protocol || "https:",
      opts.requestAuthority || "noauth",
      storefrontHtmlContentHash(opts.contentVersionKey),
    ],
    { revalidate: STOREFRONT_HTML_REVALIDATE_SECONDS, tags: [storefrontChromeHtmlCacheTag(websiteIdStr)] },
  );
  return cached();
}

async function buildStorefrontThemeChromeHtml(opts: StorefrontThemeChromeOpts): Promise<string | null> {
  const {
    themeRoot,
    themeVersionId,
    packageFile,
    protocol,
    requestAuthority,
    applyContentOverrides,
    publicSettings,
    organizationId,
    websiteId,
    customDomainRoot = false,
  } = opts;

  const collectionPathPrefix = joinStorefrontPublicPath(customDomainRoot, "collections");
  const productPathPrefix = joinStorefrontPublicPath(customDomainRoot, "products");

  let productsCount = 0;
  try {
    productsCount = await prisma.posProduct.count({
      where: { organizationId, ...storefrontProductPublicLiveWhere() },
    });
  } catch (e) {
    console.warn("[tryRenderStorefrontThemeChromeHtml] posProduct.count failed:", e);
  }

  /** Concept ZIP: reuse rewritten static index (same assets/header/footer as `/shop` when configured). */
  if (packageFile && isConceptThemePackageFile(packageFile)) {
    try {
      const raw = await loadRewrittenConceptStorefrontIndexHtml(themeRoot, BigInt(themeVersionId), customDomainRoot);
      if (raw?.trim()) {
        let html = applyContentOverrides(raw);
        html = applyStorefrontBrandIdentityToHtml(html, publicSettings);
        let footerCols: Awaited<ReturnType<typeof listPublicStorefrontCollections>> = [];
        try {
          footerCols = await listPublicStorefrontCollections(organizationId, websiteId);
        } catch (e) {
          console.warn("[tryRenderStorefrontThemeChromeHtml] footer collections list failed:", e);
        }
        html = applyFooterStorefrontCollectionsToHtml(html, footerCols, { collectionPathPrefix });
        html = applyCartDrawerEmptyCollectionsToHtml(html, footerCols, { collectionPathPrefix });
        if (footerCols.length > 0) {
          html = applyCollectionsMegaMenuCardsToHtml(html, footerCols, {
            collectionPathPrefix,
            maxCollectionCards: 4,
          });
        }
        try {
          const megaTabs = await listFeaturedTabsCollectionsForConceptHome(organizationId, websiteId, {
            maxTabs: 8,
            maxProductsPerTab: 12,
          });
          if (megaTabs.length > 0) {
            html = applyShopMegaMenuFeaturedTabsToHtml(html, megaTabs, {
              productPathPrefix,
              collectionPathPrefix,
            });
          }
        } catch (e) {
          console.warn("[tryRenderStorefrontThemeChromeHtml] shop mega-menu hydrate failed:", e);
        }
        html = stripPaperFlightUnsupportedConceptNav(html);
        const conceptShell = injectStorefrontReactMainSlotThemeCss(injectPfReactMainSlot(html));
        if (!htmlHasPfReactMainSlot(conceptShell)) {
          console.error(
            "[tryRenderStorefrontThemeChromeHtml] Missing #pf-react-main-slot after inject (theme <main> shape not recognized). Falling back to React-only cart/checkout shell.",
          );
          return null;
        }
        return conceptShell;
      }
    } catch (e) {
      console.warn("[tryRenderStorefrontThemeChromeHtml] Concept index load failed:", e);
    }
  }

  const liquid = await tryRenderShopifyLiquidStorefront({
    themeRoot,
    themeVersionId,
    protocol,
    requestAuthority,
    requestPath: "/shop",
    segments: [],
    settingsBrand: publicSettings,
    productsCount,
    product: null,
    collection: null,
    cmsPageLiquid: null,
    searchQuery: "",
    organizationId,
    websiteId,
    customDomainRoot,
  });

  if (!liquid?.html) return null;

  let html = applyStorefrontBrandIdentityToHtml(applyContentOverrides(liquid.html), publicSettings);
  let footerCols: Awaited<ReturnType<typeof listPublicStorefrontCollections>> = [];
  try {
    footerCols = await listPublicStorefrontCollections(organizationId, websiteId);
  } catch (e) {
    console.warn("[tryRenderStorefrontThemeChromeHtml] footer collections list failed (Liquid shell):", e);
  }
  html = applyFooterStorefrontCollectionsToHtml(html, footerCols, { collectionPathPrefix });
  html = applyCartDrawerEmptyCollectionsToHtml(html, footerCols, { collectionPathPrefix });
  if (footerCols.length > 0) {
    html = applyCollectionsMegaMenuCardsToHtml(html, footerCols, {
      collectionPathPrefix,
      maxCollectionCards: 4,
    });
  }
  try {
    const megaTabs = await listFeaturedTabsCollectionsForConceptHome(organizationId, websiteId, {
      maxTabs: 8,
      maxProductsPerTab: 12,
    });
    if (megaTabs.length > 0) {
      html = applyShopMegaMenuFeaturedTabsToHtml(html, megaTabs, {
        productPathPrefix,
        collectionPathPrefix,
      });
    }
  } catch (e) {
    console.warn("[tryRenderStorefrontThemeChromeHtml] shop mega-menu hydrate failed (Liquid shell):", e);
  }
  const liquidShell = injectStorefrontReactMainSlotThemeCss(injectPfReactMainSlot(html));
  if (!htmlHasPfReactMainSlot(liquidShell)) {
    console.error(
      "[tryRenderStorefrontThemeChromeHtml] Missing #pf-react-main-slot after inject (Liquid layout). Falling back to React-only cart/checkout shell.",
    );
    return null;
  }
  return liquidShell;
}
