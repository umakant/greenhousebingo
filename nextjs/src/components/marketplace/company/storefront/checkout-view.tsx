"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency } from "@/lib/format-currency";
import { useCart } from "@/components/marketplace/company/storefront/use-cart";
import {
  WaterIceStripeCardForm,
  type WaterIceStripeConfirmRef,
} from "@/components/waterice/waterice-stripe-card-form";
import type { PricingConfig } from "@/components/marketplace/company/storefront/cart-view";

type IntentResponse = {
  ok: boolean;
  message?: string;
  mockPayment?: boolean;
  clientSecret?: string;
  publishableKey?: string;
  paymentIntentId?: string;
  totals?: { subtotal: number; tax: number; deliveryFee: number; total: number; totalBucketCount: number };
};

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export default function CheckoutView({
  companySlug,
  pricing,
  userEmail,
}: {
  companySlug: string;
  pricing: PricingConfig;
  userEmail: string;
}) {
  const router = useRouter();
  const { settings } = useAppSettings();
  const { lines, bucketCount, subtotal, clear } = useCart(companySlug);

  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [phase, setPhase] = React.useState<"details" | "payment">("details");
  const [busy, setBusy] = React.useState(false);
  const [cardReady, setCardReady] = React.useState(false);
  const [pay, setPay] = React.useState<{ clientSecret: string; publishableKey: string; paymentIntentId: string } | null>(
    null,
  );
  const confirmRef = React.useRef<null | (() => Promise<{ ok: boolean; error?: string; paymentIntentId?: string }>)>(
    null,
  ) as WaterIceStripeConfirmRef;

  const tax = round2(subtotal * pricing.taxRate);
  const deliveryFee = subtotal > 0 ? round2(pricing.deliveryFee) : 0;
  const total = round2(subtotal + tax + deliveryFee);
  const belowMin = bucketCount < pricing.minBuckets;

  const itemsPayload = React.useMemo(
    () => lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
    [lines],
  );

  // Guard: empty cart or below minimum -> back to cart.
  React.useEffect(() => {
    if (lines.length === 0 || belowMin) {
      router.replace(`/company/${companySlug}/cart`);
    }
  }, [lines.length, belowMin, companySlug, router]);

  async function createOrder(paymentIntentId: string | null) {
    const res = await fetch(`/api/marketplace/company/${encodeURIComponent(companySlug)}/orders`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: itemsPayload, city: city.trim(), state: state.trim(), notes, paymentIntentId }),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string; orderId?: string } | null;
    if (res.ok && data?.ok && data.orderId) {
      clear();
      toast.success("Order placed");
      router.push(`/company/${companySlug}/orders/${data.orderId}?confirmation=1`);
      return true;
    }
    toast.error(data?.message ?? "Could not place order");
    return false;
  }

  async function onContinue() {
    if (!city.trim() || !state.trim()) {
      toast.error("Enter delivery city and state.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/marketplace/company/${encodeURIComponent(companySlug)}/checkout/intent`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsPayload, city: city.trim(), state: state.trim() }),
      });
      const data = (await res.json().catch(() => null)) as IntentResponse | null;
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Could not start checkout.");
        return;
      }
      if (data.mockPayment) {
        // No Stripe configured -> place order directly.
        await createOrder(null);
        return;
      }
      if (data.clientSecret && data.publishableKey && data.paymentIntentId) {
        setPay({
          clientSecret: data.clientSecret,
          publishableKey: data.publishableKey,
          paymentIntentId: data.paymentIntentId,
        });
        setPhase("payment");
      } else {
        toast.error("Payment could not be initialized.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function onPlaceOrder() {
    if (!confirmRef.current) {
      toast.error("Payment form is still loading.");
      return;
    }
    setBusy(true);
    try {
      const result = await confirmRef.current();
      if (!result.ok) {
        toast.error(result.error ?? "Payment failed.");
        return;
      }
      await createOrder(result.paymentIntentId ?? pay?.paymentIntentId ?? null);
    } finally {
      setBusy(false);
    }
  }

  if (lines.length === 0 || belowMin) {
    return (
      <div className="rounded-xl border bg-background py-16 text-center text-muted-foreground">
        <AlertTriangle className="mx-auto h-6 w-6" />
        <p className="mt-2 text-sm">Redirecting to your cart…</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <div className="rounded-xl border bg-background p-4">
          <h3 className="text-sm font-semibold">Delivery location</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={phase === "payment"}
                placeholder="Philadelphia"
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                disabled={phase === "payment"}
                placeholder="PA"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="notes">Order notes (optional)</Label>
              <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        </div>

        {phase === "payment" && pay ? (
          <div className="rounded-xl border bg-background p-4">
            <h3 className="text-sm font-semibold">Payment</h3>
            <WaterIceStripeCardForm
              publishableKey={pay.publishableKey}
              clientSecret={pay.clientSecret}
              email={userEmail}
              confirmRef={confirmRef}
              onReadyChange={setCardReady}
            />
          </div>
        ) : null}
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

        {phase === "details" ? (
          <Button className="w-full" disabled={busy} onClick={() => void onContinue()}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Continue to payment
          </Button>
        ) : (
          <Button className="w-full" disabled={busy || !cardReady} onClick={() => void onPlaceOrder()}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Place order
          </Button>
        )}
        <Button asChild variant="outline" className="w-full">
          <Link href={`/company/${companySlug}/cart`}>Back to cart</Link>
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
