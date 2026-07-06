"use client";

import * as React from "react";

export type CartProduct = {
  id: string;
  name: string;
  price: number;
  currency: string;
  image: string | null;
  bucketCountValue: number;
};

export type CartLine = { product: CartProduct; quantity: number };
export type CartState = {
  vendorId: string | null;
  vendorSlug: string | null;
  vendorName: string | null;
  lines: Record<string, CartLine>;
};

const EMPTY: CartState = { vendorId: null, vendorSlug: null, vendorName: null, lines: {} };

function storageKey(companySlug: string): string {
  return `mp_cart_${companySlug}`;
}

function read(companySlug: string): CartState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.sessionStorage.getItem(storageKey(companySlug));
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as CartState;
    if (!parsed || typeof parsed !== "object" || !parsed.lines) return EMPTY;
    return parsed;
  } catch {
    return EMPTY;
  }
}

const CART_EVENT = "mp-cart-changed";

function write(companySlug: string, state: CartState) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(storageKey(companySlug), JSON.stringify(state));
  window.dispatchEvent(new CustomEvent(CART_EVENT, { detail: { companySlug } }));
}

/**
 * Single-vendor sessionStorage cart scoped per company. Adding a product from a
 * different vendor replaces the cart (delivery queues are per vendor + city).
 */
export function useCart(companySlug: string) {
  const [state, setState] = React.useState<CartState>(EMPTY);

  React.useEffect(() => {
    setState(read(companySlug));
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as { companySlug?: string } | undefined;
      if (!detail || detail.companySlug === companySlug) setState(read(companySlug));
    };
    window.addEventListener(CART_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(CART_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [companySlug]);

  const persist = React.useCallback(
    (next: CartState) => {
      write(companySlug, next);
      setState(next);
    },
    [companySlug],
  );

  const addItem = React.useCallback(
    (
      product: CartProduct,
      vendor: { id: string; slug: string; name: string | null },
      quantity = 1,
    ) => {
      const current = read(companySlug);
      // Switching vendors clears the previous cart.
      const base: CartState =
        current.vendorId && current.vendorId !== vendor.id
          ? { vendorId: vendor.id, vendorSlug: vendor.slug, vendorName: vendor.name, lines: {} }
          : {
              vendorId: vendor.id,
              vendorSlug: vendor.slug,
              vendorName: vendor.name,
              lines: { ...current.lines },
            };
      const existing = base.lines[product.id];
      const qty = Math.max(1, (existing?.quantity ?? 0) + quantity);
      base.lines[product.id] = { product, quantity: qty };
      persist(base);
    },
    [companySlug, persist],
  );

  const setQuantity = React.useCallback(
    (productId: string, quantity: number) => {
      const current = read(companySlug);
      const lines = { ...current.lines };
      if (quantity <= 0) {
        delete lines[productId];
      } else if (lines[productId]) {
        lines[productId] = { ...lines[productId], quantity: Math.floor(quantity) };
      }
      const next: CartState = { ...current, lines };
      if (Object.keys(lines).length === 0) {
        next.vendorId = null;
        next.vendorSlug = null;
        next.vendorName = null;
      }
      persist(next);
    },
    [companySlug, persist],
  );

  const clear = React.useCallback(() => persist(EMPTY), [persist]);

  const lines = React.useMemo(() => Object.values(state.lines), [state.lines]);
  const itemCount = React.useMemo(() => lines.reduce((n, l) => n + l.quantity, 0), [lines]);
  const bucketCount = React.useMemo(
    () => lines.reduce((n, l) => n + (l.product.bucketCountValue || 0) * l.quantity, 0),
    [lines],
  );
  const subtotal = React.useMemo(
    () => lines.reduce((n, l) => n + l.product.price * l.quantity, 0),
    [lines],
  );

  return { state, lines, itemCount, bucketCount, subtotal, addItem, setQuantity, clear };
}
