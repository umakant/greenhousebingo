import "server-only";

/**
 * Shared Water Ice Express checkout pricing. Both the PaymentIntent route
 * (`/api/waterice/checkout`) and the order-completion route
 * (`/api/waterice/checkout/order`) use these helpers so the amount we charge,
 * the amount we verify against Stripe, and the amount we persist on the order
 * always match what the buyer saw on the client Price Summary.
 */

export const PRINT_FORMAT = "Print +$10";

type IncomingItem = {
  title?: unknown;
  price?: unknown;
  qty?: unknown;
  format?: unknown;
};

export type CleanItem = { title: string; price: number; qty: number; format: string };

export function sanitizeItems(raw: unknown): CleanItem[] {
  if (!Array.isArray(raw)) return [];
  const out: CleanItem[] = [];
  for (const it of raw as IncomingItem[]) {
    if (!it || typeof it !== "object") continue;
    const title = typeof it.title === "string" ? it.title.trim() : "";
    const price = Number(it.price);
    const qty = Math.max(1, Math.floor(Number(it.qty ?? 1)) || 1);
    const format = typeof it.format === "string" ? it.format : "";
    if (!title || !Number.isFinite(price) || price < 0) continue;
    out.push({ title, price, qty, format });
  }
  return out;
}

export type CheckoutTotals = {
  subtotal: number;
  shipping: number;
  discount: number;
  tax: number;
  total: number;
};

/** Mirror of the client-side Price Summary math. */
export function computeTotal(items: CleanItem[], promoApplied: boolean): CheckoutTotals {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const hasPrint = items.some((i) => i.format === PRINT_FORMAT);
  const shipping = hasPrint ? 5.99 : 0;
  const discount = promoApplied ? +(subtotal * 0.1).toFixed(2) : 0;
  const tax = +((subtotal - discount + shipping) * 0.06).toFixed(2);
  const total = +(subtotal - discount + shipping + tax).toFixed(2);
  return { subtotal, shipping, discount, tax, total };
}
