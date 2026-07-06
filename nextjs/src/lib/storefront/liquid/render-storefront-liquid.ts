import "server-only";

import fs from "fs/promises";
import path from "path";

import { effectiveVariantStockUnits, parsePosProductVariants } from "@/lib/storefront/bundle-catalog";
import {
  listPublicStorefrontCollections,
  type PublicCatalogCollection,
  type PublicCatalogProduct,
  type PublicStorefrontCollectionListRow,
} from "@/lib/storefront/public-catalog";
import { canSellQty, parseInventoryPolicy } from "@/lib/storefront/inventory-storefront";
import type { PublicStorefrontBrandSettings } from "@/lib/storefront/public-storefront-settings";
import { storefrontAuthorityForUrls, storefrontHostnameForLookup } from "@/lib/storefront/storefront-host-header";

import { createShopifyThemeLiquidEngine } from "./shopify-liquid-engine";
import { preprocessShopifyThemeLiquid } from "./shopify-liquid-preprocess";
import { triplicateConceptSlideshowHeroSlides } from "@/lib/storefront/triplicate-concept-slideshow-hero";
import { applyCartDrawerEmptyCollectionsToHtml } from "@/lib/storefront/theme-concept-cart-drawer-empty-collections";
import { resolveShopifyLiquidInnerTemplate } from "./resolve-shopify-liquid-template";
import { rewriteBrandedRemoteThemeAssetsInHtml } from "./theme-remote-asset-overrides";
import {
  normalizeShopThemeAssetUnderscoreUrls,
  rewriteRelativeThemeAssetUrlsInHtml,
} from "./shopify-theme-css-url-rewrite";
import {
  injectStorefrontAnnouncementBarBrandCss,
  injectStorefrontHideCartRecentlyViewed,
  injectStorefrontHideProductFormAlert,
  injectStorefrontHideThemeSearchDrawer,
  rewriteStorefrontSearchDrawerTriggersToShopSearch,
  injectStorefrontStickyHeaderCss,
  injectStorefrontPrimaryNavHoverNormalize,
  normalizeShopifyThemeBootNullArtifacts,
  rewritePoweredByShopifyAttribution,
  stripStorefrontShopifyDesignModeAttrs,
} from "./rewrite-storefront-powered-by";
import { rewriteRootShopUrlsInHtml } from "./rewrite-storefront-shop-urls-in-html";
import { replaceShopifyAccountBlocksForHeadlessStorefront } from "./rewrite-shopify-headless-widgets";
import {
  storefrontAccountDashboardPath,
  storefrontAccountLoginPath,
} from "@/lib/storefront/storefront-account-public-paths";
import { stripShopifyHostedRuntimeAssetRefs } from "./strip-shopify-hosted-runtime-scripts";

async function readText(abs: string) {
  return fs.readFile(abs, "utf8");
}

async function loadShopifyThemeSettings(themeRoot: string): Promise<Record<string, unknown>> {
  try {
    const raw = await readText(path.join(themeRoot, "config", "settings_data.json"));
    const j = JSON.parse(raw) as { current?: unknown };
    if (j.current && typeof j.current === "object" && !Array.isArray(j.current)) {
      return j.current as Record<string, unknown>;
    }
  } catch {
    /* ignore */
  }
  return {};
}

function buildProductDrop(p: PublicCatalogProduct) {
  const policy = parseInventoryPolicy(p.inventoryPolicy);
  const images = (p.galleryImages.length ? p.galleryImages : p.image ? [p.image] : []).map((url) => ({ src: url }));
  const featured = p.image ? { src: p.image } : images[0] ?? { src: "" };
  const parsed = parsePosProductVariants(p.variants);
  const variantRows =
    parsed.length > 0
      ? parsed.map((v) => {
          const unit = Number.isFinite(v.price) && v.price !== undefined ? Number(v.price) : Number(p.price);
          const st = effectiveVariantStockUnits(v, p.stock);
          const cents = Math.round(unit * 100);
          const available = canSellQty(st, 1, policy);
          return {
            id: v.id!,
            title: v.name!,
            available,
            price: cents,
            featured_image: featured,
            /** OS2 `product-form` / `pickup-availability` read Shopify-shaped inventory fields from `| json`. */
            inventory_management: policy === "continue" ? null : "paperflight",
            inventory_policy: policy === "continue" ? "continue" : "deny",
            inventory_quantity: Math.max(0, Math.floor(st)),
          };
        })
      : [
          {
            id: "1",
            title: "Default",
            available: canSellQty(p.stock, 1, policy),
            price: Math.round(Number(p.price) * 100),
            featured_image: featured,
            inventory_management: policy === "continue" ? null : "paperflight",
            inventory_policy: policy === "continue" ? "continue" : "deny",
            inventory_quantity: Math.max(0, Math.floor(p.stock)),
          },
        ];
  const firstAvailable = variantRows.find((x) => x.available) ?? variantRows[0]!;
  const variantsArr = toLiquidSizedArray(variantRows);
  const anyVariantPurchasable = variantRows.some((x) => x.available);
  return {
    id: p.id,
    title: p.name,
    handle: p.slug ?? p.id,
    description: p.description ?? "",
    url: `/shop/products/${p.slug ?? p.id}`,
    featured_image: featured,
    images: images.length ? images : [{ src: "" }],
    /** Themes gate buy buttons on `product.available`, not only variant JSON. */
    available: anyVariantPurchasable,
    variants: variantsArr,
    selected_or_first_available_variant: firstAvailable,
    price: firstAvailable.price,
    compare_at_price: p.compareAtPrice != null ? Math.round(Number(p.compareAtPrice) * 100) : null,
  };
}

function stubProductFromHandle(handle: string) {
  const title = handle.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const variant = {
    id: "1",
    title: "Default",
    available: false,
    price: 0,
    featured_image: { src: "" },
  };
  return {
    id: handle,
    title,
    handle,
    description: "",
    url: `/shop/products/${handle}`,
    featured_image: { src: "" },
    images: [{ src: "" }],
    variants: [variant],
    selected_or_first_available_variant: variant,
    price: 0,
    compare_at_price: null,
  };
}

/** Shopify themes use `collection.products.size`; expose `.size` on arrays we pass into Liquid. */
function toLiquidSizedArray<T>(items: T[]): T[] {
  const a = [...items];
  Object.defineProperty(a, "size", { enumerable: true, configurable: true, value: a.length });
  return a;
}

function buildCollectionProductDrop(row: PublicCatalogCollection["products"][number]) {
  const handle = String(row.slug ?? row.id)
    .trim()
    .toLowerCase();
  const priceCents = Math.round(Number(row.price) * 100);
  const compareCents = row.compareAtPrice != null ? Math.round(Number(row.compareAtPrice) * 100) : null;
  const featured = row.image ? { src: row.image } : { src: "" };
  const images = row.image ? [{ src: row.image }] : [{ src: "" }];
  const policy = parseInventoryPolicy(row.inventoryPolicy);
  const variantAvailable = canSellQty(row.stock, 1, policy);
  const variant = {
    id: "1",
    title: "Default",
    available: variantAvailable,
    price: priceCents,
    compare_at_price: compareCents,
    featured_image: featured,
    inventory_management: policy === "continue" ? null : "paperflight",
    inventory_policy: policy === "continue" ? "continue" : "deny",
    inventory_quantity: Math.max(0, Math.floor(row.stock)),
  };
  return {
    id: row.id,
    title: row.name,
    handle,
    description: "",
    url: `/shop/products/${handle}`,
    featured_image: featured,
    images,
    available: variantAvailable,
    variants: [variant],
    selected_or_first_available_variant: variant,
    price: priceCents,
    compare_at_price: compareCents,
  };
}

function stubCollectionFromHandle(handle: string) {
  const h = handle.trim().toLowerCase();
  const title = h.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const products = toLiquidSizedArray<unknown>([]);
  return {
    id: h,
    title,
    handle: h,
    description: "",
    products,
    all_products_count: 0,
    url: `/shop/collections/${h}`,
    featured_image: { src: "" },
  };
}

/**
 * `collections` must support `{% for c in collections %}` and `collections['handle']`.
 * Published rows come from the DB on list-collections; stub handles fill theme defaults (`all`, etc.).
 */
function buildCollectionsLiquidValue(
  publishedList: PublicStorefrontCollectionListRow[] | null,
  extraHandles: string[],
): Record<string, unknown> & unknown[] {
  const byHandle = new Map<string, Record<string, unknown>>();

  if (publishedList?.length) {
    for (const c of publishedList) {
      const h = c.slug.trim().toLowerCase();
      const products = toLiquidSizedArray<unknown>([]);
      const featSrc = c.featuredImageUrl?.trim() ?? "";
      byHandle.set(h, {
        id: c.id,
        title: c.title,
        handle: h,
        description: c.description ?? "",
        products,
        all_products_count: c.productCount,
        url: `/shop/collections/${h}`,
        featured_image: featSrc ? { src: featSrc } : { src: "" },
      });
    }
  }

  const fallback = new Set(
    ["all", "frontpage", "featured", ...extraHandles].map((x) => String(x).trim().toLowerCase()).filter(Boolean),
  );
  for (const h of fallback) {
    if (!byHandle.has(h)) byHandle.set(h, stubCollectionFromHandle(h));
  }

  const rows = Array.from(byHandle.values());
  const arr = rows as unknown as Record<string, unknown> & unknown[];
  for (const r of rows) {
    const hh = String((r as { handle?: string }).handle ?? "");
    if (hh) (arr as Record<string, unknown>)[hh] = r;
  }
  return arr;
}

/** OS2 themes reference many navigation handles from `settings_data.json`; missing keys break mega-menus. */
const EXTRA_LINKLIST_HANDLES = [
  "main-menu",
  "main_menu",
  "header-menu",
  "header_menu",
  "drawer",
  "drawer-menu",
  "drawer_menu",
  "mobile-menu",
  "mobile_menu",
  "sidebar",
  "collection-list",
  "collection_list",
  "collections",
];

function shopifyLiquidNavLink(title: string, url: string) {
  return {
    title,
    url,
    active: false,
    child_active: false,
    links: toLiquidSizedArray<Record<string, unknown>>([]),
  };
}

function shopifyLinklistShape(handle: string, pairs: Array<{ url: string; title: string }>) {
  const rows = pairs.map((p) => shopifyLiquidNavLink(p.title, p.url));
  const title = handle
    .replace(/_/g, "-")
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
  return {
    handle,
    title,
    links: toLiquidSizedArray(rows),
  };
}

function collectNavLinklistHandlesFromSettings(settings: Record<string, unknown>): string[] {
  const out = new Set<string>();
  const keyLooksMenuish = (k: string) => /(menu|linklist|navigation|link_list)/i.test(k);
  const walk = (node: unknown) => {
    if (node === null || node === undefined) return;
    if (Array.isArray(node)) {
      for (const x of node) walk(x);
      return;
    }
    if (typeof node !== "object") return;
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (typeof v === "string" && keyLooksMenuish(k)) {
        const s = v.trim();
        if (s) out.add(s);
      }
      walk(v);
    }
  };
  walk(settings);
  return [...out];
}

/**
 * Shopify `linklists` drop: real themes expect `link.title`, nested `link.links`, and handles from settings.
 */
function buildShopifyLinklists(settings: Record<string, unknown>): Record<string, unknown> {
  const sh = "/shop";
  const home = { url: `${sh}`, title: "Home" };
  const collections = { url: `${sh}/collections`, title: "Collections" };
  const catalog = { url: `${sh}/collections/all`, title: "Shop" };
  const cart = { url: `${sh}/cart`, title: "Cart" };
  const search = { url: `${sh}/search`, title: "Search" };
  const contact = { url: `${sh}/pages/contact`, title: "Contact" };
  const blog = { url: `${sh}/blogs/news`, title: "Blog" };
  const base: Record<string, unknown> = {
    top: shopifyLinklistShape("top", [home, collections, catalog]),
    "main-menu": shopifyLinklistShape("main-menu", [home, collections, catalog, cart, blog, contact, search]),
    "footer-menu": shopifyLinklistShape("footer-menu", [home, contact]),
    footer: shopifyLinklistShape("footer", [home, contact]),
    copyright: shopifyLinklistShape("copyright", [home]),
    information: shopifyLinklistShape("information", [contact]),
    news: shopifyLinklistShape("news", [blog]),
  };
  const addEmpty = (raw: string) => {
    const h = raw.trim();
    if (!h || Object.prototype.hasOwnProperty.call(base, h)) return;
    base[h] = shopifyLinklistShape(h, []);
  };
  for (const h of collectNavLinklistHandlesFromSettings(settings)) addEmpty(h);
  for (const h of EXTRA_LINKLIST_HANDLES) addEmpty(h);
  return base;
}

function shopifyPagesProxy(): Record<string, unknown> {
  const base: Record<string, unknown> = {
    frontpage: {
      title: "Welcome",
      content:
        "<p>Welcome to our store. Edit your homepage in <strong>Storefronts → Pages</strong>, or tune this theme under <strong>Themes</strong>.</p>",
    },
  };
  return new Proxy(base, {
    get(target, prop: string | symbol) {
      if (typeof prop !== "string") return undefined;
      if (Object.prototype.hasOwnProperty.call(target, prop)) return target[prop];
      return { title: prop, content: "" };
    },
  });
}

/** Client cart bridge reads `data-pf-product-id` on `product-info` (Shopify-themed PDP). */
function injectPfProductIdOnFirstProductInfo(html: string, productId: string): string {
  const trimmed = productId.trim();
  if (!trimmed) return html;
  const safe = trimmed.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  let patched = false;
  return html.replace(/<product-info\b[^>]*>/i, (open) => {
    if (patched) return open;
    patched = true;
    if (/\bdata-pf-product-id\s*=/i.test(open)) {
      return open.replace(/\bdata-pf-product-id\s*=\s*["'][^"']*["']/i, `data-pf-product-id="${safe}"`);
    }
    return open.replace(/<product-info\b/i, `<product-info data-pf-product-id="${safe}"`);
  });
}

/** Duplicate catalog id on the main PDP form so the cart bridge always resolves `productId` (even when `product-info` is missing from DOM). */
function injectPfProductIdOnFirstProductForm(html: string, productId: string): string {
  const trimmed = productId.trim();
  if (!trimmed) return html;
  const safe = trimmed.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  let patched = false;
  return html.replace(/<form\b[^>]*>/gi, (open) => {
    if (patched) return open;
    if (!/\bis=["']product-form["']/i.test(open)) return open;
    if (!/\bdata-type=["']add-to-cart-form["']/i.test(open)) return open;
    patched = true;
    if (/\bdata-pf-product-id\s*=/i.test(open)) {
      return open.replace(/\bdata-pf-product-id\s*=\s*["'][^"']*["']/i, `data-pf-product-id="${safe}"`);
    }
    return open.replace(/<form\b/i, `<form data-pf-product-id="${safe}"`);
  });
}

/**
 * Renders `layout/theme.liquid` wrapping a resolved inner template for Shopify-style URLs under `/shop`.
 * Returns `null` to fall back to Paper Flight’s native React storefront.
 */
export async function tryRenderShopifyLiquidStorefront(opts: {
  themeRoot: string;
  themeVersionId: string;
  protocol: string;
  /** `Host` / `X-Forwarded-Host` value including port when present (e.g. `localhost:5000`). Drives `shop.url` and `asset_url`. */
  requestAuthority: string;
  requestPath: string;
  segments: string[];
  settingsBrand: PublicStorefrontBrandSettings;
  productsCount: number;
  product: PublicCatalogProduct | null;
  collection: PublicCatalogCollection | null;
  /** CMS-backed `page` drop for `/shop/pages/...` when a Page row exists. */
  cmsPageLiquid: { handle: string; title: string; content: string; url: string } | null;
  /** Search query (`q`) for `templates/search.liquid`. */
  searchQuery: string;
  /** When set with `websiteId`, `templates/list-collections.liquid` loads published collections from the DB. */
  organizationId?: bigint;
  websiteId?: bigint;
  /** Merchant custom domain (phillywaterice.com): public URLs omit `/shop`. */
  customDomainRoot?: boolean;
}): Promise<{ html: string; pageTitle: string } | null> {
  const {
    themeRoot,
    themeVersionId,
    protocol,
    requestAuthority,
    requestPath,
    segments,
    settingsBrand,
    productsCount,
    product,
    collection,
    cmsPageLiquid,
    searchQuery,
    organizationId,
    websiteId,
    customDomainRoot = false,
  } = opts;

  const innerRel = await resolveShopifyLiquidInnerTemplate(themeRoot, segments);
  if (!innerRel) return null;

  const innerAbs = path.join(themeRoot, ...innerRel.split("/"));
  try {
    await fs.access(innerAbs);
  } catch {
    return null;
  }

  try {
    const layoutAbs = path.join(themeRoot, "layout", "theme.liquid");
    const [innerRaw, layoutRaw, settings] = await Promise.all([
      readText(innerAbs),
      readText(layoutAbs),
      loadShopifyThemeSettings(themeRoot),
    ]);
    const innerTpl = preprocessShopifyThemeLiquid(innerRaw);
    const layoutTpl = preprocessShopifyThemeLiquid(layoutRaw);

    const authority = storefrontAuthorityForUrls(requestAuthority);
    const baseUrl = `${protocol}//${authority}`;
    const shopDomain = storefrontHostnameForLookup(requestAuthority);
    const engine = createShopifyThemeLiquidEngine(themeRoot, themeVersionId, baseUrl);
    const template = innerRel.replace(/^templates\//, "").replace(/\.liquid$/, "").replace(/\//g, ".");
    const currency = settingsBrand.currencyDisplay?.trim() || "USD";
    const shop = {
      name: settingsBrand.storeName?.trim() || "Store",
      url: baseUrl,
      domain: shopDomain || authority,
      products_count: productsCount,
      money_format: "${{amount}}",
      money_with_currency_format: "${{amount}} USD",
      currency,
      description: settingsBrand.seoDefaultDescription?.trim() || "",
    };
    const publicPath =
      customDomainRoot && requestPath.startsWith("/shop")
        ? requestPath === "/shop"
          ? "/"
          : requestPath.slice(5) || "/"
        : requestPath === ""
          ? "/"
          : requestPath;
    const canonical_url = `${baseUrl}${publicPath === "/" ? "/" : publicPath}`;
    const seg = segments.map((s) => s.toLowerCase());

    const extraCollectionHandles: string[] = [];
    if (seg[0] === "collections" && seg[1]) extraCollectionHandles.push(seg[1]);
    if (collection?.slug) extraCollectionHandles.push(collection.slug);

    let publishedCollectionsList: PublicStorefrontCollectionListRow[] | null = null;
    if (innerRel.includes("list-collections") && organizationId != null && websiteId != null) {
      try {
        publishedCollectionsList = await listPublicStorefrontCollections(organizationId, websiteId);
      } catch (e) {
        console.warn("[tryRenderShopifyLiquidStorefront] listPublicStorefrontCollections failed:", e);
      }
    }

    let productDrop: ReturnType<typeof buildProductDrop> | ReturnType<typeof stubProductFromHandle> | undefined;
    if (product) productDrop = buildProductDrop(product);
    else if (seg[0] === "products" && seg[1]) productDrop = stubProductFromHandle(seg[1]);

    let collectionDrop: Record<string, unknown> | undefined;
    if (collection) {
      const rows = Array.isArray(collection.products) ? collection.products : [];
      const productDrops = rows.map((row) => buildCollectionProductDrop(row));
      const products = toLiquidSizedArray(productDrops);
      const handle = collection.slug.trim().toLowerCase();
      const featuredSrc = rows[0]?.image ?? "";
      collectionDrop = {
        id: collection.id,
        title: collection.title,
        handle,
        description: collection.description ?? "",
        products,
        all_products_count: productDrops.length,
        url: `/shop/collections/${handle}`,
        featured_image: featuredSrc ? { src: featuredSrc } : { src: "" },
      };
    } else if (seg[0] === "collections" && seg[1]) {
      collectionDrop = stubCollectionFromHandle(seg[1]);
    }

    const blogHandle = seg[0] === "blogs" && seg[1] ? seg[1] : "news";
    const blogUrl = `/shop/blogs/${blogHandle}`;
    const blogDrop = {
      handle: blogHandle,
      title: blogHandle.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      articles: [
        {
          title: "Welcome to our blog",
          url: `${blogUrl}/welcome`,
          excerpt: "<p>Posts can be wired from your CMS later.</p>",
          author: shop.name,
          published_at: new Date().toISOString(),
        },
      ],
      comments_enabled: false,
      moderated: false,
    };

    const articleDrop =
      seg[0] === "blogs" && seg[1] && seg[2]
        ? {
            title: seg[2].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            content: "<p>This article is a placeholder for theme compatibility.</p>",
            excerpt: "",
            url: requestPath.startsWith("/") ? requestPath : `/${requestPath}`,
            author: shop.name,
            published_at: new Date().toISOString(),
            comments: [],
          }
        : undefined;

    const pageDrop =
      cmsPageLiquid ??
      (seg[0] === "pages" && seg[1]
        ? {
            handle: seg[1],
            title: seg[1].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            content: "",
            url: requestPath.startsWith("/") ? requestPath : `/${requestPath}`,
          }
        : undefined);

    const searchTerms = searchQuery.trim();
    const searchDrop = {
      performed: searchTerms.length > 0,
      terms: searchTerms,
      results: [] as unknown[],
      results_count: 0,
    };

    let page_title = shop.name;
    if (product) page_title = product.name;
    else if (collection) page_title = collection.title;
    else if (pageDrop?.title) page_title = String(pageDrop.title);
    else if (articleDrop) page_title = articleDrop.title;
    else if (innerRel.includes("blog.liquid")) page_title = blogDrop.title;
    else if (innerRel.includes("search")) page_title = searchTerms ? `Search: ${searchTerms}` : "Search";
    else if (innerRel.includes("list-collections")) page_title = "Collections";
    else if (innerRel.includes("customers")) page_title = "Account";

    const page_description =
      product?.seoDescription || collection?.seoDescription || settingsBrand.seoDefaultDescription || "";

    const websiteIdStr = websiteId != null ? websiteId.toString() : null;
    const accountLoginUrl = storefrontAccountLoginPath(customDomainRoot);
    const accountRegisterUrl = websiteIdStr ? `/storefront/account/w/${websiteIdStr}/signup` : "/shop/account/register";
    const accountDashboardUrl = storefrontAccountDashboardPath(customDomainRoot);

    const ctx: Record<string, unknown> = {
      settings,
      shop,
      template,
      canonical_url,
      page_title,
      page_description,
      content_for_header: "",
      request: { path: requestPath || "/", locale: "en" },
      routes: {
        root_url: "/shop",
        cart_url: "/shop/cart",
        collections_url: "/shop/collections",
        all_products_collection_url: "/shop/collections/all",
        account_login_url: accountLoginUrl,
        account_register_url: accountRegisterUrl,
        account_url: accountDashboardUrl,
        search_url: "/shop/search",
      },
      pages: shopifyPagesProxy(),
      customer: null,
      form: { name: "", email: "", body: "", password: "", errors: [] },
      cart: { item_count: 0 },
      collections: buildCollectionsLiquidValue(publishedCollectionsList, extraCollectionHandles),
      linklists: buildShopifyLinklists(settings),
      locale: "en",
      paginate: { next: null, previous: null, current_page: 1, pages: 1 },
      search: searchDrop,
      blog: blogDrop,
    };

    if (productDrop) ctx.product = productDrop;
    if (collectionDrop) ctx.collection = collectionDrop;
    if (pageDrop) ctx.page = pageDrop;
    if (articleDrop) ctx.article = articleDrop;

    let innerHtml: string;
    try {
      innerHtml = await engine.parseAndRender(innerTpl, ctx, {});
    } catch (e) {
      console.warn("[tryRenderShopifyLiquidStorefront] inner template failed:", innerRel, e);
      return null;
    }

    let html: string;
    try {
      html = await engine.parseAndRender(layoutTpl, { ...ctx, content_for_layout: innerHtml }, {});
    } catch (e) {
      console.warn("[tryRenderShopifyLiquidStorefront] layout failed:", e);
      return null;
    }

    html = rewriteRootShopUrlsInHtml(html, { customDomainRoot });
    html = rewriteBrandedRemoteThemeAssetsInHtml(html, themeVersionId);
    html = rewriteRelativeThemeAssetUrlsInHtml(html, themeVersionId);
    html = normalizeShopThemeAssetUnderscoreUrls(html);
    html = rewriteBrandedRemoteThemeAssetsInHtml(html, themeVersionId);
    html = stripShopifyHostedRuntimeAssetRefs(html);
    html = replaceShopifyAccountBlocksForHeadlessStorefront(html, accountLoginUrl);
    html = rewritePoweredByShopifyAttribution(html);
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
    html = normalizeShopifyThemeBootNullArtifacts(html);
    html = stripStorefrontShopifyDesignModeAttrs(html);
    if (innerRel === "templates/index.liquid") {
      html = triplicateConceptSlideshowHeroSlides(html);
    }
    const isProductDetailPath = seg[0] === "products" && !!seg[1];
    /** Any PDP response must carry our catalog id for the cart bridge (theme may use click vs submit). */
    if (product && isProductDetailPath) {
      if (html.includes("<product-info")) {
        html = injectPfProductIdOnFirstProductInfo(html, product.id);
      }
      html = injectPfProductIdOnFirstProductForm(html, product.id);
    }
    if (
      html.includes("drawer__empty-collections") &&
      organizationId != null &&
      websiteId != null &&
      !html.includes('data-pf-empty-cart-collections="1"')
    ) {
      let rowsForCartDrawer = publishedCollectionsList;
      if (!rowsForCartDrawer || rowsForCartDrawer.length === 0) {
        try {
          rowsForCartDrawer = await listPublicStorefrontCollections(organizationId, websiteId);
        } catch (e) {
          console.warn("[tryRenderShopifyLiquidStorefront] listPublicStorefrontCollections (cart drawer) failed:", e);
          rowsForCartDrawer = [];
        }
      }
      if (rowsForCartDrawer.length > 0) {
        html = applyCartDrawerEmptyCollectionsToHtml(html, rowsForCartDrawer, {
          collectionPathPrefix: "/shop/collections",
        });
      }
    }
    return { html, pageTitle: page_title };
  } catch (e) {
    console.warn("[tryRenderShopifyLiquidStorefront] aborted (missing files, IO, or Liquid setup):", e);
    return null;
  }
}
