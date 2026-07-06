"use client";

import * as React from "react";
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe, type Stripe, type StripeCardNumberElementOptions } from "@stripe/stripe-js";
import { ShieldCheck } from "lucide-react";

export type WaterIceConfirmResult = {
  ok: boolean;
  error?: string;
  paymentIntentId?: string;
};

/** Imperative confirm handle the parent's "Place Order" button (on the last step) calls. */
export type WaterIceStripeConfirmRef = React.MutableRefObject<
  null | (() => Promise<WaterIceConfirmResult>)
>;

const ELEMENT_OPTIONS: StripeCardNumberElementOptions = {
  style: {
    base: {
      fontSize: "14px",
      fontWeight: "500",
      color: "#0f172a",
      fontFamily: "inherit",
      "::placeholder": { color: "#94a3b8" },
    },
    invalid: { color: "#ef4444", iconColor: "#ef4444" },
  },
};

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
      {children} {required && <span className="text-primary">*</span>}
    </span>
  );
}

function CardFields({
  clientSecret,
  email,
  confirmRef,
  onReadyChange,
}: {
  clientSecret: string;
  email: string;
  confirmRef: WaterIceStripeConfirmRef;
  onReadyChange?: (ready: boolean) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();

  const [nameOnCard, setNameOnCard] = React.useState("");
  const [numberDone, setNumberDone] = React.useState(false);
  const [expiryDone, setExpiryDone] = React.useState(false);
  const [cvcDone, setCvcDone] = React.useState(false);

  // Keep the latest values available to the (stable) confirm closure.
  const csRef = React.useRef(clientSecret);
  csRef.current = clientSecret;
  const nameRef = React.useRef(nameOnCard);
  nameRef.current = nameOnCard;
  const emailRef = React.useRef(email);
  emailRef.current = email;

  const ready = numberDone && expiryDone && cvcDone && nameOnCard.trim().length > 1;
  React.useEffect(() => {
    onReadyChange?.(ready);
  }, [ready, onReadyChange]);

  React.useEffect(() => {
    confirmRef.current = async (): Promise<WaterIceConfirmResult> => {
      if (!stripe || !elements) return { ok: false, error: "Payment form is still loading. Please wait a moment." };
      const cardNumber = elements.getElement(CardNumberElement);
      if (!cardNumber) return { ok: false, error: "Please enter your card details." };
      const result = await stripe.confirmCardPayment(csRef.current, {
        payment_method: {
          card: cardNumber,
          billing_details: {
            name: nameRef.current.trim() || undefined,
            email: emailRef.current.trim() || undefined,
          },
        },
      });
      if (result.error) {
        return { ok: false, error: result.error.message || "Your payment could not be processed." };
      }
      const pi = result.paymentIntent;
      if (pi && pi.status === "succeeded") {
        return { ok: true, paymentIntentId: pi.id };
      }
      return { ok: false, error: "Payment did not complete. Please try a different card." };
    };
    return () => {
      confirmRef.current = null;
    };
  }, [stripe, elements, confirmRef]);

  return (
    <div className="mt-6 grid sm:grid-cols-2 gap-4">
      <label className="block sm:col-span-2">
        <Label required>Name on Card</Label>
        <input
          className="ck-input"
          value={nameOnCard}
          onChange={(e) => setNameOnCard(e.target.value)}
          placeholder="Full name"
          autoComplete="cc-name"
        />
      </label>

      <label className="block sm:col-span-2">
        <Label required>Card Number</Label>
        <div className="ck-input ck-input--stripe">
          <CardNumberElement
            options={{ ...ELEMENT_OPTIONS, showIcon: true }}
            onChange={(e) => setNumberDone(e.complete)}
          />
        </div>
      </label>

      <label className="block">
        <Label required>Expiration (MM/YY)</Label>
        <div className="ck-input ck-input--stripe">
          <CardExpiryElement options={ELEMENT_OPTIONS} onChange={(e) => setExpiryDone(e.complete)} />
        </div>
      </label>

      <label className="block">
        <Label required>CVC</Label>
        <div className="ck-input ck-input--stripe">
          <CardCvcElement options={ELEMENT_OPTIONS} onChange={(e) => setCvcDone(e.complete)} />
        </div>
      </label>

      <div className="sm:col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
        <ShieldCheck className="w-4 h-4 text-primary" />
        Your payment is 100% secure &amp; encrypted
      </div>
    </div>
  );
}

/**
 * Split-field Stripe card form for the Water Ice Express checkout.
 *
 * The card stays mounted across the Payment and Confirm steps; the actual charge
 * runs from the last step's "Place Order" button via `confirmRef.current()`
 * (`stripe.confirmCardPayment`).
 */
export function WaterIceStripeCardForm({
  publishableKey,
  clientSecret,
  email,
  confirmRef,
  onReadyChange,
}: {
  publishableKey: string;
  clientSecret: string;
  email: string;
  confirmRef: WaterIceStripeConfirmRef;
  onReadyChange?: (ready: boolean) => void;
}) {
  const stripePromise = React.useMemo<Promise<Stripe | null> | null>(
    () => (publishableKey.trim() ? loadStripe(publishableKey.trim()) : null),
    [publishableKey],
  );

  if (!stripePromise) {
    return (
      <p className="mt-6 text-sm text-muted-foreground">
        The card form can&apos;t load because the Stripe publishable key is missing. Add it under
        Storefront → Payments (sandbox) and reload.
      </p>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <CardFields
        clientSecret={clientSecret}
        email={email}
        confirmRef={confirmRef}
        onReadyChange={onReadyChange}
      />
    </Elements>
  );
}
