import "server-only";

import { unstable_cache } from "next/cache";

/**
 * Cross-request cache for the fully hydrated Concept homepage HTML.
 *
 * The homepage render is dominated by ~7 catalog queries (home grid, featured tabs, collections,
 * latest stories, spotlight, bundles, events) plus heavy string rewrites over a multi‑MB document.
 * The route is `force-dynamic`, so without this cache that cost is paid on *every* request (~3s TTFB).
 *
 * Freshness model:
 * - `themeVersionId` + a content hash of customizer/brand settings are part of the cache KEY, so
 *   theme / customizer / branding edits change the key and show up immediately (no stale chrome).
 * - Only catalog data (products / collections / events / blog) is bounded by `revalidate`
 *   (default 60s prod / 5s dev, override via `STOREFRONT_HOME_CACHE_SECONDS`).
 * - Call `revalidateTag(conceptHomeHtmlCacheTag(websiteId))` from publish flows for instant refresh.
 */

/** Revalidate window (seconds) for the catalog portion of cached storefront HTML (home + chrome). */
export const STOREFRONT_HTML_REVALIDATE_SECONDS = (() => {
  const raw = process.env.STOREFRONT_HOME_CACHE_SECONDS?.trim();
  if (raw && /^\d+$/.test(raw)) {
    const n = parseInt(raw, 10);
    if (n >= 5 && n <= 86400) return n;
  }
  return process.env.NODE_ENV === "production" ? 60 : 5;
})();

/** Tag for `revalidateTag(...)` — lets publish/mutation flows force an instant home refresh. */
export function conceptHomeHtmlCacheTag(websiteId: string): string {
  return `storefront-concept-home:${websiteId}`;
}

/** Tag for the cached theme chrome (header/footer shell shared by all storefront pages). */
export function storefrontChromeHtmlCacheTag(websiteId: string): string {
  return `storefront-theme-chrome:${websiteId}`;
}

/** djb2 — tiny, stable, non-crypto hash to fold customizer/brand content into a cache key. */
export function storefrontHtmlContentHash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

export async function getCachedConceptHomeHtml(
  args: {
    /** Stringified website id (cache key scope). */
    websiteId: string;
    /** Custom-domain root (`phillywaterice.com`) vs `/shop` — affects rewritten URLs in the HTML. */
    customDomainRoot: boolean;
    /** Active theme version — bumping it (theme swap/republish) invalidates the cache. */
    themeVersionId: string;
    /** Serialized customizer + brand + footer inputs; any change re-renders immediately. */
    contentHashInput: string;
    /** Distinguishes the in-Next concept-home variant from the default static path. */
    variant: string;
  },
  /** Produces the fully hydrated home HTML on a cache miss (catalog fetches + string rewrites). */
  build: () => Promise<string>,
): Promise<string> {
  const contentVersion = storefrontHtmlContentHash(args.contentHashInput);
  const cached = unstable_cache(
    build,
    [
      "storefront-concept-home-html",
      "v1",
      args.variant,
      args.websiteId,
      args.customDomainRoot ? "cd" : "shop",
      args.themeVersionId || "nover",
      contentVersion,
    ],
    { revalidate: STOREFRONT_HTML_REVALIDATE_SECONDS, tags: [conceptHomeHtmlCacheTag(args.websiteId)] },
  );
  return cached();
}
