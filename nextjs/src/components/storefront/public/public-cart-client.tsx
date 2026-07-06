"use client";

import type { CSSProperties } from "react";
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PublicStorefrontBrandSettings } from "@/lib/storefront/public-storefront-settings";
import { cn } from "@/lib/utils";

import { PublishedPageChrome } from "@/components/storefront/public/published-page-view";
import { PF_STOREFRONT_CART_SYNC_EVENT } from "@/components/storefront/public/storefront-liquid-cart-sync";

type Line = {
  id: string;
  quantity: number;
  unitPrice: number;
  product: { id: string; name: string; slug: string | null; image: string | null } | null;
};

type Props = {
  publicSettings: PublicStorefrontBrandSettings;
  websiteId: string;
  style?: CSSProperties;
  /** When true, skip `PublishedPageChrome` — content mounts inside Liquid theme `#pf-react-main-slot`. */
  themeChrome?: boolean;
};

export function PublicCartClient({ publicSettings, websiteId, style, themeChrome }: Props) {
  const [lines, setLines] = React.useState<Line[]>([]);
  const [subtotal, setSubtotal] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/storefront/public/cart", { credentials: "include" });
      const data = (await res.json()) as { ok?: boolean; cart?: { lines: Line[]; subtotal?: number } };
      if (data?.ok && data.cart) {
        setLines(data.cart.lines);
        setSubtotal(typeof data.cart.subtotal === "number" ? data.cart.subtotal : null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    const onRefresh = () => {
      void load();
    };
    window.addEventListener("cart:refresh", onRefresh);
    window.addEventListener(PF_STOREFRONT_CART_SYNC_EVENT, onRefresh);
    return () => {
      window.removeEventListener("cart:refresh", onRefresh);
      window.removeEventListener(PF_STOREFRONT_CART_SYNC_EVENT, onRefresh);
    };
  }, [load]);

  const updateQty = async (lineId: string, quantity: number) => {
    await fetch("/api/storefront/public/cart", {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lineId, quantity }),
    });
    void load();
  };

  const removeLine = async (lineId: string) => {
    await fetch("/api/storefront/public/cart", {
      method: "DELETE",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lineId }),
    });
    void load();
  };

  const computedSubtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const displaySubtotal = subtotal != null ? subtotal : computedSubtotal;
  const totalUnits = lines.reduce((s, l) => s + l.quantity, 0);

  const tc = Boolean(themeChrome);

  const inner = (
    <main
      className={cn(
        "pf-storefront-cart-root mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12",
        !tc && "flex-1",
      )}
      {...(tc && style ? { style } : {})}
    >
      {loading ? (
        <div className="space-y-8 animate-pulse" aria-busy="true" aria-label="Loading cart">
          <div className="space-y-2">
            <div className="h-9 w-52 rounded-md bg-muted" />
            <div className="h-4 w-36 rounded bg-muted" />
          </div>
          <div className="pf-storefront-cart-layout grid gap-8">
            <div className="h-72 rounded-xl bg-muted sm:h-80" />
            <div className="h-56 rounded-xl bg-muted lg:h-64" />
          </div>
        </div>
      ) : lines.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-border/80 bg-card px-8 py-14 text-center shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <ShoppingBag className="h-7 w-7" aria-hidden />
          </div>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">Your cart is empty</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            When you add products, they will appear here. Browse the shop to get started.
          </p>
          <Button asChild className="mt-8 min-w-[200px]" size="lg">
            <Link href="/shop">Continue shopping</Link>
          </Button>
        </div>
      ) : (
        <div className="pf-storefront-cart-layout grid gap-8 lg:gap-10">
          <div className="min-w-0 space-y-6">
            <header className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Shopping cart</h1>
              <p className="text-sm text-muted-foreground">
                {totalUnits === 1 ? "1 item" : `${totalUnits} items`} · Review your order before checkout
              </p>
            </header>

            <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
              <ul className="divide-y divide-border/70">
                {lines.map((l) => {
                  const lineTotal = l.quantity * l.unitPrice;
                  return (
                    <li
                      key={l.id}
                      className="pf-storefront-cart-line flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5"
                    >
                      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted sm:h-[5.5rem] sm:w-[5.5rem]">
                        {l.product?.image ? (
                          <Image src={l.product.image} alt="" fill className="object-cover" unoptimized />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                            No image
                          </div>
                        )}
                      </div>

                      <div className="pf-storefront-cart-line__meta min-w-0 flex-1 space-y-1">
                        <p className="font-medium leading-snug text-foreground">{l.product?.name ?? "Item"}</p>
                        <p className="text-sm tabular-nums text-muted-foreground">${l.unitPrice.toFixed(2)} each</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 sm:shrink-0 sm:justify-end">
                        <div className="inline-flex h-10 items-stretch overflow-hidden rounded-md border border-input bg-background shadow-sm">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 shrink-0 rounded-none border-0 hover:bg-muted"
                            aria-label="Decrease quantity"
                            disabled={l.quantity <= 1}
                            onClick={() => void updateQty(l.id, Math.max(1, l.quantity - 1))}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="flex min-w-[2.75rem] items-center justify-center border-x border-input px-2 text-sm font-medium tabular-nums">
                            {l.quantity}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 shrink-0 rounded-none border-0 hover:bg-muted"
                            aria-label="Increase quantity"
                            onClick={() => void updateQty(l.id, l.quantity + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        <p className="min-w-[5rem] text-right text-base font-semibold tabular-nums text-foreground sm:min-w-[6rem]">
                          ${lineTotal.toFixed(2)}
                        </p>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 gap-1.5 text-muted-foreground hover:text-destructive"
                          onClick={() => void removeLine(l.id)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                          Remove
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <p className="text-xs text-muted-foreground">
              Need help? You can adjust quantities above or remove items before checkout.
            </p>
          </div>

          <aside className="pf-storefront-cart-summary h-fit space-y-5 rounded-xl border border-border/80 bg-card p-6 shadow-sm lg:p-7">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Order summary</h2>
            <div className="flex items-baseline justify-between gap-4 border-b border-border/70 pb-4">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="text-xl font-semibold tabular-nums text-foreground">${displaySubtotal.toFixed(2)}</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Taxes, discounts, and shipping are finalized at checkout.
            </p>
            <div className="space-y-3 pt-1">
              <Button asChild className="h-11 w-full text-base font-semibold shadow-sm" size="lg">
                <Link href="/shop/checkout">Proceed to checkout</Link>
              </Button>
              <Button asChild variant="outline" className="w-full border-border/80">
                <Link href="/shop">Continue shopping</Link>
              </Button>
            </div>
          </aside>
        </div>
      )}
    </main>
  );

  if (themeChrome) {
    return inner;
  }

  return (
    <PublishedPageChrome publicSettings={publicSettings} title="Cart" websiteId={websiteId} style={style}>
      {inner}
    </PublishedPageChrome>
  );
}
