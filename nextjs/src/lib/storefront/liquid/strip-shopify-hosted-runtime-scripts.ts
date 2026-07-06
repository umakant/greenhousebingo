import { normalizeShopThemeAssetUnderscoreUrls } from "@/lib/storefront/liquid/shopify-theme-css-url-rewrite";

/**
 * Bundles under `assets/scripts` + `assets/remote` that we **serve** from this app after Liquid
 * rewrites paths to `/shop/theme-assets/{versionId}/…`. Those must stay in the document so the
 * client activator can run them (mega-menu, cart drawer, etc.).
 */
function isPaperFlightThemeAssetBundleUrl(url: string): boolean {
  const u = String(url);
  return /\/shop\/theme-assets\/\d+\//i.test(u) || /\/shop\/theme_assets\/\d+\//i.test(u);
}

/**
 * Shopify CDN / editor-only `assets/scripts` + `assets/remote` references that are **not** our
 * rewritten theme-asset URLs (no `/shop/theme-assets/`). Strip those off-platform.
 */
function isStrippableShopifyVirtualBundleUrl(url: string): boolean {
  const u = String(url);
  if (!/\/assets\/(?:scripts|remote)\b/i.test(u)) return false;
  if (isPaperFlightThemeAssetBundleUrl(u)) return false;
  return true;
}

/**
 * Shopify OS / Theme Editor often injects `assets/scripts/*` and `assets/remote/*` bundles that
 * exist only on Shopify’s CDN, not inside a downloadable theme ZIP. After we rewrite local
 * paths to `/shop/theme-assets/{id}/assets/…`, those tags point at **our** route — keep them so
 * theme JS runs. Only strip CDN / non-rewritten virtual bundle references.
 */
export function stripShopifyHostedRuntimeScriptTags(html: string): string {
  return html.replace(/<script\b[^>]*\bsrc=(["'])([^"']+)\1[^>]*>\s*<\/script>/gi, (full, _q, src: string) => {
    if (!isStrippableShopifyVirtualBundleUrl(src)) return full;
    return "";
  });
}

function linkHref(htmlFragment: string): string | null {
  const m = htmlFragment.match(/\bhref\s*=\s*(["'])([^"']+)\1/i);
  return m?.[2] != null ? String(m[2]) : null;
}

function hrefTargetsStrippableBundle(href: string): boolean {
  return isStrippableShopifyVirtualBundleUrl(href);
}

/**
 * Themes sometimes ship `<a href="/shop" download>` (or `href="/shop"download`) meant for Shopify’s
 * editor; same-origin + `download` makes Chrome save the navigated document, often as `blank.html`.
 * Avoid matching `data-download` (no `\b` before `download` when glued to `-`).
 */
function stripAnchorDownloadAttributes(html: string): string {
  return html.replace(/<a\b([^>]*)>/gi, (full, attrs: string) => {
    if (!/(?:^|\s)download\b|(["'])download/i.test(attrs)) return full;
    let cleaned = attrs
      .replace(/(["'])download\s*=\s*(["'])[^"']*\2/gi, "$1")
      .replace(/\s*download\s*=\s*(["'])[^"']*\1/gi, "")
      .replace(/(["'])\s*download\b/gi, "$1")
      .replace(/(?:^|\s)download\b/gi, " ");
    cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
    return cleaned.length ? `<a ${cleaned}>` : "<a>";
  });
}

/** Rare in themes but would force attachment behavior in some UAs. */
function stripContentDispositionMeta(html: string): string {
  return html.replace(/<meta\b[^>]*>/gi, (tag) => {
    const he = tag.match(/\bhttp-equiv\s*=\s*["']([^"']+)["']/i)?.[1]?.trim().toLowerCase();
    return he === "content-disposition" ? "" : tag;
  });
}

/**
 * Also removes `<link rel="modulepreload">` / `preload as=script` / `prefetch` for those URLs —
 * otherwise the browser fetches them from `<head>` even when `<script>` tags were stripped.
 */
export function stripShopifyHostedRuntimeAssetRefs(html: string): string {
  let out = normalizeShopThemeAssetUnderscoreUrls(stripContentDispositionMeta(html));
  out = stripShopifyHostedRuntimeScriptTags(out);
  out = out.replace(/<link\b[^>]*>/gi, (full) => {
    const href = linkHref(full);
    if (!href || !hrefTargetsStrippableBundle(href)) return full;
    const relM = full.match(/\brel\s*=\s*["']([^"']+)["']/i);
    const rel = (relM?.[1] ?? "").toLowerCase().trim();
    if (rel === "modulepreload") return "";
    if (rel === "prefetch") return "";
    if (rel === "preload" && /\bas\s*=\s*["']script["']/i.test(full)) return "";
    return full;
  });
  out = stripAnchorDownloadAttributes(out);
  return out;
}
