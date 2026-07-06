/**
 * Theme SCSS/CSS often hardcodes the original merchant CDN, e.g.
 * `url(//cdn.shopify.com/s/files/1/…/t/8/assets/myfont.ttf?2258)`.
 * Off-platform we serve the same filenames from `/shop/theme-assets/{id}/assets/…`.
 */
/** Inner URL may include `?v` query / `%23` fragments before `)`. Path is `/s/files/{shop}/{theme}/t/{id}/assets/`. */
const URL_FILES_ASSETS =
  /url\(\s*(['"]?)(?:https?:)?\/\/cdn\.shopify\.com\/s\/files\/\d+\/\d+\/\d+\/t\/\d+\/assets\/([^)]+?)\s*\)/gi;

/** Some builds reference Shopify’s short font path. */
const URL_SHORT_F = /url\(\s*(['"]?)(?:https?:)?\/\/cdn\.shopify\.com\/s\/f\/([^)]+?)\s*\)/gi;

export function themeAssetsPublicBase(assetBaseUrl: string, themeVersionId: string): string {
  return `${assetBaseUrl.replace(/\/$/, "")}/shop/theme-assets/${themeVersionId}/assets`;
}

/** Some exports / Shopify snippets use `theme_assets`; our App Router segment is `theme-assets`. */
export function normalizeShopThemeAssetUnderscoreUrls(text: string): string {
  return text.replace(/\/shop\/theme_assets\//gi, "/shop/theme-assets/");
}

/**
 * Theme Liquid often emits the first `srcset` candidate as absolute CDN, then **unquoted**
 * `./assets/…` variants. On our app those resolve from `/shop` to `/shop/assets/…` (404).
 * Rewrite every `./assets/` segment to the published theme bundle.
 */
export function rewriteRelativeThemeAssetUrlsInHtml(html: string, themeVersionId: string): string {
  const id = themeVersionId.trim();
  if (!id) return html;
  const prefix = `/shop/theme-assets/${id}/assets/`;
  return html.split("./assets/").join(prefix);
}

/** Strip query / fragment / URL-encoding so `foo.svg%23bar` maps to on-disk `foo.svg`. */
function assetRelativePathFromShopifyRest(rest: string): string {
  const noQuery = rest.split("?")[0] ?? rest;
  let p = noQuery;
  try {
    p = decodeURIComponent(noQuery);
  } catch {
    p = noQuery;
  }
  const hash = p.indexOf("#");
  if (hash >= 0) p = p.slice(0, hash);
  return p.replace(/^\/+/, "");
}

function encodeAssetPath(rel: string): string {
  return rel
    .split("/")
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

export function rewriteShopifyCdnAssetUrlsInCss(css: string, themeAssetsBase: string): string {
  const base = themeAssetsBase.replace(/\/$/, "");
  const replacer = (_m: string, quote: string, rest: string) => {
    const trimmed = rest.trim();
    const rel = assetRelativePathFromShopifyRest(trimmed);
    if (!rel) return _m;
    return `url(${quote}${base}/${encodeAssetPath(rel)}${quote})`;
  };
  return css.replace(URL_FILES_ASSETS, replacer).replace(URL_SHORT_F, replacer);
}
