/** Flat storefront shipping options (Day 27) — server is authoritative. */
export const STOREFRONT_SHIPPING_FLAT_USD: Record<string, number> = {
  pickup: 0,
  standard: 5,
  express: 15,
};

export function shippingAmountForMethod(key: string | null | undefined): number {
  const k = (key ?? "standard").trim();
  return STOREFRONT_SHIPPING_FLAT_USD[k] ?? STOREFRONT_SHIPPING_FLAT_USD.standard ?? 5;
}
