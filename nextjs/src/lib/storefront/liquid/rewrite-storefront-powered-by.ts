/**
 * Shopify theme footers commonly include “Powered by Shopify”. Paper Flight–hosted storefronts
 * show Paper Flight attribution instead (exact casing for display).
 */
export function rewritePoweredByShopifyAttribution(html: string): string {
  return html.replace(/Powered[\s\u00a0]+by[\s\u00a0]+Shopify/gi, "powerd by WaterIceExpress");
}

/**
 * Theme boot markup sometimes sets `Shopify.theme.handle` to the **string** `"null"` when no handle
 * exists off-platform. Client-side mega-menu / drawer code may concatenate that into visible text.
 */
export function normalizeShopifyThemeBootNullArtifacts(html: string): string {
  return html
    .replace(/\bShopify\.theme\.handle\s*=\s*"null"\s*;/g, 'Shopify.theme.handle = "";')
    .replace(/\bShopify\.theme\.handle\s*=\s*'null'\s*;/g, "Shopify.theme.handle = '';")
    .replace(/\bShopify\.theme\.handle\s*=\s*null\s*;/g, 'Shopify.theme.handle = "";');
}

const ANNOUNCEMENT_BAR_BRAND_STYLE = `<style id="pf-announcement-bar-brand">
/* Concept OS2 top bar — solid Philly-style blue (overrides section color-scheme / gradient). */
.shopify-section.topbar-section {
  --gradient-background: none !important;
  /* ~#1d4ed8 — matches header / logo blues on branded storefronts */
  --color-background: 29 78 216 !important;
  --color-foreground: 255 255 255 !important;
  /* Sticky header uses z-index ~100; raise top bar so country/language dropdowns paint above it. */
  position: relative !important;
  z-index: 110 !important;
}
.shopify-section.topbar-section dropdown-localization.dropdown {
  z-index: 200 !important;
}
</style>`;

/**
 * Injects a small stylesheet so the announcement / utility top bar uses brand blue instead of black
 * or demo gradients from `settings_data.json` (OS2 `color-background` is space-separated RGB triples).
 */
export function injectStorefrontAnnouncementBarBrandCss(html: string): string {
  if (!html || !html.includes("topbar-section")) return html;
  if (html.includes('id="pf-announcement-bar-brand"')) return html;
  const headClose = html.search(/<\/head>/i);
  if (headClose !== -1) {
    return `${html.slice(0, headClose)}${ANNOUNCEMENT_BAR_BRAND_STYLE}${html.slice(headClose)}`;
  }
  const bodyOpen = html.match(/<body[^>]*>/i);
  if (bodyOpen && bodyOpen.index !== undefined) {
    const end = bodyOpen.index + bodyOpen[0].length;
    return `${html.slice(0, end)}${ANNOUNCEMENT_BAR_BRAND_STYLE}${html.slice(end)}`;
  }
  return html;
}

const STICKY_HEADER_STYLE = `<style id="pf-storefront-sticky-header">
/* OS2 / Concept: keep primary nav visible while scrolling on tablet/desktop only. */
@media (min-width: 1024px) {
  .shopify-section.header-section {
    position: sticky !important;
    top: 0 !important;
    z-index: 100 !important;
    background-color: rgb(var(--color-background, 255 255 255)) !important;
    box-shadow: 0 1px 0 rgb(0 0 0 / 0.06);
  }
  .shopify-section.header-section header[is="sticky-header"],
  .shopify-section.header-section .header {
    background-color: inherit;
  }
  /* ThemeForest / legacy packaged themes */
  #header.sticky-header {
    position: sticky !important;
    top: 0 !important;
    z-index: 100 !important;
  }
}
/*
 * Sticky .header-section uses z-index: 100. Raise overlay sections (cart, search, newsletter, …)
 * so the right drawer and dimmed backdrop sit above the header chrome when open.
 */
.shopify-section.shopify-section-group-overlay-group {
  position: relative;
  z-index: 120 !important;
}
/*
 * OS2 / Concept: the header section ends with <span class="overlay fixed …"> (sibling of </header>).
 * It scrims the viewport for mega-menu / sticky transitions. If custom elements hydrate late or
 * conflict with Paper Flight–hosted assets, that span can sit visibly above the main page — looks
 * like a permanent “backshadow” under the nav. Keep it inert until real theme JS toggles it.
 */
.shopify-section.header-section > span.overlay {
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
}
/* Phones: scroll header away; hide Concept gradient rule + duplicate PDP highlights row. */
@media (max-width: 1023px) {
  .shopify-section.header-section {
    position: relative !important;
    top: auto !important;
    z-index: 20 !important;
    box-shadow: none !important;
  }
  .shopify-section.header-section.header-sticky::after,
  .shopify-section.header-section[id*="__header"]::after {
    display: none !important;
  }
  .featured-product .product__gallery-container > .product__highlights.below-media,
  .product .product__gallery-container > .product__highlights.below-media {
    display: none !important;
  }
}
/* Footer brand logo: enlarge beyond the theme's inline 160x60 cap (logo art is 320x120 intrinsic). */
.footer[aria-label="Footer"] .footer__logo img,
.footer__logo img {
  max-width: 300px !important;
  max-height: 120px !important;
  --image-width: 300px !important;
  --image-height: 120px !important;
}
</style>`;

/**
 * Ensures the storefront main header stays pinned while scrolling on Paper Flight–hosted Liquid / static Concept HTML.
 * Targets OS2 `.header-section` and legacy `#header.sticky-header`.
 * Also raises `shopify-section-group-overlay-group` above the sticky header so cart/search drawers cover the nav.
 */
/**
 * Theme ZIPs often include `shopify-design-mode` on drawers; off-Shopify hosting that can encourage
 * “preview” scripts to treat overlays differently. Strip the attribute so drawers stay closed by default.
 */
export function stripStorefrontShopifyDesignModeAttrs(html: string): string {
  if (!html || !html.includes("shopify-design-mode")) return html;
  return html.replace(/\s+shopify-design-mode="[^"]*"/gi, "").replace(/\s+shopify-design-mode/gi, "");
}

export function injectStorefrontStickyHeaderCss(html: string): string {
  if (!html) return html;
  const looksOs2 =
    html.includes('is="sticky-header"') || html.includes("header-section") || html.includes("header-sticky");
  const looksLegacy = /id=["']header["'][^>]*sticky-header/i.test(html);
  const hasOverlayGroup = html.includes("shopify-section-group-overlay-group");
  if (!looksOs2 && !looksLegacy && !hasOverlayGroup) return html;
  if (html.includes('id="pf-storefront-sticky-header"')) return html;
  const headClose = html.search(/<\/head>/i);
  if (headClose !== -1) {
    return `${html.slice(0, headClose)}${STICKY_HEADER_STYLE}${html.slice(headClose)}`;
  }
  const bodyOpen = html.match(/<body[^>]*>/i);
  if (bodyOpen && bodyOpen.index !== undefined) {
    const end = bodyOpen.index + bodyOpen[0].length;
    return `${html.slice(0, end)}${STICKY_HEADER_STYLE}${html.slice(end)}`;
  }
  return html;
}

const PRIMARY_NAV_HOVER_UNIFY_STYLE = `<style id="pf-storefront-primary-nav-hover">
/* OS2 / Concept: Shop/Collections/Explore use <details><summary class="rounded-full"> (strong filled hover)
   while Compare/Contact use <a class="menu__item"> — looks inconsistent off Shopify. Match all to a light tint. */
.shopify-section.header-section nav.header__menu ul.list-menu > li > details > summary {
  background-color: transparent !important;
  background-image: none !important;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.shopify-section.header-section nav.header__menu ul.list-menu > li > details > summary:hover,
.shopify-section.header-section nav.header__menu ul.list-menu > li > details[open] > summary {
  background-color: rgb(var(--color-foreground, 23 23 23) / 0.08) !important;
  color: rgb(var(--color-foreground, 23 23 23)) !important;
}
.shopify-section.header-section nav.header__menu ul.list-menu > li > details > summary .btn-fill,
.shopify-section.header-section nav.header__menu ul.list-menu > li > details > summary span.btn-fill[data-fill] {
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
}
.shopify-section.header-section nav.header__menu ul.list-menu > li > a.menu__item {
  border-radius: 9999px;
  background-color: transparent !important;
  background-image: none !important;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.shopify-section.header-section nav.header__menu ul.list-menu > li > a.menu__item:hover,
.shopify-section.header-section nav.header__menu ul.list-menu > li > a.menu__item:focus-visible {
  background-color: rgb(var(--color-foreground, 23 23 23) / 0.08) !important;
  color: rgb(var(--color-foreground, 23 23 23)) !important;
}
.shopify-section.header-section nav.header__menu ul.list-menu > li > a.menu__item .btn-fill,
.shopify-section.header-section nav.header__menu ul.list-menu > li > a.menu__item span.btn-fill[data-fill] {
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
}
</style>`;

/**
 * Unifies desktop primary nav hover/active chrome (mega-menu `<summary>` vs plain `<a.menu__item>`).
 */
export function injectStorefrontPrimaryNavHoverNormalize(html: string): string {
  if (!html || html.includes('id="pf-storefront-primary-nav-hover"')) return html;
  if (!html.includes("header__menu") || !html.includes("list-menu")) return html;
  const headClose = html.search(/<\/head>/i);
  if (headClose !== -1) {
    return `${html.slice(0, headClose)}${PRIMARY_NAV_HOVER_UNIFY_STYLE}${html.slice(headClose)}`;
  }
  const bodyOpen = html.match(/<body[^>]*>/i);
  if (bodyOpen && bodyOpen.index !== undefined) {
    const end = bodyOpen.index + bodyOpen[0].length;
    return `${html.slice(0, end)}${PRIMARY_NAV_HOVER_UNIFY_STYLE}${html.slice(end)}`;
  }
  return html;
}

const CART_DRAWER_HIDE_RECENTLY_VIEWED_STYLE = `<style id="pf-storefront-cart-hide-recently-viewed">
/* OS2 cart drawer: "Recently viewed" tab hits Shopify section APIs we do not serve; hide tab + panel. */
cart-drawer .drawer__panel[id^="RecentlyViewed-"] {
  display: none !important;
}
cart-drawer .drawer__tabs li:has(button[aria-controls^="RecentlyViewed-"]) {
  display: none !important;
}
/* Empty mini-cart: theme .heading tokens are often missing off-Shopify; keep copy + collection rows readable. */
cart-drawer .drawer__empty .drawer__empty-text,
cart-drawer .drawer__empty .drawer__empty-message {
  color: rgb(24 24 27) !important;
}
cart-drawer .drawer__empty-collections > li > a {
  padding: 0.65rem 0.85rem;
  border-radius: 0.5rem;
  background: rgba(0, 0, 0, 0.05);
  color: rgb(24 24 27) !important;
  text-decoration: none !important;
}
cart-drawer .drawer__empty-collections > li > a .icon {
  color: currentColor;
  opacity: 0.55;
}
</style>`;

/** Hides the theme mini-cart "Recently viewed" tab (Concept / OS2) on Paper Flight–hosted storefronts. */
export function injectStorefrontHideCartRecentlyViewed(html: string): string {
  if (!html || !html.includes("cart-drawer")) return html;
  if (html.includes('id="pf-storefront-cart-hide-recently-viewed"')) return html;
  const headClose = html.search(/<\/head>/i);
  if (headClose !== -1) {
    return `${html.slice(0, headClose)}${CART_DRAWER_HIDE_RECENTLY_VIEWED_STYLE}${html.slice(headClose)}`;
  }
  const bodyOpen = html.match(/<body[^>]*>/i);
  if (bodyOpen && bodyOpen.index !== undefined) {
    const end = bodyOpen.index + bodyOpen[0].length;
    return `${html.slice(0, end)}${CART_DRAWER_HIDE_RECENTLY_VIEWED_STYLE}${html.slice(end)}`;
  }
  return html;
}

const HIDE_THEME_SEARCH_DRAWER_STYLE = `<style id="pf-storefront-hide-search-drawer">
/* OS2 / Concept predictive-search drawer (section HTML + suggest APIs we do not serve). */
.shopify-section-group-overlay-group:has(#SearchDrawer),
search-drawer#SearchDrawer {
  display: none !important;
}
</style>`;

/**
 * Theme search icons open a predictive-search drawer that calls Shopify APIs we do not host.
 * Rewrite triggers to `/shop/search` so the header matches native storefronts; keep the drawer HTML hidden.
 */
export function rewriteStorefrontSearchDrawerTriggersToShopSearch(
  html: string,
  searchPath = "/shop/search",
): string {
  if (!html.includes("SearchDrawer")) return html;
  let out = html;
  /** Concept OS2 export — header search (often duplicated for sticky header). */
  out = out.replaceAll(
    `<a href="#" class="search-drawer-button flex items-center justify-center" is="magnet-link" aria-controls="SearchDrawer" aria-expanded="false">`,
    `<a href="${searchPath}" class="search-drawer-button flex items-center justify-center" data-pf-shop-search="1">`,
  );
  /** Mobile dock search tab. */
  out = out.replaceAll(
    `<a class="dock__item flex flex-col items-center justify-center gap-1d5 grow shrink-0 cursor-pointer" href="#" aria-controls="SearchDrawer" aria-expanded="false">`,
    `<a class="dock__item flex flex-col items-center justify-center gap-1d5 grow shrink-0 cursor-pointer" href="${searchPath}" data-pf-shop-search="1">`,
  );
  return out;
}

const HIDE_PRODUCT_FORM_ALERT_STYLE = `<style id="pf-storefront-hide-product-form-alert">
/* OS2: primary submit + duplicate "Sold out — notify me" (product-form__alert). Off Shopify, theme JS
   can flash the alert before Paper Flight cart/stock state; we only use the real add-to-cart path. */
button.product-form__alert,
.buy-buttons.back-in-stock button.product-form__alert {
  display: none !important;
}
</style>`;

/**
 * Hides the theme "back in stock" / sold-out companion button next to Add to cart (Concept OS2).
 * Inventory is enforced by `/api/storefront/public/cart`; the duplicate CTA only confuses shoppers.
 */
export function injectStorefrontHideProductFormAlert(html: string): string {
  if (!html || !html.includes("product-form")) return html;
  if (html.includes('id="pf-storefront-hide-product-form-alert"')) return html;
  const headClose = html.search(/<\/head>/i);
  if (headClose !== -1) {
    return `${html.slice(0, headClose)}${HIDE_PRODUCT_FORM_ALERT_STYLE}${html.slice(headClose)}`;
  }
  const bodyOpen = html.match(/<body[^>]*>/i);
  if (bodyOpen && bodyOpen.index !== undefined) {
    const end = bodyOpen.index + bodyOpen[0].length;
    return `${html.slice(0, end)}${HIDE_PRODUCT_FORM_ALERT_STYLE}${html.slice(end)}`;
  }
  return html;
}

/** Hides the theme slide-out search drawer (triggers are rewritten to `/shop/search` first). */
export function injectStorefrontHideThemeSearchDrawer(html: string): string {
  if (!html || !html.includes("SearchDrawer")) return html;
  if (html.includes('id="pf-storefront-hide-search-drawer"')) return html;
  const headClose = html.search(/<\/head>/i);
  if (headClose !== -1) {
    return `${html.slice(0, headClose)}${HIDE_THEME_SEARCH_DRAWER_STYLE}${html.slice(headClose)}`;
  }
  const bodyOpen = html.match(/<body[^>]*>/i);
  if (bodyOpen && bodyOpen.index !== undefined) {
    const end = bodyOpen.index + bodyOpen[0].length;
    return `${html.slice(0, end)}${HIDE_THEME_SEARCH_DRAWER_STYLE}${html.slice(end)}`;
  }
  return html;
}

const REACT_MAIN_SLOT_THEME_STYLE = `<style id="pf-react-main-slot-theme">
/* Cart / checkout React mounted in #pf-react-main-slot: inherit OS2 / Concept tokens, soften Tailwind utility clashes. */
#pf-react-main-slot {
  color: rgb(var(--color-foreground, 23 23 23));
}
/* Let React-filled MainContent size to content so the theme footer stays in normal document flow. */
main#MainContent.main-content {
  display: block !important;
  flex: 0 1 auto !important;
  min-height: 0 !important;
}
html:has(#pf-react-main-slot) #PageContainer {
  min-height: 0 !important;
}
/* OS2 flex rules can flatten cart rows; enforce layout (stack on small screens, row from sm / 640px). */
#pf-react-main-slot .pf-storefront-cart-line {
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  min-width: 0 !important;
}
@media (min-width: 640px) {
  #pf-react-main-slot .pf-storefront-cart-line {
    flex-direction: row !important;
    align-items: center !important;
  }
}
#pf-react-main-slot .pf-storefront-cart-line__meta {
  flex: 1 1 0% !important;
  min-width: 0 !important;
}
/* Cart page: two-column summary + line list — theme flex/grid can flatten nested grids. */
#pf-react-main-slot .pf-storefront-cart-layout {
  display: grid !important;
  width: 100% !important;
  min-width: 0 !important;
  grid-template-columns: minmax(0, 1fr) !important;
  gap: 2rem !important;
  align-items: start !important;
}
@media (min-width: 1024px) {
  #pf-react-main-slot .pf-storefront-cart-layout {
    grid-template-columns: minmax(0, 1fr) minmax(260px, 380px) !important;
  }
}
@media (min-width: 1024px) {
  #pf-react-main-slot .pf-storefront-cart-summary {
    position: sticky !important;
    top: 5.5rem !important;
    align-self: start !important;
  }
}
/* Collections index — Concept / OS2 can squash nested grids. */
#pf-react-main-slot .pf-storefront-collections-root {
  min-width: 0 !important;
}
#pf-react-main-slot .pf-storefront-collections-grid {
  display: grid !important;
  width: 100% !important;
  min-width: 0 !important;
  grid-template-columns: minmax(0, 1fr) !important;
}
@media (min-width: 640px) {
  #pf-react-main-slot .pf-storefront-collections-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
}
@media (min-width: 1024px) {
  #pf-react-main-slot .pf-storefront-collections-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  }
}
#pf-react-main-slot .text-muted-foreground {
  color: rgb(var(--color-foreground, 23 23 23) / 0.58) !important;
}
#pf-react-main-slot code.rounded,
#pf-react-main-slot .pf-checkout-footnote code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.85em;
  padding: 0.12em 0.4em;
  border-radius: var(--inputs-radius, 0.5rem);
  background: rgb(var(--color-foreground, 23 23 23) / 0.06);
}
#pf-react-main-slot .pf-discount-line {
  color: rgb(var(--color-success-text, 22 101 52));
}
/*
 * React PDP (PublicProductView) inside Concept: theme .section / color-scheme tokens can make
 * shadcn text-foreground effectively invisible on white, and OS2 flex rules can starve grid tracks.
 */
#pf-react-main-slot .pf-pdp-layout {
  display: grid !important;
  width: 100% !important;
  min-width: 0 !important;
  grid-template-columns: minmax(0, 1fr) !important;
  gap: 1.75rem !important;
}
@media (min-width: 1024px) {
  #pf-react-main-slot .pf-pdp-layout {
    grid-template-columns: minmax(0, 5fr) minmax(0, 2fr) minmax(0, 5fr) !important;
    align-items: start !important;
  }
}
#pf-react-main-slot .pf-pdp-layout > * {
  min-width: 0 !important;
}
/* PDP primary CTA: OS2 / Concept button tokens can override Tailwind — force a visible filled CTA. */
#pf-react-main-slot [data-pf-pdp-add],
#pf-react-main-slot .pf-storefront-pdp [data-pf-pdp-add] {
  position: relative !important;
  z-index: 2 !important;
  isolation: isolate !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100% !important;
  min-height: 3rem !important;
  box-sizing: border-box !important;
  padding: 0.75rem 1rem !important;
  background-color: rgb(249 115 22) !important;
  background-image: none !important;
  color: rgb(255 255 255) !important;
  -webkit-text-fill-color: rgb(255 255 255) !important;
  border: 1px solid rgb(194 65 12) !important;
  border-radius: 0.75rem !important;
  box-shadow: 0 4px 14px rgb(0 0 0 / 0.12) !important;
  font-size: 1rem !important;
  font-weight: 600 !important;
  line-height: 1.25 !important;
  cursor: pointer !important;
  opacity: 1 !important;
  visibility: visible !important;
  clip: auto !important;
  clip-path: none !important;
  transform: none !important;
}
#pf-react-main-slot [data-pf-pdp-add]:hover:not(:disabled),
#pf-react-main-slot .pf-storefront-pdp [data-pf-pdp-add]:hover:not(:disabled) {
  background-color: rgb(234 88 12) !important;
}
#pf-react-main-slot [data-pf-pdp-add]::before,
#pf-react-main-slot [data-pf-pdp-add]::after,
#pf-react-main-slot .pf-storefront-pdp [data-pf-pdp-add]::before,
#pf-react-main-slot .pf-storefront-pdp [data-pf-pdp-add]::after {
  content: none !important;
  display: none !important;
}
#pf-react-main-slot [data-pf-pdp-add]:disabled,
#pf-react-main-slot .pf-storefront-pdp [data-pf-pdp-add]:disabled {
  background-color: rgb(148 163 184) !important;
  color: rgb(255 255 255) !important;
  -webkit-text-fill-color: rgb(255 255 255) !important;
  cursor: not-allowed !important;
  opacity: 0.92 !important;
}
/* Theme motion / split-text helpers sometimes zero out nested opacity in buy boxes. */
#pf-react-main-slot [data-pf-pdp-add] *,
#pf-react-main-slot .pf-storefront-pdp [data-pf-pdp-add] * {
  color: inherit !important;
  -webkit-text-fill-color: inherit !important;
  opacity: 1 !important;
  visibility: visible !important;
  transform: none !important;
}
/* Checkout: Concept section tokens can set --color-foreground to white — force readable dark text */
#pf-react-main-slot:has([data-pf-checkout="1"]) {
  color: rgb(23 23 23) !important;
  --color-foreground: 23 23 23;
}
#pf-react-main-slot [data-pf-checkout="1"] .heading,
#pf-react-main-slot [data-pf-checkout="1"] h1,
#pf-react-main-slot [data-pf-checkout="1"] h2,
#pf-react-main-slot [data-pf-checkout="1"] .pf-checkout-summary-title,
#pf-react-main-slot [data-pf-checkout="1"] .pf-checkout-order-summary,
#pf-react-main-slot [data-pf-checkout="1"] .pf-checkout-order-summary p,
#pf-react-main-slot [data-pf-checkout="1"] .pf-checkout-order-summary li,
#pf-react-main-slot [data-pf-checkout="1"] .pf-checkout-order-summary span,
#pf-react-main-slot [data-pf-checkout="1"] .pf-checkout-lines,
#pf-react-main-slot [data-pf-checkout="1"] .pf-checkout-lines li,
#pf-react-main-slot [data-pf-checkout="1"] .pf-checkout-lines span,
#pf-react-main-slot [data-pf-checkout="1"] .text-foreground,
#pf-react-main-slot [data-pf-checkout="1"] label {
  opacity: 1 !important;
  visibility: visible !important;
  transform: none !important;
  color: rgb(23 23 23) !important;
  -webkit-text-fill-color: rgb(23 23 23) !important;
}
#pf-react-main-slot [data-pf-checkout="1"] .text-muted-foreground,
#pf-react-main-slot [data-pf-checkout="1"] .pf-checkout-footnote {
  color: rgb(82 82 82) !important;
  -webkit-text-fill-color: rgb(82 82 82) !important;
}
#pf-react-main-slot [data-pf-checkout="1"] .pf-checkout-order-summary {
  color: rgb(23 23 23) !important;
  background-color: rgb(255 255 255) !important;
  border: 1px solid rgb(23 23 23 / 0.15) !important;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.05) !important;
}
#pf-react-main-slot [data-pf-checkout="1"] .pf-checkout-footnote code {
  color: rgb(23 23 23) !important;
  background: rgb(23 23 23 / 0.06) !important;
}
#pf-react-main-slot [data-pf-checkout="1"] .pf-checkout-thank-you,
#pf-react-main-slot [data-pf-checkout="1"] .pf-checkout-thank-you h1,
#pf-react-main-slot [data-pf-checkout="1"] .pf-checkout-thank-you p {
  opacity: 1 !important;
  visibility: visible !important;
  transform: none !important;
  -webkit-text-fill-color: currentColor !important;
}
#pf-react-main-slot [data-pf-checkout="1"] .pf-checkout-thank-you {
  color: rgb(23 23 23) !important;
  background-color: rgb(255 255 255) !important;
  border: 1px solid rgb(23 23 23 / 0.15) !important;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.05) !important;
}
#pf-react-main-slot [data-pf-checkout="1"] .pf-checkout-thank-you h1 {
  color: rgb(23 23 23) !important;
}
#pf-react-main-slot [data-pf-checkout="1"] .pf-checkout-thank-you p {
  color: rgb(64 64 64) !important;
}
#pf-react-main-slot [data-pf-checkout="1"] [data-pf-checkout-back-store] {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  min-height: 2.75rem !important;
  padding: 0.625rem 1.25rem !important;
  background-color: rgb(255 255 255) !important;
  color: rgb(23 23 23) !important;
  -webkit-text-fill-color: rgb(23 23 23) !important;
  border: 1px solid rgb(23 23 23 / 0.22) !important;
  border-radius: 0.375rem !important;
  font-weight: 500 !important;
  opacity: 1 !important;
  visibility: visible !important;
}
#pf-react-main-slot [data-pf-checkout="1"] [data-pf-checkout-back-store]:hover {
  background-color: rgb(245 245 245) !important;
  color: rgb(23 23 23) !important;
}
#pf-react-main-slot [data-pf-checkout="1"] [data-pf-checkout-back-store] * {
  color: inherit !important;
  -webkit-text-fill-color: inherit !important;
  opacity: 1 !important;
  visibility: visible !important;
}
/* Thank-you: primary CTAs (create account, my account) — same visibility fix as place order */
#pf-react-main-slot [data-pf-checkout="1"] [data-pf-checkout-create-account],
#pf-react-main-slot [data-pf-checkout="1"] [data-pf-checkout-my-account] {
  position: relative !important;
  z-index: 2 !important;
  isolation: isolate !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100% !important;
  min-height: 3rem !important;
  box-sizing: border-box !important;
  padding: 0.75rem 1rem !important;
  background-color: rgb(37 99 235) !important;
  background-image: none !important;
  color: rgb(255 255 255) !important;
  -webkit-text-fill-color: rgb(255 255 255) !important;
  border: 1px solid rgb(29 78 216) !important;
  border-radius: 0.75rem !important;
  box-shadow: 0 4px 14px rgb(0 0 0 / 0.12) !important;
  font-size: 1rem !important;
  font-weight: 600 !important;
  line-height: 1.25 !important;
  cursor: pointer !important;
  opacity: 1 !important;
  visibility: visible !important;
  clip: auto !important;
  clip-path: none !important;
  transform: none !important;
}
#pf-react-main-slot [data-pf-checkout="1"] [data-pf-checkout-create-account]:hover:not(:disabled),
#pf-react-main-slot [data-pf-checkout="1"] [data-pf-checkout-my-account]:hover {
  background-color: rgb(29 78 216) !important;
}
#pf-react-main-slot [data-pf-checkout="1"] [data-pf-checkout-create-account]::before,
#pf-react-main-slot [data-pf-checkout="1"] [data-pf-checkout-create-account]::after,
#pf-react-main-slot [data-pf-checkout="1"] [data-pf-checkout-my-account]::before,
#pf-react-main-slot [data-pf-checkout="1"] [data-pf-checkout-my-account]::after {
  content: none !important;
  display: none !important;
}
#pf-react-main-slot [data-pf-checkout="1"] [data-pf-checkout-create-account]:disabled {
  background-color: rgb(148 163 184) !important;
  color: rgb(255 255 255) !important;
  -webkit-text-fill-color: rgb(255 255 255) !important;
  cursor: not-allowed !important;
  opacity: 0.92 !important;
}
#pf-react-main-slot [data-pf-checkout="1"] [data-pf-checkout-create-account] *,
#pf-react-main-slot [data-pf-checkout="1"] [data-pf-checkout-my-account] * {
  color: inherit !important;
  -webkit-text-fill-color: inherit !important;
  opacity: 1 !important;
  visibility: visible !important;
  transform: none !important;
}
#pf-react-main-slot [data-pf-checkout="1"] .pf-checkout-thank-you label {
  color: rgb(23 23 23) !important;
  -webkit-text-fill-color: rgb(23 23 23) !important;
  opacity: 1 !important;
  visibility: visible !important;
}
#pf-react-main-slot [data-pf-checkout="1"] .pf-checkout-lines > li {
  display: flex !important;
  justify-content: space-between !important;
  align-items: baseline !important;
  gap: 0.5rem !important;
}
/* Checkout fields: Concept theme resets can remove shadcn borders — force visible controls */
#pf-react-main-slot [data-pf-checkout="1"] [data-pf-checkout-control] {
  border: 1px solid rgb(23 23 23 / 0.22) !important;
  border-radius: 0.375rem !important;
  background-color: rgb(255 255 255) !important;
  color: rgb(23 23 23) !important;
  box-shadow: inset 0 1px 2px rgb(0 0 0 / 0.04) !important;
}
#pf-react-main-slot [data-pf-checkout="1"] [data-pf-checkout-control]:focus-visible {
  outline: 2px solid rgb(37 99 235 / 0.45) !important;
  outline-offset: 1px !important;
}
#pf-react-main-slot [data-pf-checkout="1"] [data-pf-checkout-control]:disabled {
  opacity: 0.65 !important;
}
/* Checkout Place order / Pay now: theme button tokens can override Tailwind — force a visible filled CTA */
#pf-react-main-slot [data-pf-checkout="1"] [data-pf-checkout-place-order] {
  position: relative !important;
  z-index: 2 !important;
  isolation: isolate !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100% !important;
  min-height: 3rem !important;
  box-sizing: border-box !important;
  padding: 0.75rem 1rem !important;
  background-color: rgb(37 99 235) !important;
  background-image: none !important;
  color: rgb(255 255 255) !important;
  -webkit-text-fill-color: rgb(255 255 255) !important;
  border: 1px solid rgb(29 78 216) !important;
  border-radius: 0.75rem !important;
  box-shadow: 0 4px 14px rgb(0 0 0 / 0.12) !important;
  font-size: 1rem !important;
  font-weight: 600 !important;
  line-height: 1.25 !important;
  cursor: pointer !important;
  opacity: 1 !important;
  visibility: visible !important;
  clip: auto !important;
  clip-path: none !important;
  transform: none !important;
}
#pf-react-main-slot [data-pf-checkout="1"] [data-pf-checkout-place-order]:hover:not(:disabled) {
  background-color: rgb(29 78 216) !important;
}
#pf-react-main-slot [data-pf-checkout="1"] [data-pf-checkout-place-order]::before,
#pf-react-main-slot [data-pf-checkout="1"] [data-pf-checkout-place-order]::after {
  content: none !important;
  display: none !important;
}
#pf-react-main-slot [data-pf-checkout="1"] [data-pf-checkout-place-order]:disabled {
  background-color: rgb(148 163 184) !important;
  color: rgb(255 255 255) !important;
  -webkit-text-fill-color: rgb(255 255 255) !important;
  cursor: not-allowed !important;
  opacity: 0.92 !important;
}
#pf-react-main-slot [data-pf-checkout="1"] [data-pf-checkout-place-order] * {
  color: inherit !important;
  -webkit-text-fill-color: inherit !important;
  opacity: 1 !important;
  visibility: visible !important;
  transform: none !important;
}
/* My account: match checkout readability + card/button styling inside Concept theme slot */
#pf-react-main-slot:has([data-pf-account="1"]) {
  color: rgb(23 23 23) !important;
  --color-foreground: 23 23 23;
}
#pf-react-main-slot [data-pf-account="1"] h1,
#pf-react-main-slot [data-pf-account="1"] h2,
#pf-react-main-slot [data-pf-account="1"] p,
#pf-react-main-slot [data-pf-account="1"] dt,
#pf-react-main-slot [data-pf-account="1"] dd,
#pf-react-main-slot [data-pf-account="1"] label,
#pf-react-main-slot [data-pf-account="1"] .pf-account-order,
#pf-react-main-slot [data-pf-account="1"] .text-neutral-900 {
  opacity: 1 !important;
  visibility: visible !important;
  transform: none !important;
  -webkit-text-fill-color: currentColor !important;
}
#pf-react-main-slot [data-pf-account="1"] .text-neutral-600,
#pf-react-main-slot [data-pf-account="1"] .text-neutral-500 {
  color: rgb(82 82 82) !important;
  -webkit-text-fill-color: rgb(82 82 82) !important;
}
#pf-react-main-slot [data-pf-account="1"] .pf-account-card,
#pf-react-main-slot [data-pf-account="1"] .pf-account-sidebar {
  background-color: rgb(255 255 255) !important;
  border: 1px solid rgb(23 23 23 / 0.12) !important;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.05) !important;
}
#pf-react-main-slot [data-pf-account="1"] [data-pf-account-control] {
  border: 1px solid rgb(23 23 23 / 0.22) !important;
  border-radius: 0.375rem !important;
  background-color: rgb(255 255 255) !important;
  color: rgb(23 23 23) !important;
  -webkit-text-fill-color: rgb(23 23 23) !important;
  opacity: 1 !important;
}
#pf-react-main-slot [data-pf-account="1"] [data-pf-account-control]:disabled {
  background-color: rgb(245 245 245) !important;
  color: rgb(82 82 82) !important;
  -webkit-text-fill-color: rgb(82 82 82) !important;
}
#pf-react-main-slot [data-pf-account="1"] .pf-account-badge {
  display: inline-flex !important;
  align-items: center !important;
  border-radius: 9999px !important;
  padding: 0.125rem 0.625rem !important;
  font-size: 0.6875rem !important;
  font-weight: 600 !important;
  line-height: 1.25 !important;
  letter-spacing: 0.01em !important;
  white-space: nowrap !important;
}
#pf-react-main-slot [data-pf-account="1"] .pf-account-badge--success {
  background: rgb(220 252 231) !important;
  color: rgb(21 128 61) !important;
}
#pf-react-main-slot [data-pf-account="1"] .pf-account-badge--warning {
  background: rgb(254 243 199) !important;
  color: rgb(180 83 9) !important;
}
#pf-react-main-slot [data-pf-account="1"] .pf-account-badge--muted {
  background: rgb(245 245 245) !important;
  color: rgb(115 115 115) !important;
}
#pf-react-main-slot [data-pf-account="1"] .pf-account-badge--neutral {
  background: rgb(241 245 249) !important;
  color: rgb(51 65 85) !important;
}
#pf-react-main-slot [data-pf-account="1"] [data-pf-account-save],
#pf-react-main-slot [data-pf-account="1"] [data-pf-account-shop-link] {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  min-height: 2.75rem !important;
  padding: 0.625rem 1.25rem !important;
  background-color: rgb(37 99 235) !important;
  color: rgb(255 255 255) !important;
  -webkit-text-fill-color: rgb(255 255 255) !important;
  border: 1px solid rgb(29 78 216) !important;
  border-radius: 0.5rem !important;
  font-weight: 600 !important;
  opacity: 1 !important;
  visibility: visible !important;
}
#pf-react-main-slot [data-pf-account="1"] [data-pf-account-save]:hover:not(:disabled),
#pf-react-main-slot [data-pf-account="1"] [data-pf-account-shop-link]:hover {
  background-color: rgb(29 78 216) !important;
}
#pf-react-main-slot [data-pf-account="1"] [data-pf-account-outline],
#pf-react-main-slot [data-pf-account="1"] [data-pf-account-signout] {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  min-height: 2.5rem !important;
  background-color: rgb(255 255 255) !important;
  color: rgb(23 23 23) !important;
  -webkit-text-fill-color: rgb(23 23 23) !important;
  border: 1px solid rgb(23 23 23 / 0.18) !important;
  border-radius: 0.5rem !important;
  font-weight: 500 !important;
  opacity: 1 !important;
  visibility: visible !important;
}
#pf-react-main-slot [data-pf-account="1"] [data-pf-account-outline]:hover,
#pf-react-main-slot [data-pf-account="1"] [data-pf-account-signout]:hover:not(:disabled) {
  background-color: rgb(245 245 245) !important;
}
#pf-react-main-slot [data-pf-account="1"] [data-pf-account-signout] {
  color: rgb(185 28 28) !important;
  -webkit-text-fill-color: rgb(185 28 28) !important;
}
#pf-react-main-slot [data-pf-account="1"] [data-pf-account-save] *,
#pf-react-main-slot [data-pf-account="1"] [data-pf-account-shop-link] *,
#pf-react-main-slot [data-pf-account="1"] [data-pf-account-outline] *,
#pf-react-main-slot [data-pf-account="1"] [data-pf-account-signout] * {
  color: inherit !important;
  -webkit-text-fill-color: inherit !important;
  opacity: 1 !important;
  visibility: visible !important;
}
#pf-react-main-slot [data-pf-account-login="1"] .pf-account-card {
  max-width: 28rem !important;
  margin-left: auto !important;
  margin-right: auto !important;
}
#pf-react-main-slot [data-pf-account-login="1"] a.font-medium {
  color: rgb(29 78 216) !important;
  -webkit-text-fill-color: rgb(29 78 216) !important;
}
/* Contact page Send button: Concept theme can flatten dark CTAs to background when shadcn disabled:opacity-50 lands on bg-neutral-950 on a white card — force a clearly visible CTA in both states. */
#pf-react-main-slot [data-pf-contact-submit] {
  position: relative !important;
  z-index: 2 !important;
  isolation: isolate !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  min-height: 3rem !important;
  padding: 0.75rem 2rem !important;
  background-color: rgb(10 10 10) !important;
  background-image: none !important;
  color: rgb(255 255 255) !important;
  -webkit-text-fill-color: rgb(255 255 255) !important;
  border-radius: 9999px !important;
  font-size: 0.9375rem !important;
  font-weight: 500 !important;
  line-height: 1.25 !important;
  cursor: pointer !important;
  opacity: 1 !important;
  visibility: visible !important;
  clip: auto !important;
  clip-path: none !important;
  transform: none !important;
}
#pf-react-main-slot [data-pf-contact-submit]:hover:not(:disabled) {
  background-color: rgb(38 38 38) !important;
}
#pf-react-main-slot [data-pf-contact-submit]:disabled {
  background-color: rgb(212 212 212) !important;
  color: rgb(82 82 82) !important;
  -webkit-text-fill-color: rgb(82 82 82) !important;
  cursor: not-allowed !important;
  opacity: 1 !important;
}
#pf-react-main-slot [data-pf-contact-submit]::before,
#pf-react-main-slot [data-pf-contact-submit]::after {
  content: none !important;
  display: none !important;
}
#pf-react-main-slot [data-pf-contact-submit] * {
  color: inherit !important;
  -webkit-text-fill-color: inherit !important;
  opacity: 1 !important;
  visibility: visible !important;
  transform: none !important;
}
/* Shop mega-menu: Concept-style collection list (thumb + title, active vs muted). */
ul[data-pf-shop-mega="1"] tabs-element.mega-menu__nav.pf-mega-collection-tabs {
  gap: 0 !important;
}
ul[data-pf-shop-mega="1"] .pf-mega-collection-tab.mega-menu__nav-item {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  gap: 0.5rem !important;
  width: 100% !important;
  text-align: left !important;
  padding: 0.5rem 0 !important;
  margin: 0 !important;
  border: none !important;
  border-bottom: 1px solid rgb(var(--color-foreground, 23 23 23) / 0.1) !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  aspect-ratio: unset !important;
  min-height: unset !important;
  max-height: unset !important;
  opacity: 1 !important;
}
ul[data-pf-shop-mega="1"] .pf-mega-collection-tab.mega-menu__nav-item:last-of-type {
  border-bottom: none !important;
}
ul[data-pf-shop-mega="1"] .pf-mega-collection-tab[disabled] {
  opacity: 1 !important;
}
/* Active tab: theme sets disabled on the selected row (OS2 tabs-element). */
ul[data-pf-shop-mega="1"] .pf-mega-collection-tab[disabled] .link-text {
  color: rgb(var(--color-foreground, 23 23 23)) !important;
  font-weight: 700 !important;
  opacity: 1 !important;
}
ul[data-pf-shop-mega="1"] .pf-mega-collection-tab:not([disabled]) .link-text {
  color: rgb(var(--color-foreground, 23 23 23) / 0.52) !important;
  font-weight: 500 !important;
}
ul[data-pf-shop-mega="1"] .pf-mega-collection-tab:not([disabled]):hover .link-text {
  color: rgb(var(--color-foreground, 23 23 23) / 0.85) !important;
}
ul[data-pf-shop-mega="1"] .pf-mega-collections-footer {
  border-top: 1px solid rgb(var(--color-foreground, 23 23 23) / 0.12) !important;
  padding-top: 1rem !important;
  margin-top: 0.25rem !important;
}
/*
 * Public /events schedule (EventsSchedule.tsx) RSVP CTA. Same pattern as the PDP "Add to cart" /
 * checkout "Place order" lockdown above: Concept/OS2 motion utilities animate freshly-mounted
 * elements from opacity:0 / translateY, and the theme's .button token cascade swaps Tailwind
 * bg-orange-500 for transparent -- leaving white text on white. Force a visible filled orange
 * CTA, keep the inner text/arrow legible, and stop the theme animation framework from hiding it.
 */
#pf-react-main-slot [data-pf-events-rsvp="1"] {
  position: relative !important;
  z-index: 2 !important;
  isolation: isolate !important;
  display: block !important;
  flex: 1 1 0% !important;
  box-sizing: border-box !important;
  padding: 1.25rem 2rem !important;
  background-color: rgb(249 115 22) !important;
  background-image: none !important;
  color: rgb(255 255 255) !important;
  -webkit-text-fill-color: rgb(255 255 255) !important;
  border: 0 !important;
  border-radius: 0.375rem !important;
  text-align: left !important;
  text-decoration: none !important;
  cursor: pointer !important;
  opacity: 1 !important;
  visibility: visible !important;
  clip: auto !important;
  clip-path: none !important;
  transform: none !important;
}
#pf-react-main-slot [data-pf-events-rsvp="1"]:hover {
  background-color: rgb(234 88 12) !important;
}
#pf-react-main-slot [data-pf-events-rsvp="1"]::before,
#pf-react-main-slot [data-pf-events-rsvp="1"]::after {
  content: none !important;
  display: none !important;
}
#pf-react-main-slot [data-pf-events-rsvp-inner="1"] {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 1rem !important;
  opacity: 1 !important;
  visibility: visible !important;
  transform: none !important;
}
#pf-react-main-slot [data-pf-events-rsvp-inner="1"] > * {
  opacity: 1 !important;
  visibility: visible !important;
  transform: none !important;
}
#pf-react-main-slot [data-pf-events-rsvp-eyebrow="1"],
#pf-react-main-slot [data-pf-events-rsvp-sub="1"] {
  color: rgb(255 255 255 / 0.88) !important;
  -webkit-text-fill-color: rgb(255 255 255 / 0.88) !important;
  margin: 0 !important;
}
#pf-react-main-slot [data-pf-events-rsvp-title="1"] {
  color: rgb(255 255 255) !important;
  -webkit-text-fill-color: rgb(255 255 255) !important;
  margin: 0.25rem 0 0 0 !important;
}
#pf-react-main-slot [data-pf-events-rsvp-sub="1"] {
  margin-top: 0.25rem !important;
}
#pf-react-main-slot [data-pf-events-rsvp-arrow="1"] {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 2.5rem !important;
  height: 2.5rem !important;
  flex: 0 0 auto !important;
  border-radius: 9999px !important;
  background-color: rgb(255 255 255) !important;
  color: rgb(249 115 22) !important;
  -webkit-text-fill-color: rgb(249 115 22) !important;
  opacity: 1 !important;
  visibility: visible !important;
}
/* Sibling secondary "Add to Calendar" button: keep the bordered ghost variant readable. */
#pf-react-main-slot [data-pf-events-secondary="1"] {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  box-sizing: border-box !important;
  padding: 0.75rem 1.5rem !important;
  background-color: rgb(255 255 255) !important;
  background-image: none !important;
  color: rgb(var(--color-foreground, 23 23 23)) !important;
  -webkit-text-fill-color: rgb(var(--color-foreground, 23 23 23)) !important;
  border: 1px solid rgb(var(--color-foreground, 23 23 23) / 0.18) !important;
  border-radius: 0.375rem !important;
  font-size: 0.875rem !important;
  font-weight: 600 !important;
  letter-spacing: 0.05em !important;
  text-transform: uppercase !important;
  cursor: pointer !important;
  opacity: 1 !important;
  visibility: visible !important;
  transform: none !important;
}
#pf-react-main-slot [data-pf-events-secondary="1"]:hover {
  border-color: rgb(249 115 22) !important;
  color: rgb(249 115 22) !important;
  -webkit-text-fill-color: rgb(249 115 22) !important;
}
#pf-react-main-slot [data-pf-events-secondary="1"]::before,
#pf-react-main-slot [data-pf-events-secondary="1"]::after {
  content: none !important;
  display: none !important;
}
</style>`;

const FOOTER_SOCIAL_STACK_STYLE = `<style id="pf-concept-footer-social-stack">
/* Concept OS2 footer: left column (logo + accordions) is often taller than newsletter on short pages. */
.footer[aria-label="Footer"] {
  align-items: start !important;
}
.footer[aria-label="Footer"] .footer__left,
.footer[aria-label="Footer"] .footer__right {
  align-self: start !important;
  height: auto !important;
  min-height: 0 !important;
}
.footer[aria-label="Footer"] .footer__right {
  align-content: start !important;
}
.footer[aria-label="Footer"] .footer__socials,
.footer[aria-label="Footer"] .footer__socials.align-self-end {
  align-self: start !important;
  margin-top: 0 !important;
}
/* The Concept footer stacks "rounded" sections (.section--rounded / .section--next-rounded) that pull up
 * over each other via negative margins, plus a [is="footer-parallax"] band that reserves a viewport-sized
 * blue area, plus a z-indexed "divider" trust-badges row. On TALL pages this is a subtle overlap effect,
 * but on SHORT chrome pages (cart / checkout / account / login) it paints a large empty blue band and the
 * higher-z trust row visually covers the footer columns. Force the whole footer region into plain block
 * flow so every page renders the same: trust row -> footer columns -> copyright bar (no band, no overlap). */
html:has(#pf-react-main-slot) .footer-group,
html:has(#pf-react-main-slot) .footer-group > .section,
html:has(#pf-react-main-slot) .footer-group [is="footer-parallax"],
html:has(#pf-react-main-slot) .footer-group .section--divider,
html:has(#pf-react-main-slot) .footer-group .section--rounded,
html:has(#pf-react-main-slot) .footer-group .section--next-rounded {
  position: static !important;
  z-index: auto !important;
  transform: none !important;
  margin-top: 0 !important;
  min-height: 0 !important;
  height: auto !important;
  border-top-left-radius: 0 !important;
  border-top-right-radius: 0 !important;
}
html:has(#pf-react-main-slot) [is="footer-parallax"],
html:has(#pf-react-main-slot) .section[is="footer-parallax"] {
  display: block !important;
  min-height: 0 !important;
  height: auto !important;
  padding-top: 2.5rem !important;
  padding-bottom: 2.5rem !important;
}
html:has(#pf-react-main-slot) parallax-overlay.footer-overlay,
html:has(#pf-react-main-slot) .footer-overlay {
  display: none !important;
}
/* Columns flow normally under the trust row instead of being pinned to the bottom of a tall parallax;
 * keep the footer grid sized to its content so the newsletter/socials column can't stretch the row. */
html:has(#pf-react-main-slot) [is="footer-parallax"] > *,
html:has(#pf-react-main-slot) .footer[aria-label="Footer"],
html:has(#pf-react-main-slot) .footer[aria-label="Footer"] .footer__left,
html:has(#pf-react-main-slot) .footer[aria-label="Footer"] .footer__right {
  position: static !important;
  height: auto !important;
  min-height: 0 !important;
  align-self: start !important;
}
/* Floating "Get 20% off" rail overlaps the footer on short checkout pages. */
html:has(#pf-react-main-slot) .newsletter-bar {
  display: none !important;
}
/* Inner pages (collections, products, cart, checkout, account, login, search): breathing room between the
 * page content and the footer. Scoped to #pf-react-main-slot so the storefront home page is untouched. */
html:has(#pf-react-main-slot) #pf-react-main-slot {
  padding-bottom: 80px !important;
}
</style>`;

/**
 * Concept OS2 footer: `.footer__socials` uses `align-self-end`, so when the left column is taller than the
 * newsletter column (cart, checkout, short pages), social icons sit at the bottom and leave a large empty
 * blue gap. Keep newsletter + icons stacked at the top of the right column; disable footer parallax overlay
 * and the fixed newsletter promo rail on React cart/checkout shells.
 */
export function injectConceptFooterSocialStack(html: string): string {
  if (!html || html.includes('id="pf-concept-footer-social-stack"')) return html;
  const headClose = html.search(/<\/head>/i);
  if (headClose === -1) return html;
  return `${html.slice(0, headClose)}${FOOTER_SOCIAL_STACK_STYLE}${html.slice(headClose)}`;
}

/**
 * Injected only on theme-chrome pages (cart/checkout shell) after `#pf-react-main-slot` exists.
 * Theme form classes (`input`, `button`, `field`, …) come from the theme stylesheet; this layer
 * aligns residual Tailwind utility colors with `--color-foreground`.
 */
export function injectStorefrontReactMainSlotThemeCss(html: string): string {
  if (!html || !html.includes("pf-react-main-slot")) return html;
  const withFooter = injectConceptFooterSocialStack(html);
  if (withFooter.includes('id="pf-react-main-slot-theme"')) return withFooter;
  const headClose = withFooter.search(/<\/head>/i);
  if (headClose !== -1) {
    return `${withFooter.slice(0, headClose)}${REACT_MAIN_SLOT_THEME_STYLE}${withFooter.slice(headClose)}`;
  }
  const bodyOpen = withFooter.match(/<body[^>]*>/i);
  if (bodyOpen && bodyOpen.index !== undefined) {
    const end = bodyOpen.index + bodyOpen[0].length;
    return `${withFooter.slice(0, end)}${REACT_MAIN_SLOT_THEME_STYLE}${withFooter.slice(end)}`;
  }
  return withFooter;
}
