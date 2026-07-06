"use client";

import * as React from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";

import { Button } from "@/components/ui/button";

function PaymentStep({
  onPaid,
  onError,
}: {
  onPaid: () => void;
  onError: (message: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    if (!stripe || !elements) return;
    setBusy(true);
    const { error } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });
    setBusy(false);
    if (error) {
      onError(error.message ?? "Payment failed");
      return;
    }
    onPaid();
  };

  return (
    <div className="space-y-4">
      <PaymentElement />
      <Button
        type="button"
        className="w-full"
        data-pf-checkout-place-order=""
        disabled={busy || !stripe}
        onClick={() => void submit()}
      >
        {busy ? "Processing…" : "Pay now"}
      </Button>
    </div>
  );
}

export function StorefrontCheckoutStripePayment({
  publishableKey,
  clientSecret,
  onPaid,
  onError,
}: {
  /** Must match the Stripe account used to create `clientSecret` (Storefront Payments or `NEXT_PUBLIC_*`). */
  publishableKey: string;
  clientSecret: string;
  onPaid: () => void;
  onError: (message: string) => void;
}) {
  const stripePromise = React.useMemo(
    () => (publishableKey.trim() ? loadStripe(publishableKey.trim()) : null),
    [publishableKey],
  );

  if (!stripePromise) {
    return (
      <p className="text-sm text-muted-foreground">
        Add your Stripe <strong>publishable key</strong> under Storefronts → System Setup → Payments (or set{" "}
        <code className="rounded bg-muted px-1">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>) so the card form can load.
        The server already created a payment for this order.
      </p>
    );
  }

  return (
    <StripeElementsGate stripePromise={stripePromise} clientSecret={clientSecret} onPaid={onPaid} onError={onError} />
  );
}

function StripeElementsGate({
  stripePromise,
  clientSecret,
  onPaid,
  onError,
}: {
  stripePromise: Promise<Stripe | null>;
  clientSecret: string;
  onPaid: () => void;
  onError: (message: string) => void;
}) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentStep onPaid={onPaid} onError={onError} />
    </Elements>
  );
}
