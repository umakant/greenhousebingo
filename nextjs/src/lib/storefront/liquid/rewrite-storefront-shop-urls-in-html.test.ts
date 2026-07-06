import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { rewriteRootShopUrlsInHtml } from "@/lib/storefront/liquid/rewrite-storefront-shop-urls-in-html";

const SAMPLE_INDEX = path.join(process.cwd(), "storage/storefront-liquid-themes/1000/w-1/index.html");

/** Mirrors `EVENTS_DRAWER_NAV_LI` in the rewriter — kept inline so the test file stays self-contained. */
const EVENTS_DRAWER_LI_LITERAL =
  '<li class="drawer__menu-group">' +
  '<a class="drawer__menu-item block heading text-2xl leading-none tracking-tight" href="/events">Events</a>' +
  '</li>';

describe("rewriteRootShopUrlsInHtml — Shop nav → /collections", () => {
  const shopSummary =
    '<summary data-link="/collections/all" class="z-2 relative rounded-full" aria-haspopup="true" aria-expanded="false" aria-label="Shop"><span class="btn-text">Shop</span></summary>';

  it("retargets the Shop summary data-link to /shop/collections on the app host", () => {
    const out = rewriteRootShopUrlsInHtml(shopSummary);
    expect(out).toContain('data-link="/shop/collections"');
    expect(out).not.toContain("/collections/all");
  });

  it("retargets the Shop summary data-link to /collections on a custom domain", () => {
    const out = rewriteRootShopUrlsInHtml(shopSummary, { customDomainRoot: true });
    expect(out).toContain('data-link="/collections"');
    expect(out).not.toContain("/collections/all");
  });

  it("leaves other /collections/all links (e.g. View all products) untouched", () => {
    const html = `${shopSummary}<a class="mega-menu__link" data-link="/collections/all">View All Products</a>`;
    const out = rewriteRootShopUrlsInHtml(html, { customDomainRoot: true });
    /** Shop summary retargeted, but the standalone catalog link keeps /collections/all. */
    expect(out).toContain('aria-label="Shop"');
    expect(out).toContain('<a class="mega-menu__link" data-link="/collections/all">View All Products</a>');
  });

  it("is idempotent on the Shop nav rewrite", () => {
    const once = rewriteRootShopUrlsInHtml(shopSummary, { customDomainRoot: true });
    const twice = rewriteRootShopUrlsInHtml(once, { customDomainRoot: true });
    expect(twice).toBe(once);
  });
});

describe("rewriteRootShopUrlsInHtml — default localization → US (USD $)", () => {
  it("forces every IN signal to US in the packaged Concept index", () => {
    if (!fs.existsSync(SAMPLE_INDEX)) return;
    const html = fs.readFileSync(SAMPLE_INDEX, "utf8");

    expect(html).toContain('Shopify.country = "IN"');
    expect(html).toContain('"visitor":{"country":"IN"');
    expect(html).toContain('<span class="leading-tight">India (USD $)</span>');
    expect(html).toContain('aria-current="true" data-value="IN"');
    expect(html).toContain('<input type="hidden" name="country_code" value="IN">');
    expect(html).toContain('country="IN"');

    const out = rewriteRootShopUrlsInHtml(html);

    expect(out).toContain('Shopify.country = "US"');
    expect(out).toContain('"visitor":{"country":"US"');
    expect(out).toContain('<span class="leading-tight">United States (USD $)</span>');
    expect(out).toContain('aria-current="true" data-value="US" title="United States (USD $)"');
    expect(out).toContain('<input type="hidden" name="country_code" value="US">');
    expect(out).toContain('<shopify-store store-domain="" country="US"');

    /** India entry stays in the dropdown but loses its `aria-current` / pointer-events lock. */
    expect(out).toContain('<a class="reversed-link" href="#" data-value="IN" title="India (USD $)"');
    expect(out).not.toContain('aria-current="true" data-value="IN"');

    /** Footer copyright bar's localization select. */
    expect(out).toContain('<option value="US" selected="">United States (USD $)');
    expect(out).toContain('<option value="IN">India (USD $)');
    expect(out).not.toContain('<option value="IN" selected="">India (USD $)');
  });

  it("is a no-op on already-US HTML (idempotent)", () => {
    if (!fs.existsSync(SAMPLE_INDEX)) return;
    const html = fs.readFileSync(SAMPLE_INDEX, "utf8");
    const once = rewriteRootShopUrlsInHtml(html);
    const twice = rewriteRootShopUrlsInHtml(once);
    expect(twice).toBe(once);
  });
});

describe("rewriteRootShopUrlsInHtml — payment icons → Stripe + PayPal only", () => {
  it("removes the 9 stock payment brands and inserts only Stripe and PayPal", () => {
    if (!fs.existsSync(SAMPLE_INDEX)) return;
    const html = fs.readFileSync(SAMPLE_INDEX, "utf8");

    expect(html).toContain(">American Express<");
    expect(html).toContain(">Apple Pay<");
    expect(html).toContain(">Google Pay<");
    expect(html).toContain(">Klarna<");
    expect(html).toContain(">Maestro<");
    expect(html).toContain(">Mastercard<");
    expect(html).toContain(">Shop Pay<");
    expect(html).toContain(">Union Pay<");
    expect(html).toContain(">Visa<");

    const out = rewriteRootShopUrlsInHtml(html);

    /** Slice out just the payment-icons UL so unrelated occurrences (e.g. "Visa" in copy) cannot leak in. */
    const ulStart = out.indexOf('<ul class="payment-icons');
    expect(ulStart).toBeGreaterThan(0);
    const ulEnd = out.indexOf("</ul>", ulStart) + "</ul>".length;
    const ul = out.slice(ulStart, ulEnd);

    expect(ul).toContain(">Stripe<");
    expect(ul).toContain(">PayPal<");
    expect(ul).not.toContain(">American Express<");
    expect(ul).not.toContain(">Apple Pay<");
    expect(ul).not.toContain(">Google Pay<");
    expect(ul).not.toContain(">Klarna<");
    expect(ul).not.toContain(">Maestro<");
    expect(ul).not.toContain(">Mastercard<");
    expect(ul).not.toContain(">Shop Pay<");
    expect(ul).not.toContain(">Union Pay<");
    expect(ul).not.toContain(">Visa<");

    /** Exactly two `<li>` entries — Stripe then PayPal. */
    const liMatches = ul.match(/<li>/g) ?? [];
    expect(liMatches.length).toBe(2);
  });

  it("payment-icon swap is idempotent", () => {
    if (!fs.existsSync(SAMPLE_INDEX)) return;
    const html = fs.readFileSync(SAMPLE_INDEX, "utf8");
    const once = rewriteRootShopUrlsInHtml(html);
    const twice = rewriteRootShopUrlsInHtml(once);
    expect(twice).toBe(once);
  });
});

describe("rewriteRootShopUrlsInHtml — Events nav link", () => {
  it("injects an Events <li> immediately after Contact in the desktop nav", () => {
    if (!fs.existsSync(SAMPLE_INDEX)) return;
    const html = fs.readFileSync(SAMPLE_INDEX, "utf8");

    /** Sanity: the bundled theme has no Events link out of the box. */
    expect(html).not.toContain('aria-label="Events"');

    const out = rewriteRootShopUrlsInHtml(html);

    expect(out).toContain('aria-label="Events"');
    expect(out).toContain('href="/events"');

    /**
     * Events <li> sits directly after the Contact <li> (no other <li> between them) — verify by
     * isolating each Contact <li> closing tag and checking the next non-whitespace token is our
     * Events anchor. Multiple matches are expected: primary nav + sticky-header clone.
     */
    const contactCloseRe = /aria-label="Contact"[\s\S]*?<\/a>\s*<\/li>(\s*<li[^>]*>\s*<a[^>]*aria-label="([^"]+)")/g;
    const followLabels: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = contactCloseRe.exec(out)) !== null) {
      followLabels.push(m[2]);
    }
    expect(followLabels.length).toBeGreaterThan(0);
    for (const label of followLabels) {
      expect(label).toBe("Events");
    }
  });

  it("appends an Events <li> at the end of the mobile drawer menu <ul>", () => {
    if (!fs.existsSync(SAMPLE_INDEX)) return;
    const html = fs.readFileSync(SAMPLE_INDEX, "utf8");

    const out = rewriteRootShopUrlsInHtml(html);

    /** Drawer Events <li> uses the same `drawer__menu-item` class shape as the other text links. */
    expect(out).toMatch(/<li class="drawer__menu-group"><a class="drawer__menu-item[^"]*" href="\/events">Events<\/a><\/li>/);

    /**
     * Events should be the *last* child of the drawer menu `<ul>` — i.e. its `<li>` immediately
     * precedes the `</ul>`. We isolate just that `<ul>` and check the closing slice.
     */
    const ulOpenIdx = out.indexOf('<ul class="drawer__scrollable drawer__menu');
    expect(ulOpenIdx).toBeGreaterThan(0);
    const ulCloseIdx = out.indexOf("</ul>", ulOpenIdx);
    expect(ulCloseIdx).toBeGreaterThan(ulOpenIdx);
    const tail = out.slice(ulCloseIdx - EVENTS_DRAWER_LI_LITERAL.length, ulCloseIdx);
    expect(tail).toBe(EVENTS_DRAWER_LI_LITERAL);
  });

  it("does not duplicate the Events nav link on a second pass (idempotent)", () => {
    if (!fs.existsSync(SAMPLE_INDEX)) return;
    const html = fs.readFileSync(SAMPLE_INDEX, "utf8");
    const once = rewriteRootShopUrlsInHtml(html);
    const twice = rewriteRootShopUrlsInHtml(once);

    expect(twice).toBe(once);

    /**
     * Bundled `index.html` has one Contact in the desktop nav (no sticky-header clone in this
     * snapshot) and one in the drawer — so we should see exactly one Events anchor in each.
     */
    const desktopEventsCount = (twice.match(/aria-label="Events"/g) ?? []).length;
    expect(desktopEventsCount).toBe(1);

    const drawerEventsCount = (twice.match(/<li class="drawer__menu-group"><a class="drawer__menu-item[^"]*"[^>]*>Events<\/a><\/li>/g) ?? []).length;
    expect(drawerEventsCount).toBe(1);
  });
});
