"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, ShoppingCart, AlertTriangle, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency } from "@/lib/format-currency";
import { useCart } from "@/components/marketplace/company/storefront/use-cart";

export type PricingConfig = { taxRate: number; deliveryFee: number; minBuckets: number };

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export default function CartView({
  companySlug,
  pricing,
}: {
  companySlug: string;
  pricing: PricingConfig;
}) {
  const router = useRouter();
  const { settings } = useAppSettings();
  const { state, lines, bucketCount, subtotal, setQuantity } = useCart(companySlug);

  const tax = round2(subtotal * pricing.taxRate);
  const deliveryFee = subtotal > 0 ? round2(pricing.deliveryFee) : 0;
  const total = round2(subtotal + tax + deliveryFee);
  const belowMin = bucketCount < pricing.minBuckets;
  const canCheckout = lines.length > 0 && !belowMin;

  if (lines.length === 0) {
    return (
      <div className="rounded-xl border bg-background py-16 text-center">
        <ShoppingCart className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">Your cart is empty.</p>
        <Button asChild className="mt-4">
          <Link href={`/company/${companySlug}/marketplace`}>Browse vendors</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-3">
        {state.vendorName ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Store className="h-4 w-4" /> {state.vendorName}
          </div>
        ) : null}
        {lines.map(({ product, quantity }) => (
          <div
            key={product.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border bg-background p-3"
          >
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
              {product.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <Store className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-[8rem] flex-1">
              <div className="text-sm font-medium">{product.name}</div>
              <div className="text-xs text-muted-foreground">
                {formatCurrency(product.price, settings)} each
                {product.bucketCountValue > 0
                  ? ` · ${product.bucketCountValue} bucket${product.bucketCountValue === 1 ? "" : "s"}`
                  : ""}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQuantity(product.id, quantity - 1)}>
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-8 text-center text-sm">{quantity}</span>
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQuantity(product.id, quantity + 1)}>
                <Plus className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive"
                onClick={() => setQuantity(product.id, 0)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <div className="ml-auto w-20 text-right text-sm font-semibold">
              {formatCurrency(product.price * quantity, settings)}
            </div>
          </div>
        ))}
      </div>

      <div className="h-fit space-y-3 rounded-xl border bg-background p-4">
        <h3 className="text-sm font-semibold">Order summary</h3>
        <div className="space-y-1.5 text-sm">
          <Row label="Total buckets" value={String(bucketCount)} />
          <Row label="Subtotal" value={formatCurrency(subtotal, settings)} />
          <Row label={`Tax (${Math.round(pricing.taxRate * 100)}%)`} value={formatCurrency(tax, settings)} />
          <Row label="Delivery fee" value={formatCurrency(deliveryFee, settings)} />
          <div className="my-2 border-t" />
          <Row label="Total" value={formatCurrency(total, settings)} bold />
        </div>

        {belowMin ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Minimum order is {pricing.minBuckets} buckets for delivery. You have {bucketCount}. Add{" "}
              {pricing.minBuckets - bucketCount} more bucket{pricing.minBuckets - bucketCount === 1 ? "" : "s"} to
              check out.
            </span>
          </div>
        ) : null}

        <Button
          className="w-full"
          disabled={!canCheckout}
          onClick={() => router.push(`/company/${companySlug}/checkout`)}
        >
          Proceed to checkout
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href={`/company/${companySlug}/marketplace`}>Continue shopping</Link>
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-semibold" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
