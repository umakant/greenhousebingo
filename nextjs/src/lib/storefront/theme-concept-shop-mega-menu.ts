/**
 * Replace the Concept header “Shop” mega-menu (`ul.mega-menu__list--tabs`) with published
 * storefront collection tabs and product cards (Concept OS2 layout: tabs column, then
 * “Most popular” product strip + optional bundle promo card).
 */

import type { ConceptFeaturedTabsCollection, ConceptHomeGridProduct } from "@/lib/storefront/public-catalog";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/\r?\n/g, " ");
}

const ROW_ARROW = `<svg class="icon icon-arrow-right icon-sm transform shrink-0" viewBox="0 0 21 20" stroke="currentColor" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation">
      <path stroke-linecap="round" stroke-linejoin="round" d="M3 10H18M18 10L12.1667 4.16675M18 10L12.1667 15.8334"></path>
    </svg>`;

const ROW_ARROW_XS = `<svg class="icon icon-arrow-right icon-xs transform shrink-0 hidden xl:block" viewBox="0 0 21 20" stroke="currentColor" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation">
      <path stroke-linecap="round" stroke-linejoin="round" d="M3 10H18M18 10L12.1667 4.16675M18 10L12.1667 15.8334"></path>
    </svg>`;

const STAR_SVG = `<svg class="icon icon-star icon-xs" viewBox="0 0 16 16" stroke="none" fill="currentColor" xmlns="http://www.w3.org/2000/svg" role="presentation">
      <path d="M8 0L9.88914 5.81283H16L11.056 9.40604L12.9452 15.2177L8 11.6245L3.05603 15.2177L4.94397 9.40484L0 5.81163H6.11086L8 0Z"></path>
    </svg>`;

const TABS_CLASS = "mega-menu__list mega-menu__list--tabs";

function formatShopPrice(amount: number): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function findMegaMenuTabsUlOpenStart(html: string): number {
  const needle = html.indexOf(TABS_CLASS);
  if (needle === -1) return -1;
  const ulStart = html.lastIndexOf("<ul", needle + 1);
  return ulStart;
}

/** First `>` after `ulStart` (opening `<ul …>` tag). */
function findUlOpenEnd(html: string, ulStart: number): number {
  return html.indexOf(">", ulStart);
}

/** Byte index **after** the closing `</ul>` that matches `ulStart`. */
function findMatchingUlCloseEnd(html: string, ulStart: number): number {
  const gt = html.indexOf(">", ulStart);
  if (gt === -1) return -1;
  let i = gt + 1;
  let depth = 1;
  while (i < html.length) {
    const a = html.indexOf("<ul", i);
    const b = html.indexOf("</ul>", i);
    if (b === -1) return -1;
    if (a !== -1 && a < b) {
      depth++;
      i = a + 3;
    } else {
      depth--;
      if (depth === 0) return b + 5;
      i = b + 5;
    }
  }
  return -1;
}

/** Concept sidebar: collection title only (no thumbnails — keeps the COLLECTIONS column text-first). */
function renderTabButtons(collections: ConceptFeaturedTabsCollection[]): string {
  return collections
    .map((col, i) => {
      const panelId = `TabPanel-mega_menu_tab-${i}`;
      const disabled = i === 0 ? ` disabled=""` : "";
      return `<button type="button" class="mega-menu__nav-item pf-mega-collection-tab flex w-full items-center opacity-0 link icon-with-text text-left" role="tab" aria-controls="${panelId}" data-index="${i}"${disabled}><span class="heading link-text text-xl-3xl tracking-tighter leading-tight">${escapeHtml(
        col.title,
      )}</span></button>`;
    })
    .join("");
}

/** Concept mega-menu product row: `product-card` without quick-view, swatches, or variant links. */
function renderMegaMenuProductCard(p: ConceptHomeGridProduct, productBase: string): string {
  const slugEnc = encodeURIComponent(p.slug);
  const href = `${productBase.replace(/\/$/, "")}/${slugEnc}`;
  const img = (p.image ?? "").trim() || "/favicon.ico";
  const price = formatShopPrice(p.price);
  const brand = (p.brandName ?? "").trim();
  const vendorBlock = brand
    ? `<div class="product-card__top w-full">
          <span class="caption reversed-link uppercase leading-none tracking-widest">${escapeHtml(brand)}</span>
        </div>`
    : "";
  return `<div class="card product-card product-card--card flex flex-col leading-none relative">
      <div class="product-card__media relative h-auto">
        <div class="rating product-card__rating z-2 absolute rounded-full flex items-center gap-2 md:gap-1d5 pointer-events-none" title="">
              <span role="img" aria-label="5.0 out of 5.0 stars">${STAR_SVG}</span>5.0</div>
        <a class="block relative media media--square" href="${escapeAttr(href)}"><img src="${escapeAttr(img)}" alt="${escapeAttr(
          p.name,
        )}" width="800" height="800" loading="lazy"></a>
      </div>
      <div class="product-card__content grow flex flex-col justify-start text-left w-full">
        ${vendorBlock}
        <div class="product-card__details flex flex-col lg:flex-row items-baseline gap-2 w-full">
        <p class="grow">
          <a class="product-card__title reversed-link text-base-xl font-medium leading-tight" href="${escapeAttr(href)}">${escapeHtml(
            p.name,
          )}</a>
        </p>
        <div class="flex flex-col gap-2"><div class="price flex flex-wrap lg:flex-col lg:items-end gap-2 md:gap-1d5"><span class="price__regular whitespace-nowrap">${escapeHtml(
          price,
        )}</span></div>
</div>
      </div>
      </div>
    </div>`;
}

function renderMegaMenuProductStrip(products: ConceptHomeGridProduct[], productBase: string, maxCards: number): string {
  const slice = products.slice(0, Math.max(1, maxCards));
  if (!slice.length) {
    return `<div class="card product-card product-card--card flex flex-col leading-none relative col-span-full">
        <div class="product-card__content grow flex flex-col justify-center text-left w-full p-6">
          <p class="text-sm opacity-80">No products in this collection yet.</p>
        </div>
      </div>`;
  }
  return slice.map((p) => renderMegaMenuProductCard(p, productBase)).join("");
}

function renderBundlePromoCard(opts: {
  title: string;
  subline: string;
  href: string;
  imageUrl: string;
}): string {
  return `<div class="media-card media-card--card media-card--overlap">
                    <a class="media-card__link flex flex-col w-full h-full relative" href="${escapeAttr(opts.href)}" aria-label="${escapeAttr(
                      opts.title,
                    )}" style="--color-foreground: 255 255 255;--color-overlay: 0 0 0;--overlay-opacity: 0.0;"><div class="media media--adapt relative overflow-hidden loading"><img src="${escapeAttr(
                      opts.imageUrl,
                    )}" alt="" width="1200" height="1200" loading="lazy" is="lazy-image"></div><div class="media-card__content flex justify-between items-center gap-4 w-full">
                          <div class="media-card__text opacity-0 shrink-1 grid gap-0d5"><p>
                                <span class="heading reversed-link text-xl-3xl tracking-tighter leading-tight">${escapeHtml(
                                  opts.title,
                                )}</span>
                              </p><p class="leading-none text-xs">${escapeHtml(opts.subline)}</p></div>${ROW_ARROW_XS}</div></a>
                  </div>`;
}

function renderPanels(
  collections: ConceptFeaturedTabsCollection[],
  productPathPrefix: string,
  collectionPathPrefix: string,
  buildOpts: ShopMegaMenuBuildOptions,
): string {
  const collBase = collectionPathPrefix.replace(/\/$/, "");
  const prodBase = productPathPrefix.replace(/\/$/, "");
  const centerHeading = escapeHtml(
    (buildOpts.centerColumnHeading ?? "Most popular").trim() || "Most popular",
  );
  const maxPopular = Math.min(8, Math.max(1, buildOpts.maxPopularProducts ?? 3));
  const showBundle = buildOpts.showBundlePromo !== false;
  const defaultBundleHref = (buildOpts.bundlePromoHref ?? "/shop").trim() || "/shop";
  const defaultBundleTitle = (buildOpts.bundlePromoTitle ?? "Build your bundle").trim() || "Build your bundle";
  const defaultBundleSubline =
    (buildOpts.bundlePromoSubline ?? "Buy more and save on your favorites.").trim() ||
    "Buy more and save on your favorites.";

  return collections
    .map((col, i) => {
      const panelId = `TabPanel-mega_menu_tab-${i}`;
      const hidden = i > 0 ? ` hidden=""` : "";
      const slugEnc = encodeURIComponent(col.slug.trim().toLowerCase());
      const collHref = `${collBase}/${slugEnc}`;
      const n = col.productCount;
      const strip = renderMegaMenuProductStrip(col.products, prodBase, maxPopular);
      const bundleImage =
        (buildOpts.bundlePromoImageUrl ?? "").trim() ||
        (col.products.map((p) => (p.image ?? "").trim()).find(Boolean) ?? "").trim() ||
        "/favicon.ico";
      const bundleBlock =
        showBundle &&
        renderBundlePromoCard({
          title: defaultBundleTitle,
          subline: defaultBundleSubline,
          href: defaultBundleHref,
          imageUrl: bundleImage,
        });
      return `<div id="${panelId}" class="mega-menu__panel grid w-full" role="tabpanel"${hidden}>
                <div class="grid gap-8">
                  <div class="flex items-center justify-between gap-4"><p class="text-sm text-opacity leading-none uppercase">${centerHeading}</p><a class="mega-menu__link link icon-with-text" href="${escapeAttr(collHref)}">
                      <span class="heading link-text text-base-xl tracking-tight flex items-center gap-1">All ${escapeHtml(col.title)}<span class="text-base font-medium tracking-tight">(${n})</span></span>${ROW_ARROW}
                    </a>
                  </div><slider-element id="Slider-mega_menu_tab-${i}" class="grid slider slider--desktop slider--tablet" selector=".card-grid&gt;.card" tabindex="0">
                    <motion-list class="product-grid card-grid card-grid--3 mobile:card-grid--1 grid" initialized="">
${strip}
                    </motion-list>
                  </slider-element>
                </div>${bundleBlock ? bundleBlock : ""}
              </div>`;
    })
    .join("");
}

export type ShopMegaMenuBuildOptions = {
  productPathPrefix?: string;
  collectionPathPrefix?: string;
  /** Sidebar label above collection tabs (theme default: “Collections” / “Flavors”). */
  sidebarLabel?: string;
  /** Uppercase-friendly heading above the product strip (Concept: “Most popular”). */
  centerColumnHeading?: string;
  /** Product cards per collection tab (Concept shows three). */
  maxPopularProducts?: number;
  /** When false, omit the right-hand bundle promo `media-card`. */
  showBundlePromo?: boolean;
  bundlePromoTitle?: string;
  bundlePromoSubline?: string;
  bundlePromoHref?: string;
  /** Fixed hero for the bundle card; defaults to the first product image in that tab. */
  bundlePromoImageUrl?: string;
};

/**
 * Inner HTML for `ul.mega-menu__list--tabs` (two top-level `<li>` blocks: tabs column + panels).
 */
export function buildShopMegaMenuTabsListInnerHtml(
  collections: ConceptFeaturedTabsCollection[],
  options?: ShopMegaMenuBuildOptions,
): string {
  if (!collections.length) return "";
  const productPathPrefix = options?.productPathPrefix ?? "/shop/products";
  const collectionPathPrefix = options?.collectionPathPrefix ?? "/shop/collections";
  const sidebarLabel = escapeHtml((options?.sidebarLabel ?? "Collections").trim() || "Collections");
  const viewAllHref = escapeAttr(collectionPathPrefix.replace(/\/$/, ""));
  const tabsInner = renderTabButtons(collections);
  const panelsInner = renderPanels(collections, productPathPrefix, collectionPathPrefix, options ?? {});
  return `
        <li class="mega-menu__item mega-menu__item--tabs opacity-0 w-full flex flex-col gap-8"><p class="text-sm text-opacity leading-none uppercase font-medium">${sidebarLabel}</p><tabs-element class="mega-menu__nav mega-menu__nav--tabs pf-mega-collection-tabs grid gap-1d5" selected-index="0">${tabsInner}</tabs-element><div class="mega-menu__footer relative pf-mega-collections-footer">
              <a class="mega-menu__link link icon-with-text flex items-center justify-between w-full h-full" href="${viewAllHref}">
                <span class="heading link-text text-base-xl tracking-tight">View All Products</span>${ROW_ARROW}
              </a>
            </div></li>
        <li class="mega-menu__item mega-menu__item--panels opacity-0 w-full">${panelsInner}</li>
      `;
}

/**
 * When the theme exposes the OS2 Shop mega-menu (`mega-menu__list--tabs`), replace its contents
 * with catalog-driven collection tabs + product rows.
 */
export function applyShopMegaMenuFeaturedTabsToHtml(
  html: string,
  collections: ConceptFeaturedTabsCollection[],
  options?: ShopMegaMenuBuildOptions,
): string {
  if (!collections.length || !html.includes(TABS_CLASS)) return html;
  const ulStart = findMegaMenuTabsUlOpenStart(html);
  if (ulStart === -1) return html;
  const openEnd = findUlOpenEnd(html, ulStart);
  if (openEnd === -1) return html;
  const ulCloseEndEx = findMatchingUlCloseEnd(html, ulStart);
  if (ulCloseEndEx === -1) return html;
  const innerProbe = html.slice(openEnd + 1, ulCloseEndEx - 5);
  /** OS2 Shop mega-menu: require tab + panel columns (TabPanel id prefix may differ across theme exports). */
  if (
    !innerProbe.includes("mega-menu__item--panels") ||
    !innerProbe.includes("mega-menu__item--tabs")
  ) {
    return html;
  }

  let openTag = html.slice(ulStart, openEnd + 1);
  if (!/\bdata-pf-shop-mega\s*=/i.test(openTag)) {
    openTag = `${openTag.slice(0, -1)} data-pf-shop-mega="1">`;
  }
  const newInner = buildShopMegaMenuTabsListInnerHtml(collections, options);
  const closeAndRest = html.slice(ulCloseEndEx - 5);
  return `${html.slice(0, ulStart)}${openTag}${newInner}${closeAndRest}`;
}
