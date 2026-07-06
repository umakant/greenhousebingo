import "server-only";

import path from "path";

import { Liquid } from "liquidjs";

import { createPreprocessedShopifyThemeFs } from "./shopify-theme-liquid-fs";

/**
 * LiquidJS engine configured for classic Shopify theme folders (`snippets/`, `templates/`, `layout/`).
 * Registers a **subset** of Shopify filters required by many ThemeForest themes; unknown filters are ignored (`strictFilters: false`).
 */
export function createShopifyThemeLiquidEngine(themeRoot: string, themeVersionId: string, assetBaseUrl: string) {
  const assetsBase = `${assetBaseUrl.replace(/\/$/, "")}/shop/theme-assets/${themeVersionId}`;

  const engine = new Liquid({
    root: [
      path.join(themeRoot, "snippets"),
      path.join(themeRoot, "sections"),
      path.join(themeRoot, "templates"),
      path.join(themeRoot, "layout"),
      themeRoot,
    ],
    extname: ".liquid",
    fs: createPreprocessedShopifyThemeFs(),
    strictFilters: false,
    strictVariables: false,
  });

  engine.registerFilter("asset_url", (v: unknown) => {
    const name = String(v ?? "")
      .trim()
      .replace(/^['"]|['"]$/g, "");
    if (!name) return "";
    const enc = name.split("/").map(encodeURIComponent).join("/");
    return `${assetsBase}/assets/${enc}`;
  });

  engine.registerFilter("stylesheet_tag", (href: unknown) => {
    const u = String(href ?? "").trim();
    if (!u) return "";
    const esc = u.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
    return `<link rel="stylesheet" href="${esc}" media="all" />`;
  });

  engine.registerFilter("script_tag", (src: unknown) => {
    const u = String(src ?? "").trim();
    if (!u) return "";
    const esc = u.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
    /** No `defer`: themes expect vendor bundles before inline bootstraps once scripts are activated. */
    return `<script src="${esc}"></script>`;
  });

  engine.registerFilter("product_img_url", (v: unknown, _size?: unknown) => {
    void _size;
    if (typeof v === "string" && v.length > 0) return v;
    if (v && typeof v === "object" && (v as { src?: string }).src) return String((v as { src: string }).src);
    return "";
  });

  engine.registerFilter("img_url", (v: unknown) => {
    if (typeof v === "string") return v;
    if (v && typeof v === "object" && (v as { src?: string }).src) return String((v as { src: string }).src);
    return "";
  });

  engine.registerFilter("money", (cents: unknown) => {
    const n = Number(cents);
    if (!Number.isFinite(n)) return "";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n / 100);
  });

  engine.registerFilter("money_without_currency", (cents: unknown) => {
    const n = Number(cents);
    if (!Number.isFinite(n)) return "";
    return (n / 100).toFixed(2);
  });

  /** Shopify `| t` locale strings — off-platform stub so theme JS snippets do not break the parser. */
  engine.registerFilter("t", (key: unknown) => {
    const k = String(key ?? "").replace(/^['"]|['"]$/g, "");
    if (!k) return "";
    const tail = k.includes(".") ? k.slice(k.lastIndexOf(".") + 1) : k;
    return tail.replace(/_/g, " ");
  });

  /** Shopify `pluralize` — picks singular/plural string before `| t` (e.g. product count labels). */
  engine.registerFilter("pluralize", (count: unknown, singular?: unknown, plural?: unknown) => {
    const n = Number(count);
    return Number.isFinite(n) && n === 1 ? singular : plural;
  });

  /**
   * Collection-scoped product URL. Nested `/shop/collections/.../products/...` is not routed here;
   * return the canonical product URL so links stay valid.
   */
  engine.registerFilter("within", (url: unknown) => String(url ?? "").trim());

  engine.registerFilter("minus", (a: unknown, b: unknown) => Number(a) - Number(b));
  engine.registerFilter("times", (a: unknown, b: unknown) => Number(a) * Number(b));
  engine.registerFilter("divided_by", (a: unknown, b: unknown) => {
    const nb = Number(b);
    if (!Number.isFinite(nb) || nb === 0) return 0;
    return Number(a) / nb;
  });
  engine.registerFilter("round", (a: unknown) => Math.round(Number(a)));

  engine.registerFilter("strip_html", (html: unknown) => String(html ?? "").replace(/<[^>]+>/g, ""));

  /** Shopify `camelize` (used in `body` classes, e.g. `template` → `Index`). */
  engine.registerFilter("camelize", (v: unknown) => {
    const raw = String(v ?? "");
    const s = raw.replace(/[-_]+(.)?/g, (_, ch: string) => (ch ? ch.toUpperCase() : ""));
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
  });

  /**
   * Shopify-hosted scripts/CSS — not available off-platform. Serve minimal stubs from `/shopify-liquid-support/`.
   * @see https://shopify.dev/docs/api/liquid/filters/shopify_asset_url
   */
  engine.registerFilter("shopify_asset_url", (v: unknown) => {
    const name = String(v ?? "")
      .trim()
      .replace(/^['"]|['"]$/g, "");
    if (!name) return "";
    const safe = name.replace(/[^a-zA-Z0-9._-]/g, "_");
    if (safe.endsWith(".css")) return `/shopify-liquid-support/${safe}`;
    const js = safe.endsWith(".js") ? safe : `${safe}.js`;
    return `/shopify-liquid-support/${js}`;
  });

  return engine;
}
