/**
 * Theme HTML (Liquid output or static Concept `index.html`) uses Shopify root paths (`/collections/...`).
 * Paper Flight serves the storefront under `/shop`, so hrefs and JS-driven `data-link` values must be prefixed.
 */

const STOREFRONT_ROOT_SEGMENTS = "collections|products|pages|blogs|cart|search|account";

export type StorefrontHtmlUrlRewriteOptions = {
  /** Merchant custom domain: keep `/collections/...` (no `/shop` prefix in links). */
  customDomainRoot?: boolean;
};

/** `href` / `data-link` pointing at storefront roots, optional path suffix; skip if already `/shop/...`. */
const ROOT_STOREFRONT_PATH = new RegExp(
  `\\b(href|data-link)=(["'])(/(?:${STOREFRONT_ROOT_SEGMENTS})(?:/[^"']*)?)\\2`,
  "gi",
);

function rewriteRootStorefrontPathsInAttr(html: string, shopPrefix: string): string {
  if (!shopPrefix) return html;
  return html.replace(ROOT_STOREFRONT_PATH, (full, attr: string, q: string, path: string) => {
    if (path === "/shop" || path.startsWith("/shop/")) return full;
    return `${attr}=${q}${shopPrefix}${path}${q}`;
  });
}

/** On custom domains, strip erroneous `/shop` from theme links so URLs stay on the merchant host. */
function stripShopPrefixFromStorefrontPaths(html: string): string {
  return html.replace(
    new RegExp(
      `\\b(href|data-link|action)=(["'])/shop/((?:${STOREFRONT_ROOT_SEGMENTS})[^"']*)\\2`,
      "gi",
    ),
    (_full, attr: string, q: string, path: string) => `${attr}=${q}/${path}${q}`,
  );
}

/**
 * Removes the packaged theme’s “Theme features” marketing link (not applicable on Paper Flight–hosted storefronts).
 */
function stripThemeFeaturesNavItems(html: string): string {
  let out = html;
  /**
   * OS2 primary nav: `<li>…<a … aria-label="Theme features">…</a></li>`.
   * Opening `<a>` may span lines — do not use `[^>]*` before `aria-label` (`.` does not match newline).
   */
  out = out.replace(
    /<li[^>]*>\s*<a[\s\S]*?\baria-label="Theme features"\b[\s\S]*?>[\s\S]*?<\/a>\s*<\/li>/gi,
    "",
  );
  /** Mobile drawer: `Theme features` text link (opening `<a>` may span lines). */
  out = out.replace(
    /<li[^>]*\bdrawer__menu-group\b[^>]*>\s*<a[\s\S]*?\bdrawer__menu-item\b[\s\S]*?>[\s\S]*?Theme features\s*<\/a>\s*<\/li>/gi,
    "",
  );
  return out;
}

/**
 * Adds a Paper Flight **Events** nav link, immediately after **Contact**, in both:
 *  - the desktop primary nav (and its sticky-header clone) — matched by `aria-label="Contact"`,
 *  - the mobile drawer menu — matched by the `drawer__menu-group` `<li>` containing `Contact</a>`.
 *
 * Targets the public `/events` schedule page, the same destination wired up by the shop page's
 * "View all" → upcoming events button, so navigation feels consistent.
 *
 * Idempotent: each replacement matches Contact's `<li>` *and* an optional already-injected Events
 * `<li>` follow-on. If Events is already there we return the match untouched, so re-running the
 * rewrite on already-rewritten HTML (post-customizer merges, etc.) doesn't duplicate the link.
 *
 * Mirrors Concept's anchor markup exactly (same Tailwind utility classes, the dual `btn-text`
 * spans for the magnet hover effect, and `is="magnet-link"`) so the new link inherits the same
 * hover/focus styling and animation as the rest of the nav with no extra CSS.
 */
const EVENTS_DESKTOP_NAV_LI =
  '<li>' +
  '<a href="/events" class="menu__item text-sm-lg flex items-center font-medium z-2 relative cursor-pointer" is="magnet-link" data-magnet="0" aria-label="Events">' +
  '<span class="btn-text" data-text="">Events</span>' +
  '<span class="btn-text btn-duplicate">Events</span>' +
  '</a>' +
  '</li>';

const EVENTS_DRAWER_NAV_LI =
  '<li class="drawer__menu-group">' +
  '<a class="drawer__menu-item block heading text-2xl leading-none tracking-tight" href="/events">Events</a>' +
  '</li>';

function injectEventsNavItem(html: string): string {
  let out = html;

  /**
   * Desktop primary nav (incl. sticky header clone). Contact ships before Events; we capture the
   * full Contact `<li>` and an *optional* Events `<li>` immediately after it so the regex stays
   * idempotent (if Events is already present, the second group matches and we leave it alone).
   *
   * Two regex anti-footguns avoided here:
   *  1. Do NOT use `\b` after `aria-label="Contact"` — `"` and `>` are both non-word chars in JS
   *     regex semantics, so `\b` between them never matches. The literal closing `"` already
   *     enforces an exact attribute-value match (`"Contacts"` would fail because the `s` would
   *     need to satisfy the regex's literal `"`).
   *  2. Constrain the opening-tag attribute scan to `[^>]*` (cannot cross `>`) and the `<a>` body
   *     scan to `(?:(?!<\/a>)[\s\S])*` (cannot cross `</a>`). The naive `[\s\S]*?` lets the
   *     non-greedy match traverse across intermediate `</li><li>` and `</a><a>` sequences,
   *     which over-matches and accidentally swallows neighboring nav items.
   */
  const desktopContactWithMaybeEventsRe =
    /(<li[^>]*>\s*<a[^>]*aria-label="Contact"[^>]*>(?:(?!<\/a>)[\s\S])*<\/a>\s*<\/li>)(\s*<li[^>]*>\s*<a[^>]*aria-label="Events"[^>]*>(?:(?!<\/a>)[\s\S])*<\/a>\s*<\/li>)?/gi;
  out = out.replace(desktopContactWithMaybeEventsRe, (match, contactLi: string, existingEvents?: string) => {
    if (existingEvents) return match;
    return `${contactLi}${EVENTS_DESKTOP_NAV_LI}`;
  });

  /**
   * Mobile drawer (`<ul class="drawer__scrollable drawer__menu …">`). We can't anchor on the
   * drawer's Contact link the way we do on desktop: the existing `stripCompareNavItems` /
   * `stripThemeFeaturesNavItems` regexes use `[\s\S]*?` greedy traversal and end up over-matching
   * across the Contact `<li>` between them, so by the time `injectEventsNavItem` runs, Contact
   * has already been stripped from the drawer markup. Anchoring on the drawer `<ul>` itself —
   * appending Events as the last `<li>` before the closing `</ul>` — is robust against that
   * over-match, and the visible drawer order (Shop, Collections, Explore, Events) lines up with
   * the desktop nav since Compare / Theme features are CSS-hidden anyway.
   *
   * The submenu drop-zones inside the drawer use `<div class="drawer__scrollable …">`, not
   * `<ul>`, so anchoring on `drawer__menu` keeps us away from those nested scroll containers.
   * `<ul>` doesn't self-nest in this drawer layout, so the first `</ul>` after the opening tag
   * is always its matching close.
   */
  const drawerUlRe = /(<ul[^>]*\bdrawer__menu\b[^>]*>)([\s\S]*?)(<\/ul>)/;
  out = out.replace(drawerUlRe, (match, openTag: string, content: string, closeTag: string) => {
    if (content.includes('href="/events">Events</a>')) return match;
    return `${openTag}${content}${EVENTS_DRAWER_NAV_LI}${closeTag}`;
  });

  return out;
}

/** Removes packaged theme “Compare” nav (we do not ship a compare flow on Paper Flight storefronts). */
function stripCompareNavItems(html: string): string {
  let out = html;
  /** OS2 primary nav (incl. sticky header clone): multiline-safe `<a … aria-label="Compare">`. */
  out = out.replace(
    /<li[^>]*>\s*<a[\s\S]*?\baria-label="Compare"\b[\s\S]*?>[\s\S]*?<\/a>\s*<\/li>/gi,
    "",
  );
  /** Mobile drawer: `Compare` text link. */
  out = out.replace(
    /<li[^>]*\bdrawer__menu-group\b[^>]*>\s*<a[\s\S]*?\bdrawer__menu-item\b[\s\S]*?>[\s\S]*?Compare\s*<\/a>\s*<\/li>/gi,
    "",
  );
  return out;
}

/**
 * Concept / OS2 demo nav: Contact ships as `href="#"` with `aria-label`.
 * Point at Paper Flight route; **Compare** is stripped separately (not supported).
 */
/** Main header logo (`header__logo-link`) ships as `href="#"` — point to the storefront root. */
function rewriteHeaderLogoLinkToShop(html: string, homeHref: string): string {
  if (!html.includes("header__logo-link")) return html;
  return html.replace(/<a\b[^>]*\bclass=["'][^"']*header__logo-link[^"']*["'][^>]*>/gi, (tag) => {
    if (!/\bhref=(["'])#\1/.test(tag)) return tag;
    return tag.replace(/\bhref=(["'])#\1/g, (_, quote: string) => `href=${quote}${homeHref}${quote}`);
  });
}

function rewriteThemeHeaderPlaceholderAnchors(html: string, contactHref: string): string {
  const swaps: Array<{ label: string; href: string }> = [{ label: "Contact", href: contactHref }];
  let out = html;
  for (const { label, href } of swaps) {
    const labelRe = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`<a\\s+[^>]*aria-label="${labelRe}"[^>]*>`, "gi"), (tag) => {
      if (!/href=(["'])#\1/.test(tag)) return tag;
      return tag.replace(/href=(["'])#\1/, (_, quote: string) => `href=${quote}${href}${quote}`);
    });
    /** Mobile drawer: same labels as text, no `aria-label`. */
    out = out.replace(
      new RegExp(`(<a\\s+class="drawer__menu-item[^"]*"[^>]*\\b)href=(["'])#\\2>${labelRe}</a>`, "gi"),
      `$1href=$2${href}$2>${label}</a>`,
    );
  }
  return out;
}

/**
 * Concept's primary-nav "Shop" trigger is a `<summary aria-label="Shop" data-link="…/collections/all">`
 * (theme JS navigates to `data-link` on click/tap). Paper Flight surfaces the curated Collections index
 * instead of the full catalog, so retarget just the "Shop" item to `…/collections`.
 *
 * Runs after the `/shop` prefix pass, so it matches both forms: `/shop/collections/all` (app host) and
 * `/collections/all` (merchant custom domain). The captured prefix is preserved so each host stays correct.
 * Scoped to the `aria-label="Shop"` summary, so other `/collections/all` links (e.g. "View all products")
 * are left untouched.
 */
function rewriteShopNavLinkToCollections(html: string): string {
  if (!html.includes('aria-label="Shop"')) return html;
  return html.replace(/<summary\b[^>]*\baria-label="Shop"[^>]*>/gi, (tag) =>
    tag.replace(
      /\bdata-link=(["'])((?:\/shop)?)\/collections\/all\1/i,
      (_m, q: string, shopPrefix: string) => `data-link=${q}${shopPrefix}/collections${q}`,
    ),
  );
}

/** Concept ships tiny `sizes="56px"` etc. on ticker PNGs — browser picks low-res `srcset`. Request larger decode for crisp display. */
const SLIDER_LOGO_SIZES = "(min-width:1280px) 280px, (min-width:768px) 220px, 40vw";

function bumpScrollingSliderLogoSizes(html: string): string {
  if (!html.includes("slider-logos")) return html;
  return html.replace(
    /<img\b([^>]*\bsrc=["'][^"']*slider-logos[^"']*["'][^>]*)>/gi,
    (tag: string) => {
      if (/\bsizes=["']/i.test(tag)) {
        return tag.replace(/\bsizes=["'][^"']*["']/i, `sizes="${SLIDER_LOGO_SIZES}"`);
      }
      return tag.replace(/>$/, ` sizes="${SLIDER_LOGO_SIZES}">`);
    },
  );
}

/**
 * Removes Concept's demo "countdown promo banner" sections (the `Get up to 50% off / Discover sales`
 * banner with a `<countdown-timer data-expires=…>`). Identified by signature, not by section UUID,
 * so it survives theme re-installs that re-roll section IDs.
 *
 * Scoped to `shopify-section-template--*` blocks that explicitly contain a `<countdown-timer>` with
 * a server-rendered `data-expires=` attribute, so unrelated sections that just happen to mention
 * the word "countdown" elsewhere are left alone.
 *
 * Implementation: locates every `shopify-section-template--*` opening div, treats the next opening
 * div of the same kind as the section boundary, then drops the slice in-place. Walking from the
 * end keeps the original byte offsets valid for earlier sections.
 */
function stripCountdownPromoBanner(html: string): string {
  if (!/<countdown-timer\b/i.test(html)) return html;

  const openRe = /<div\b[^>]*\bid="shopify-section-template[^"]*"[^>]*>/gi;
  const opens: { start: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = openRe.exec(html)) !== null) {
    opens.push({ start: m.index });
  }
  if (opens.length === 0) return html;

  let out = html;
  for (let i = opens.length - 1; i >= 0; i--) {
    const start = opens[i].start;
    const end = i + 1 < opens.length ? opens[i + 1].start : html.length;
    const slice = html.slice(start, end);
    if (/<countdown-timer\b[^>]*\bdata-expires=/i.test(slice)) {
      out = out.slice(0, start) + out.slice(end);
    }
  }
  return out;
}

/**
 * Replaces the packaged Concept theme's default footer payment-icon strip (American Express, Apple Pay,
 * Google Pay, Klarna, Maestro, Mastercard, Shop Pay, Union Pay, Visa) with **Stripe + PayPal** only —
 * the two processors Paper Flight actually ships out of the box.
 *
 * The stock theme renders one `<ul class="payment-icons …">` block in the footer copyright bar; we
 * locate it by class (id-agnostic, so theme re-installs that re-roll section UUIDs still match) and
 * swap the inner `<li>` list. Frame styling (rounded card with subtle dark border) mirrors the other
 * payment SVGs so visual rhythm is preserved.
 *
 * Idempotent: re-running on already-rewritten HTML matches the same `<ul>` and writes the same body.
 */
const STRIPE_PAYMENT_ICON_LI = `<li><svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 38 24" width="38" height="24" aria-labelledby="pi-stripe"><title id="pi-stripe">Stripe</title><path opacity=".07" d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.4 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.4-3-3-3z"></path><path fill="#635BFF" d="M35 1c1.1 0 2 .9 2 2v18c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h32"></path><path fill="#fff" d="M17.4 10.5c0-.6.5-.8 1.3-.8 1.2 0 2.7.4 3.9 1V7c-1.3-.5-2.6-.7-3.9-.7-3.2 0-5.3 1.7-5.3 4.5 0 4.4 6 3.7 6 5.6 0 .7-.6.9-1.5.9-1.3 0-3-.5-4.4-1.3v3.8c1.5.6 3 .9 4.4.9 3.3 0 5.5-1.6 5.5-4.5 0-4.7-6-3.9-6-5.7z"></path></svg></li>`;

const PAYPAL_PAYMENT_ICON_LI = `<li><svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 38 24" width="38" height="24" aria-labelledby="pi-paypal"><title id="pi-paypal">PayPal</title><path opacity=".07" d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.4 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.4-3-3-3z"></path><path fill="#fff" d="M35 1c1.1 0 2 .9 2 2v18c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h32"></path><path fill="#003087" d="M23.9 8.3c.2-1 0-1.7-.6-2.3-.6-.7-1.7-1-3.1-1h-4.1c-.3 0-.5.2-.6.5L14 15.6c0 .2.1.4.3.4H17l.4-3.4 1.8-2.2 4.7-2.1z"></path><path fill="#3086C8" d="M23.9 8.3l-.2.2c-.5 2.8-2.2 3.8-4.6 3.8H18c-.3 0-.5.2-.6.5l-.6 3.9-.2 1c0 .2.1.4.3.4H19c.3 0 .5-.2.5-.4v-.1l.4-2.4v-.1c0-.2.3-.4.5-.4h.3c2.1 0 3.7-.8 4.1-3.2.2-1 .1-1.8-.4-2.4-.1-.5-.3-.7-.5-.8z"></path><path fill="#012169" d="M23.3 8.1c-.1-.1-.2-.1-.3-.1-.1 0-.2 0-.3-.1-.3-.1-.7-.1-1.1-.1h-3c-.1 0-.2 0-.2.1-.2.1-.3.2-.3.4l-.7 4.4v.1c0-.3.3-.5.6-.5h1.3c2.5 0 4.1-1 4.6-3.8v-.2c-.1-.1-.3-.2-.5-.2h-.1z"></path></svg></li>`;

function replacePaymentIconsWithStripeAndPaypal(html: string): string {
  if (!html.includes('class="payment-icons')) return html;
  return html.replace(
    /<ul\s+class="payment-icons[^"]*">[\s\S]*?<\/ul>/g,
    (ul) => {
      const openTagMatch = ul.match(/<ul\s+class="payment-icons[^"]*">/);
      if (!openTagMatch) return ul;
      return `${openTagMatch[0]}${STRIPE_PAYMENT_ICON_LI}${PAYPAL_PAYMENT_ICON_LI}</ul>`;
    },
  );
}

/**
 * Forces the storefront's default country/currency selector to **United States (USD $)**.
 *
 * The packaged Concept theme ships with `country="IN"` baked into:
 *   - the JS bootstrap (`Shopify.country = "IN"`),
 *   - the `<script id="shopify-customer-account-data">` visitor payload (`"country":"IN"`),
 *   - the announcement-bar country picker label + active `<a>` in the country dropdown,
 *   - the hidden `country_code` form input,
 *   - the `<shopify-store … country="IN" …>` element,
 *   - the footer copyright bar's country select (`<option value="IN" selected>`).
 *
 * If any of those still say `IN`, runtime JS reformats the visible label into the visitor's local
 * currency (e.g. `India (INR ₹)`) — so swapping just the label is not enough. This rewrite swaps
 * every signal in one pass so every storefront page renders with US (USD) selected by default.
 *
 * Idempotent: re-running on already-US HTML is a no-op (regexes look for the IN marker, not just any value).
 */
function forceDefaultLocalizationToUsUsd(html: string): string {
  if (!html.includes("India (USD $)") && !html.includes('Shopify.country = "IN"')) {
    return html;
  }
  let out = html;

  /** JS bootstrap (script tag, single line). */
  out = out.replace(/Shopify\.country\s*=\s*"IN"/g, 'Shopify.country = "US"');

  /** Visitor payload inside `<script id="shopify-customer-account-data" type="application/json">…</script>`. */
  out = out.replace(/"visitor":\{"country":"IN","language":"([a-z\-]+)"\}/g, '"visitor":{"country":"US","language":"$1"}');

  /** Announcement-bar country picker button label (mirrors `aria-label="Country/region"` parent). */
  out = out.replace(
    /(<span class="leading-tight">)India \(USD \$\)(<\/span>)/g,
    "$1United States (USD $)$2",
  );

  /**
   * Country dropdown selected state: strip `active pointer-events-none` + `aria-current="true"` from
   * the India `<a>`, then add the same markers to the United States `<a>`. Both anchors live inside
   * the same `<dropdown-localization>` block — one per `<li>`.
   */
  out = out.replace(
    /<a class="reversed-link active pointer-events-none" href="#" aria-current="true" data-value="IN" title="India \(USD \$\)" data-no-instant="">India \(USD \$\)/g,
    '<a class="reversed-link" href="#" data-value="IN" title="India (USD $)" data-no-instant="">India (USD $)',
  );
  out = out.replace(
    /<a class="reversed-link" href="#" data-value="US" title="United States \(USD \$\)" data-no-instant="">United States \(USD \$\)/g,
    '<a class="reversed-link active pointer-events-none" href="#" aria-current="true" data-value="US" title="United States (USD $)" data-no-instant="">United States (USD $)',
  );

  /** Hidden form input that posts the chosen country with the localization form. */
  out = out.replace(/(<input type="hidden" name="country_code" value=")IN(")/g, "$1US$2");

  /** `<shopify-store store-domain="…" country="IN" language="en">` — used by Shop wallet integrations. */
  out = out.replace(/(<shopify-store\b[^>]*\bcountry=")IN(")/g, "$1US$2");

  /**
   * Footer copyright bar's localization select. Concept renders the chosen country as both the
   * `<button>` text label *and* a hidden `<select>`'s selected `<option>`; we must update both so
   * the visible label stays in sync with the form value when JS rehydrates the dropdown.
   */
  out = out.replace(
    /(data-id="FooterLocalizationCountryList"[^>]*><\/api-button>)India \(USD \$\)/g,
    "$1United States (USD $)",
  );
  /** `<option value="IN" selected="">India (USD $)` → unselect it. */
  out = out.replace(/<option value="IN" selected="">India \(USD \$\)/g, '<option value="IN">India (USD $)');
  /** `<option value="US">United States (USD $)` → mark it selected. */
  out = out.replace(
    /<option value="US">United States \(USD \$\)/g,
    '<option value="US" selected="">United States (USD $)',
  );

  return out;
}

/**
 * Root-relative theme links often omit `/shop`; rewrite common storefront paths so navigation stays on the Next app.
 * Preserves full paths (`/collections/all` → `/shop/collections/all`) and fixes `data-link` on mega-menu triggers.
 */
export function rewriteRootShopUrlsInHtml(html: string, options?: StorefrontHtmlUrlRewriteOptions): string {
  const custom = options?.customDomainRoot === true;
  const shopPrefix = custom ? "" : "/shop";
  const searchPath = custom ? "/search" : "/shop/search";
  const homeHref = custom ? "/" : "/shop";
  const contactHref = custom ? "/pages/contact" : "/shop/pages/contact";

  let out = html;
  if (custom) {
    out = stripShopPrefixFromStorefrontPaths(out);
  }
  out = out.replace(/action=(["'])\/search(["'])/gi, `action=$1${searchPath}$2`);
  out = out.replace(/action=(["'])\/shop\/search(["'])/gi, `action=$1${searchPath}$2`);
  out = rewriteRootStorefrontPathsInAttr(out, shopPrefix);
  out = rewriteHeaderLogoLinkToShop(out, homeHref);
  out = rewriteThemeHeaderPlaceholderAnchors(out, contactHref);
  out = stripThemeFeaturesNavItems(out);
  out = stripCompareNavItems(out);
  out = injectEventsNavItem(out);
  out = rewriteShopNavLinkToCollections(out);
  out = bumpScrollingSliderLogoSizes(out);
  out = stripCountdownPromoBanner(out);
  out = forceDefaultLocalizationToUsUsd(out);
  out = replacePaymentIconsWithStripeAndPaypal(out);
  return out;
}

/**
 * Removes Concept-packaged “Compare” / “Theme features” links again after HTML merges
 * (e.g. theme customizer `applyContentOverrides` can splice full header markup from the original theme).
 * Also re-injects the Paper Flight **Events** nav link, since customizer merges can splice the
 * stock header back in (which doesn't include our custom link).
 */
export function stripPaperFlightUnsupportedConceptNav(html: string): string {
  let out = stripThemeFeaturesNavItems(html);
  out = stripCompareNavItems(out);
  out = injectEventsNavItem(out);
  out = rewriteShopNavLinkToCollections(out);
  out = bumpScrollingSliderLogoSizes(out);
  out = stripCountdownPromoBanner(out);
  return out;
}
