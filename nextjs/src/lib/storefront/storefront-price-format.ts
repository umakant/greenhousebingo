/**
 * Catalog prices are stored in one ISO currency per company (`defaultCurrency` in settings).
 * Theme “country/currency” pickers are cosmetic off Shopify — we align Liquid + React formatting to this code.
 */
export function resolveStorefrontCatalogCurrencyCode(raw: Record<string, string>): string {
  const dc = (raw.defaultCurrency ?? "").trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(dc)) return dc;
  return "USD";
}

function intlCurrencyDisplay(
  display: string,
): NonNullable<Intl.NumberFormatOptions["currencyDisplay"]> {
  const d = display.trim().toLowerCase();
  if (d === "code") return "code";
  if (d === "narrow") return "narrowSymbol";
  return "symbol";
}

export function formatStorefrontCatalogMoney(
  amount: number,
  currencyCode: string,
  currencyDisplayPref: string,
): string {
  const cur = (currencyCode ?? "USD").trim().toUpperCase() || "USD";
  const safe = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: cur,
      currencyDisplay: intlCurrencyDisplay(currencyDisplayPref),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safe);
  } catch {
    return `${cur} ${safe.toFixed(2)}`;
  }
}
