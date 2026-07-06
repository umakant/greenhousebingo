import type { PublicStorefrontBrandSettings } from "@/lib/storefront/public-storefront-settings";
import { rewriteStorefrontLocalizationCurrencyDisplay } from "@/lib/storefront/storefront-localization-currency-rewrite";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function replaceOrInjectFavicon(html: string, href: string): string {
  const safe = escapeAttr(href);
  const linkRe = /<link\b[^>]*\brel\s*=\s*["'](?:shortcut icon|icon)["'][^>]*>/gi;
  let replacedFirst = false;
  let out = html.replace(linkRe, (tag) => {
    if (replacedFirst) return tag;
    replacedFirst = true;
    if (/\bhref\s*=/i.test(tag)) {
      return tag.replace(/\bhref\s*=\s*["'][^"']*["']/i, `href="${safe}"`);
    }
    return tag.replace(/>$/, ` href="${safe}">`);
  });
  if (!replacedFirst) {
    out = out.replace(/<\/head>/i, `  <link rel="icon" href="${safe}" />\n</head>`);
  }
  return out;
}

/** White-label platform attribution shown in the storefront footer credit line. */
const STOREFRONT_PLATFORM_ATTRIBUTION = "WaterIceExpress";

/**
 * Rewrites the theme's baked-in footer credit (`© YYYY Concept Theme Tech. powerd by PaperFlight`)
 * to the merchant store name + the white-label platform name.
 */
function rewriteStorefrontFooterAttribution(html: string, storeName: string): string {
  let out = html;
  if (storeName) {
    out = out.replace(/Concept Theme Tech/gi, escapeHtml(storeName));
  }
  out = out.replace(
    /power(?:e)?d[\s\u00a0]+by[\s\u00a0]+(?:PaperFlight|Shopify)/gi,
    `powerd by ${STOREFRONT_PLATFORM_ATTRIBUTION}`,
  );
  return out;
}

/**
 * Applies merchant “Site identity” settings to Concept-style static HTML (header logo block + favicon).
 * Safe to call on unknown markup — only edits recognized patterns.
 */
export function applyStorefrontBrandIdentityToHtml(html: string, pub: PublicStorefrontBrandSettings): string {
  const title = pub.storeName?.trim() ?? "";
  const tagline = pub.siteTagline?.trim() ?? "";
  const logoUrl = pub.logoUrl?.trim() ?? "";
  const faviconUrl = pub.faviconUrl?.trim() ?? "";
  const showText = pub.displaySiteTitleTagline !== false;

  let out = html;

  out = rewriteStorefrontFooterAttribution(out, title);

  if (faviconUrl) {
    out = replaceOrInjectFavicon(out, faviconUrl);
  }

  const headerBlock =
    /(<h1\b[^>]*\bheader__logo\b[^>]*>)([\s\S]*?)(<\/h1>)/i;
  const match = out.match(headerBlock);
  if (match) {
  const open = match[1]!;
  let inner = match[2]!;
  const close = match[3]!;

  if (logoUrl) {
    const safeSrc = escapeAttr(logoUrl);
    inner = inner.replace(/<img\b([^>]*)>/gi, (full, attrs: string) => {
      const next = /\bsrc\s*=/i.test(attrs)
        ? attrs.replace(/\bsrc\s*=\s*["'][^"']*["']/i, `src="${safeSrc}"`)
        : `${attrs} src="${safeSrc}"`;
      return `<img${next}>`;
    });
  }

  if (title) {
    inner = inner.replace(/(<span\b[^>]*\bsr-only\b[^>]*>)([\s\S]*?)(<\/span>)/i, `$1${escapeHtml(title)}$3`);

    let imgIdx = 0;
    inner = inner.replace(/<img\b([^>]*)>/gi, (full, attrs: string) => {
      imgIdx += 1;
      const hide = /\baria-hidden\s*=\s*["']true["']/i.test(attrs);
      if (hide || imgIdx !== 1) return full;
      if (!/\balt\s*=/i.test(attrs)) return full;
      return `<img${attrs.replace(/\balt\s*=\s*["'][^"']*["']/i, `alt="${escapeHtml(title)}"`)}>`;
    });
  }

  if (showText && (title || tagline)) {
    const parts: string[] = [];
    if (title) {
      parts.push(
        `<span class="pf-site-identity-title text-base font-semibold leading-tight truncate">${escapeHtml(title)}</span>`,
      );
    }
    if (tagline) {
      parts.push(
        `<span class="pf-site-identity-tagline text-sm opacity-80 truncate">${escapeHtml(tagline)}</span>`,
      );
    }
    const inject = `<span class="pf-site-identity-text ml-3 flex flex-col justify-center min-w-0 max-w-[min(280px,40vw)]">${parts.join("")}</span>`;
    const lastA = inner.lastIndexOf("</a>");
    if (lastA !== -1) {
      inner = inner.slice(0, lastA) + inject + inner.slice(lastA);
    }
  }

  out = out.replace(headerBlock, `${open}${inner}${close}`);
  }

  const iso = pub.catalogCurrencyCode?.trim().toUpperCase();
  return rewriteStorefrontLocalizationCurrencyDisplay(out, {
    storePricingCurrency: /^[A-Z]{3}$/.test(iso ?? "") ? iso : undefined,
  });
}
