import "server-only";

import fs from "fs/promises";
import path from "path";

import {
  normalizeShopThemeAssetUnderscoreUrls,
  rewriteRelativeThemeAssetUrlsInHtml,
} from "@/lib/storefront/liquid/shopify-theme-css-url-rewrite";
import { rewritePoweredByShopifyAttribution } from "@/lib/storefront/liquid/rewrite-storefront-powered-by";
import { stripShopifyHostedRuntimeAssetRefs } from "@/lib/storefront/liquid/strip-shopify-hosted-runtime-scripts";
import { rewriteBrandedRemoteThemeAssetsInHtml } from "@/lib/storefront/liquid/theme-remote-asset-overrides";

/**
 * Rewrites relative asset paths in static HTML exports so `/shop/theme-assets/{id}/assets/…` serves them.
 */
export function rewriteStaticHtmlThemeAssetRefs(html: string, themeVersionId: bigint): string {
  const base = `/shop/theme-assets/${themeVersionId.toString()}`;
  let out = rewriteRelativeThemeAssetUrlsInHtml(html, themeVersionId.toString());
  out = normalizeShopThemeAssetUnderscoreUrls(out);
  out = out.replace(/(["'])\.\/assets\//g, `$1${base}/assets/`);
  out = out.replace(/(["'])assets\//g, `$1${base}/assets/`);
  out = out.replace(/url\(\s*(["']?)\.\/assets\//gi, `url($1${base}/assets/`);
  out = out.replace(/url\(\s*(["']?)assets\//gi, `url($1${base}/assets/`);
  return out;
}

function extractBodyInner(html: string): string {
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (m?.[1]) return m[1].trim();
  return html.trim();
}

const LAYOUT_THEME_LIQUID = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{{ page_title | escape }} — {{ shop.name | escape }}</title>
<link rel="stylesheet" href="{{ 'styles/index-head.css' | asset_url }}" media="all">
<link rel="stylesheet" href="{{ 'styles/theme.css' | asset_url }}" media="all">
<link rel="stylesheet" href="{{ 'styles/apps.css' | asset_url }}" media="all">
</head>
<body>
{{ content_for_layout }}
</body>
</html>
`;

const TPL_PRODUCT = `{% comment %}Concept static export — product (commerce data from Paper Flight).{% endcomment %}
<div class="pf-static-product" style="max-width:960px;margin:0 auto;padding:24px;font-family:system-ui,sans-serif">
  <h1 style="font-size:1.75rem;margin:0 0 12px">{{ product.title | escape }}</h1>
  {% assign img = product.featured_image | img_url %}
  {% if img != "" %}
  <img src="{{ img }}" alt="{{ product.title | escape }}" style="max-width:100%;height:auto;border-radius:8px;margin:12px 0" width="640" height="640" loading="lazy" />
  {% endif %}
  <div style="margin:16px 0;color:#374151;white-space:pre-wrap">{{ product.description | strip_html }}</div>
  <p style="font-size:1.25rem;font-weight:600">{{ product.selected_or_first_available_variant.price | money }}</p>
  <p style="margin-top:24px"><a href="/shop/collections/all" style="color:#2563eb">← Back to catalog</a></p>
</div>
`;

const TPL_COLLECTION = `{% comment %}Concept static export — collection grid.{% endcomment %}
<div class="pf-static-collection" style="max-width:1100px;margin:0 auto;padding:24px;font-family:system-ui,sans-serif">
  <h1 style="font-size:1.75rem">{{ collection.title | escape }}</h1>
  {% if collection.description != "" %}<p style="color:#4b5563">{{ collection.description | strip_html }}</p>{% endif %}
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:20px;margin-top:24px">
    {% for product in collection.products %}
    <a href="{{ product.url }}" style="border:1px solid #e5e7eb;border-radius:10px;padding:12px;text-decoration:none;color:inherit;display:block">
      {% assign pimg = product.featured_image | img_url %}
      {% if pimg != "" %}<img src="{{ pimg }}" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px" loading="lazy" />{% endif %}
      <div style="font-weight:600;margin-top:8px">{{ product.title | escape }}</div>
      <div style="color:#059669;margin-top:4px">{{ product.price | money }}</div>
    </a>
    {% else %}
    <p style="color:#6b7280">No products are linked to this collection in the catalog yet.</p>
    {% endfor %}
  </div>
</div>
`;

const TPL_LIST_COLLECTIONS = `{% comment %}All collections from the storefront catalog.{% endcomment %}
<div style="max-width:800px;margin:0 auto;padding:24px;font-family:system-ui,sans-serif">
  <h1 style="font-size:1.75rem">Collections</h1>
  <ul style="list-style:none;padding:0;margin:20px 0">
    {% for c in collections %}
    <li style="margin:10px 0"><a href="{{ c.url }}" style="color:#2563eb;font-size:1.05rem">{{ c.title | escape }}</a>
      <span style="color:#9ca3af;margin-left:8px">({{ c.all_products_count }} products)</span>
    </li>
    {% endfor %}
  </ul>
</div>
`;

const TPL_SEARCH = `{% comment %}Storefront search (GET /shop/search?q=).{% endcomment %}
<div style="max-width:640px;margin:0 auto;padding:24px;font-family:system-ui,sans-serif">
  <h1 style="font-size:1.5rem">Search</h1>
  <form action="/shop/search" method="get" style="margin:20px 0;display:flex;gap:8px">
    <input type="search" name="q" value="{{ search.terms | escape }}" placeholder="Search the store" style="flex:1;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px" />
    <button type="submit" style="padding:10px 18px;background:#2563eb;color:#fff;border:none;border-radius:8px;cursor:pointer">Search</button>
  </form>
  {% if search.performed %}
  <p style="color:#6b7280">Found {{ search.results_count }} results (theme preview — wire search API later).</p>
  {% endif %}
</div>
`;

const TPL_PAGE = `{% comment %}CMS-backed shop page.{% endcomment %}
<div style="max-width:800px;margin:0 auto;padding:24px;font-family:system-ui,sans-serif">
  <h1 style="font-size:1.75rem">{{ page.title | escape }}</h1>
  <div style="margin-top:16px;color:#374151">{{ page.content }}</div>
</div>
`;

const TPL_BLOG = `{% comment %}Blog index (stub).{% endcomment %}
<div style="max-width:720px;margin:0 auto;padding:24px;font-family:system-ui,sans-serif">
  <h1>{{ blog.title | escape }}</h1>
  <ul style="margin-top:20px;padding-left:18px">
    {% for article in blog.articles %}
    <li style="margin:8px 0"><a href="{{ article.url }}" style="color:#2563eb">{{ article.title | escape }}</a></li>
    {% endfor %}
  </ul>
</div>
`;

const TPL_ARTICLE = `{% comment %}Blog article (stub).{% endcomment %}
<article style="max-width:720px;margin:0 auto;padding:24px;font-family:system-ui,sans-serif">
  <h1>{{ article.title | escape }}</h1>
  <p style="color:#6b7280;font-size:14px">{{ article.published_at }}</p>
  <div style="margin-top:20px">{{ article.content }}</div>
</article>
`;

const TPL_CUSTOMER_LOGIN = `<div style="max-width:480px;margin:0 auto;padding:32px;font-family:system-ui,sans-serif">
  <h1>Sign in</h1>
  <p style="color:#4b5563;margin:12px 0">Account checkout uses the main app. Use the link below if your deployment exposes a customer login.</p>
  <p><a href="/login" style="color:#2563eb">Go to login</a></p>
  <p style="margin-top:16px"><a href="/shop">← Back to store</a></p>
</div>
`;

const TPL_CUSTOMER_REGISTER = `<div style="max-width:480px;margin:0 auto;padding:32px;font-family:system-ui,sans-serif">
  <h1>Create account</h1>
  <p><a href="/register" style="color:#2563eb">Register</a> · <a href="/shop">Store</a></p>
</div>
`;

const TPL_CUSTOMER_ACCOUNT = `<div style="max-width:640px;margin:0 auto;padding:32px;font-family:system-ui,sans-serif">
  <h1>Your account</h1>
  <p style="color:#6b7280">Manage profile and orders in the main application.</p>
  <p><a href="/shop">← Store</a></p>
</div>
`;

const TPL_CUSTOMER_ADDRESSES = `<div style="max-width:640px;margin:0 auto;padding:32px;font-family:system-ui,sans-serif"><h1>Addresses</h1><p><a href="/shop">← Store</a></p></div>`;
const TPL_CUSTOMER_ACTIVATE = `<div style="max-width:640px;margin:0 auto;padding:32px;font-family:system-ui,sans-serif"><h1>Activate account</h1><p><a href="/shop">← Store</a></p></div>`;
const TPL_CUSTOMER_RESET = `<div style="max-width:640px;margin:0 auto;padding:32px;font-family:system-ui,sans-serif"><h1>Reset password</h1><p><a href="/shop">← Store</a></p></div>`;
const TPL_CUSTOMER_ORDER = `<div style="max-width:640px;margin:0 auto;padding:32px;font-family:system-ui,sans-serif"><h1>Order</h1><p><a href="/shop">← Store</a></p></div>`;

const SETTINGS_DATA_JSON = `{"current":{}}\n`;

/**
 * After extracting a static HTML ZIP (index.html + assets/), create Liquid layout + all storefront templates
 * so `/shop`, products, collections, search, pages, and blog URLs render through the same theme shell.
 */
export async function synthesizeStaticHtmlStorefrontTheme(dest: string, themeVersionId: bigint): Promise<boolean> {
  const indexAbs = path.join(dest, "index.html");
  let raw: string;
  try {
    raw = await fs.readFile(indexAbs, "utf8");
  } catch {
    return false;
  }

  let rewritten = rewriteBrandedRemoteThemeAssetsInHtml(raw, themeVersionId.toString());
  rewritten = rewriteStaticHtmlThemeAssetRefs(rewritten, themeVersionId);
  rewritten = rewriteBrandedRemoteThemeAssetsInHtml(rewritten, themeVersionId.toString());
  const bodyInner = extractBodyInner(
    stripShopifyHostedRuntimeAssetRefs(rewritePoweredByShopifyAttribution(rewritten)),
  );
  const indexLiquid = `{% raw %}\n${bodyInner}\n{% endraw %}\n`;

  const layoutDir = path.join(dest, "layout");
  const tplDir = path.join(dest, "templates");
  const custDir = path.join(dest, "templates", "customers");
  const configDir = path.join(dest, "config");
  await fs.mkdir(layoutDir, { recursive: true });
  await fs.mkdir(tplDir, { recursive: true });
  await fs.mkdir(custDir, { recursive: true });
  await fs.mkdir(configDir, { recursive: true });

  await fs.writeFile(path.join(layoutDir, "theme.liquid"), LAYOUT_THEME_LIQUID, "utf8");
  await fs.writeFile(path.join(tplDir, "index.liquid"), indexLiquid, "utf8");
  await fs.writeFile(path.join(tplDir, "product.liquid"), TPL_PRODUCT, "utf8");
  await fs.writeFile(path.join(tplDir, "collection.liquid"), TPL_COLLECTION, "utf8");
  await fs.writeFile(path.join(tplDir, "collection.all.liquid"), TPL_COLLECTION, "utf8");
  await fs.writeFile(path.join(tplDir, "list-collections.liquid"), TPL_LIST_COLLECTIONS, "utf8");
  await fs.writeFile(path.join(tplDir, "search.liquid"), TPL_SEARCH, "utf8");
  await fs.writeFile(path.join(tplDir, "page.liquid"), TPL_PAGE, "utf8");
  await fs.writeFile(path.join(tplDir, "blog.liquid"), TPL_BLOG, "utf8");
  await fs.writeFile(path.join(tplDir, "article.liquid"), TPL_ARTICLE, "utf8");

  await fs.writeFile(path.join(custDir, "login.liquid"), TPL_CUSTOMER_LOGIN, "utf8");
  await fs.writeFile(path.join(custDir, "register.liquid"), TPL_CUSTOMER_REGISTER, "utf8");
  await fs.writeFile(path.join(custDir, "account.liquid"), TPL_CUSTOMER_ACCOUNT, "utf8");
  await fs.writeFile(path.join(custDir, "addresses.liquid"), TPL_CUSTOMER_ADDRESSES, "utf8");
  await fs.writeFile(path.join(custDir, "activate_account.liquid"), TPL_CUSTOMER_ACTIVATE, "utf8");
  await fs.writeFile(path.join(custDir, "reset_password.liquid"), TPL_CUSTOMER_RESET, "utf8");
  await fs.writeFile(path.join(custDir, "order.liquid"), TPL_CUSTOMER_ORDER, "utf8");

  await fs.writeFile(path.join(configDir, "settings_data.json"), SETTINGS_DATA_JSON, "utf8");

  return true;
}
