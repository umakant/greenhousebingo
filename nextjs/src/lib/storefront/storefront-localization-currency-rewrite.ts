import "server-only";

import primaryByCountry from "@/lib/storefront/data/country-primary-currency.json";

/** ISO 3166-1 alpha-2 codes used in Shopify theme exports but missing from REST Countries. */
const EXTRA_PRIMARY_CURRENCY: Record<string, string> = {
  AC: "SHP",
  TA: "USD",
  XK: "EUR",
};

const baseMap = primaryByCountry as Record<string, string>;

function primaryCurrencyForCountry(alpha2: string): string {
  const cc = alpha2.toUpperCase();
  return EXTRA_PRIMARY_CURRENCY[cc] ?? baseMap[cc] ?? "USD";
}

const suffixCache = new Map<string, string>();

/** Theme copy looks like `(USD $)` or `(EUR €)` — ISO code plus narrowSymbol. */
export function shopifyStyleCurrencySuffix(iso4217: string): string {
  const cur = iso4217.toUpperCase();
  if (!suffixCache.has(cur)) {
    try {
      const parts = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: cur,
        currencyDisplay: "narrowSymbol",
      }).formatToParts(1);
      const sym = parts.find((p) => p.type === "currency")?.value ?? cur;
      suffixCache.set(cur, `(${cur} ${sym})`.replace(/\s+/g, " ").trim());
    } catch {
      suffixCache.set(cur, `(${cur})`);
    }
  }
  return suffixCache.get(cur)!;
}

function suffixForCountryCode(alpha2: string): string {
  return shopifyStyleCurrencySuffix(primaryCurrencyForCountry(alpha2));
}

function countryCodeFromFormBlock(formHtml: string): string | null {
  const m1 = formHtml.match(/name=["']country_code["'][^>]*value=["']([A-Z]{2})["']/i);
  if (m1) return m1[1] ?? null;
  const m2 = formHtml.match(/value=["']([A-Z]{2})["'][^>]*name=["']country_code["']/i);
  if (m2) return m2[1] ?? null;
  const m3 = formHtml.match(/<option value="([A-Z]{2})"[^>]*\bselected\b/i);
  if (m3) return m3[1] ?? null;
  return null;
}

function replaceCountryOptions(html: string): string {
  return html.replace(/<option value="([A-Z]{2})">([\s\S]*?) \(USD \$\)/gi, (_full, cc: string, nameInner: string) => {
    const name = String(nameInner).replace(/\s+/g, " ").trim();
    return `<option value="${cc}">${name} ${suffixForCountryCode(cc)}`;
  });
}

function replaceCountryListLinks(html: string): string {
  return html.replace(
    /<a class="reversed-link" href="#" data-value="([A-Z]{2})" title="([^"]*?) \(USD \$\)"([^>]*?)>([\s\S]*?) \(USD \$\)/gi,
    (_full, cc: string, titleName: string, mid: string, body: string) => {
      const suf = suffixForCountryCode(cc);
      const bodyTrim = String(body).replace(/\s+/g, " ").trim();
      return `<a class="reversed-link" href="#" data-value="${cc}" title="${titleName} ${suf}"${mid}>${bodyTrim} ${suf}`;
    },
  );
}

function replaceAnnouncementCountryLabel(html: string): string {
  const formRe = /<form[^>]*\bid=["']announcement_localization_country_form["'][^>]*>([\s\S]*?)<\/form>/i;
  const fm = html.match(formRe);
  const cc = fm ? countryCodeFromFormBlock(fm[0]) : html.match(/Shopify\.country\s*=\s*["']([A-Z]{2})["']/i)?.[1];
  if (!cc) return html;
  let label: string;
  try {
    label = new Intl.DisplayNames(["en"], { type: "region" }).of(cc) ?? cc;
  } catch {
    label = cc;
  }
  const suf = suffixForCountryCode(cc);
  return html.replace(
    /<span class="leading-tight">\s*[^<]+?\s*\(USD \$\)\s*<\/span>/i,
    `<span class="leading-tight">${label} ${suf}</span>`,
  );
}

function replaceFooterCountryButton(html: string): string {
  const formRe = /<form[^>]*\bid=["']footer_localization_country_form["'][^>]*>([\s\S]*?)<\/form>/i;
  const fm = html.match(formRe);
  if (!fm) return html;
  const cc = countryCodeFromFormBlock(fm[0]);
  if (!cc) return html;
  let label: string;
  try {
    label = new Intl.DisplayNames(["en"], { type: "region" }).of(cc) ?? cc;
  } catch {
    label = cc;
  }
  const suf = suffixForCountryCode(cc);
  return html.replace(
    /(<form[^>]*\bid=["']footer_localization_country_form["'][^>]*>[\s\S]*?<\/api-button>)\s*[^<\(]+? \(USD \$\)/i,
    `$1${label} ${suf}`,
  );
}

function syncShopifyCurrencyActive(html: string, storeCurrency: string | undefined): string {
  const c = storeCurrency?.trim().toUpperCase();
  if (!c || !/^[A-Z]{3}$/.test(c)) return html;
  return html.replace(
    /Shopify\.currency\s*=\s*\{[^}]*"active"\s*:\s*"[^"]*"[^}]*\}/,
    `Shopify.currency={"active":"${c}","rate":"1.0"}`,
  );
}

/**
 * Fixes Concept / OS2 static exports where every country label used `(USD $)`.
 * Re-labels `<option>` and localization `<a>` rows using each region’s primary ISO 4217 currency.
 */
export function rewriteStorefrontLocalizationCurrencyDisplay(
  html: string,
  opts?: { storePricingCurrency?: string },
): string {
  let out = html;
  if (out.includes("(USD $)")) {
    out = replaceCountryOptions(out);
    out = replaceCountryListLinks(out);
    out = replaceAnnouncementCountryLabel(out);
    out = replaceFooterCountryButton(out);
  }
  const iso = opts?.storePricingCurrency?.trim().toUpperCase();
  if (iso && /^[A-Z]{3}$/.test(iso)) {
    out = syncShopifyCurrencyActive(out, iso);
  }
  return out;
}
