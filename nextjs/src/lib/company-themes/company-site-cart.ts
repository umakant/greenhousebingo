export type CompanySiteCartLine = {
  id: string;
  type: "course" | "workshop";
  slug: string;
  title: string;
  price: number;
  currency: "USD";
  path: string;
  quantity: number;
};

export type CompanySiteCart = {
  lines: CompanySiteCartLine[];
};

export const COMPANY_SITE_CART_STORAGE_VERSION = "v1";

export function companySiteCartStorageKey(companySlug: string): string {
  return `company_site_cart_${COMPANY_SITE_CART_STORAGE_VERSION}_${companySlug}`;
}

export function emptyCompanySiteCart(): CompanySiteCart {
  return { lines: [] };
}

export function readCompanySiteCart(companySlug: string): CompanySiteCart {
  if (typeof window === "undefined") return emptyCompanySiteCart();
  try {
    const raw = window.localStorage.getItem(companySiteCartStorageKey(companySlug));
    if (!raw) return emptyCompanySiteCart();
    const parsed = JSON.parse(raw) as CompanySiteCart;
    if (!parsed || !Array.isArray(parsed.lines)) return emptyCompanySiteCart();
    return parsed;
  } catch {
    return emptyCompanySiteCart();
  }
}

export function writeCompanySiteCart(companySlug: string, cart: CompanySiteCart): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(companySiteCartStorageKey(companySlug), JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent("company-site-cart-changed", { detail: { companySlug } }));
}

export function cartLineCount(cart: CompanySiteCart): number {
  return cart.lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function cartSubtotal(cart: CompanySiteCart): number {
  return cart.lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
}

export function addCompanySiteCartLine(
  companySlug: string,
  item: Omit<CompanySiteCartLine, "quantity">,
  quantity = 1,
): CompanySiteCart {
  const cart = readCompanySiteCart(companySlug);
  const existing = cart.lines.find((line) => line.id === item.id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.lines.push({ ...item, quantity });
  }
  writeCompanySiteCart(companySlug, cart);
  return cart;
}

export function clearCompanySiteCart(companySlug: string): void {
  writeCompanySiteCart(companySlug, emptyCompanySiteCart());
}
