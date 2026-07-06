"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  cartSubtotal,
  clearCompanySiteCart,
  readCompanySiteCart,
  type CompanySiteCart,
} from "@/lib/company-themes/company-site-cart";
import { formatPhone, normalizeMobileForStorage } from "@/lib/phone";
import {
  WaterIceStripeCardForm,
  type WaterIceStripeConfirmRef,
} from "@/components/waterice/waterice-stripe-card-form";
import { QRCodeTicket } from "@/components/lms/events/qr-code-ticket";
import type { CompanySiteWorkshopTicket } from "@/lib/company-themes/company-site-workshop-service";
import type { LmsEventBookingStatus } from "@/lib/lms-events/constants";

type Props = {
  companySlug: string;
  siteBase?: string;
};

type IntentResponse = {
  ok?: boolean;
  message?: string;
  mockPayment?: boolean;
  clientSecret?: string;
  publishableKey?: string;
  paymentIntentId?: string;
  total?: number;
};

type PayState = {
  clientSecret: string;
  publishableKey: string;
  paymentIntentId: string;
};

function CheckoutPanel({
  children,
  className = "mx-auto max-w-5xl px-4 py-10",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

export function CompanySiteCheckoutClient({ companySlug, siteBase: siteBaseProp }: Props) {
  const searchParams = useSearchParams();
  const reserveMode = searchParams?.get("reserve") === "1";
  const siteBase = siteBaseProp ?? `/sites/${encodeURIComponent(companySlug)}`;

  const [cart, setCart] = useState<CompanySiteCart>({ lines: [] });
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [phase, setPhase] = useState<"details" | "payment">("details");
  const [pay, setPay] = useState<PayState | null>(null);
  const [cardReady, setCardReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successRef, setSuccessRef] = useState<string | null>(null);
  const [workshopTickets, setWorkshopTickets] = useState<CompanySiteWorkshopTicket[]>([]);
  const [ticketUrl, setTicketUrl] = useState<string | null>(null);
  const confirmRef = useRef<null | (() => Promise<{ ok: boolean; error?: string; paymentIntentId?: string }>)>(
    null,
  ) as WaterIceStripeConfirmRef;

  useEffect(() => {
    setCart(readCompanySiteCart(companySlug));
  }, [companySlug]);

  const total = useMemo(() => cartSubtotal(cart), [cart]);

  const customerPayload = () => ({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.trim(),
    phone: normalizeMobileForStorage(phone) ?? undefined,
    notes: notes.trim() || undefined,
  });

  const itemsPayload = () =>
    cart.lines.map((line) => ({
      id: line.id,
      quantity: line.quantity,
      price: line.price,
      title: line.title,
    }));

  const completeOrder = async (mode: "checkout" | "reserve", paymentIntentId?: string) => {
    const res = await fetch(`/api/company-sites/${encodeURIComponent(companySlug)}/checkout`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mode,
        customer: customerPayload(),
        items: itemsPayload(),
        ...(paymentIntentId ? { paymentIntentId } : {}),
      }),
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
      reference?: string;
      workshopTickets?: CompanySiteWorkshopTicket[];
      ticketUrl?: string;
    } | null;
    if (!res.ok || !data?.ok) {
      throw new Error(data?.message || "Checkout failed.");
    }
    clearCompanySiteCart(companySlug);
    setSuccessRef(data.reference ?? "CONFIRMED");
    setWorkshopTickets(data.workshopTickets ?? []);
    setTicketUrl(data.ticketUrl ?? null);
  };

  const startCheckout = async () => {
    setError(null);
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError("First name, last name, and email are required.");
      return;
    }
    if (cart.lines.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    if (reserveMode) {
      setSubmitting(true);
      try {
        await completeOrder("reserve");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Checkout failed.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/company-sites/${encodeURIComponent(companySlug)}/checkout/intent`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerEmail: email.trim(),
          items: itemsPayload(),
        }),
      });
      const data = (await res.json().catch(() => null)) as IntentResponse | null;
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || "Could not start payment.");
      }

      if (data.mockPayment) {
        await completeOrder("checkout");
        return;
      }

      if (data.clientSecret && data.publishableKey && data.paymentIntentId) {
        setPay({
          clientSecret: data.clientSecret,
          publishableKey: data.publishableKey,
          paymentIntentId: data.paymentIntentId,
        });
        setPhase("payment");
        return;
      }

      throw new Error("Payment could not be initialized.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmPayment = async () => {
    if (!confirmRef.current) {
      setError("Payment form is still loading.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await confirmRef.current();
      if (!result.ok) {
        throw new Error(result.error || "Payment failed.");
      }
      await completeOrder("checkout", result.paymentIntentId ?? pay?.paymentIntentId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (successRef) {
    const hasWorkshopTickets = workshopTickets.length > 0;
    return (
      <CheckoutPanel className={hasWorkshopTickets ? "mx-auto max-w-4xl px-4 py-16" : "mx-auto max-w-lg px-4 py-20 text-center"}>
        <div className={hasWorkshopTickets ? "" : "text-center"}>
          <h1 className="text-3xl font-bold text-green-700">
            {hasWorkshopTickets
              ? reserveMode
                ? "Reservation confirmed"
                : "Registration confirmed"
              : reserveMode
                ? "Reservation received"
                : "Payment confirmed"}
          </h1>
          <p className="mt-4 text-slate-600">
            {hasWorkshopTickets
              ? "Your workshop QR ticket is ready. We also sent a confirmation email with your QR code and workshop details."
              : `Thank you${reserveMode ? " — your seat is reserved" : " — your registration is confirmed"}. We sent a confirmation to your email.`}
          </p>
          <p className={`mt-2 text-sm text-slate-500 ${hasWorkshopTickets ? "" : ""}`}>Reference: {successRef}</p>
        </div>

        {hasWorkshopTickets ? (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {workshopTickets.map((ticket) => (
              <QRCodeTicket
                key={ticket.registrationId}
                eventTitle={ticket.eventTitle}
                attendeeName={ticket.attendeeName}
                startsAt={ticket.startsAt}
                locationLabel={ticket.locationLabel}
                qrToken={ticket.qrToken}
                bookingStatus={ticket.bookingStatus as LmsEventBookingStatus}
                className="w-full max-w-none"
              />
            ))}
          </div>
        ) : null}

        <div className={`mt-8 flex flex-wrap gap-3 ${hasWorkshopTickets ? "" : "justify-center"}`}>
          {ticketUrl ? (
            <Link
              href={`${siteBase}/ticket/${encodeURIComponent(successRef)}?email=${encodeURIComponent(email.trim())}`}
              className="inline-flex rounded-md border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Open ticket page
            </Link>
          ) : null}
          <Link
            href={siteBase}
            className="inline-flex rounded-md bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            Back to site
          </Link>
        </div>
      </CheckoutPanel>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <CheckoutPanel className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Nothing to checkout</h1>
        <p className="mt-2 text-slate-600">Add a course or workshop to your cart first.</p>
        <Link
          href={`${siteBase}/cart`}
          className="mt-6 inline-flex rounded-md bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
        >
          View cart
        </Link>
      </CheckoutPanel>
    );
  }

  return (
    <CheckoutPanel>
      <p className="text-sm font-medium text-slate-600">
        <Link href={`${siteBase}/cart`} className="hover:text-red-600">
          ← Back to cart
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">{reserveMode ? "Reserve your seat" : "Checkout"}</h1>
      <p className="mt-2 text-slate-600">
        {reserveMode
          ? "Complete your details to hold your seat."
          : phase === "payment"
            ? "Enter your card details to complete payment."
            : "Complete your details to secure your registration."}
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <form
            className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (phase === "payment") {
                void confirmPayment();
              } else {
                void startCheckout();
              }
            }}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium" htmlFor="first-name">
                  First name *
                </label>
                <input
                  id="first-name"
                  autoComplete="given-name"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={phase === "payment"}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="last-name">
                  Last name *
                </label>
                <input
                  id="last-name"
                  autoComplete="family-name"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={phase === "payment"}
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="email">
                Email *
              </label>
              <input
                id="email"
                type="email"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={phase === "payment"}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="phone">
                Phone
              </label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="(000) 000-0000"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                disabled={phase === "payment"}
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="notes">
                Notes
              </label>
              <textarea
                id="notes"
                rows={3}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={phase === "payment"}
              />
            </div>

            {phase === "payment" && pay ? (
              <div className="border-t border-slate-200 pt-5">
                <p className="text-sm font-semibold text-slate-800">Payment</p>
                <WaterIceStripeCardForm
                  publishableKey={pay.publishableKey}
                  clientSecret={pay.clientSecret}
                  email={email.trim()}
                  confirmRef={confirmRef}
                  onReadyChange={setCardReady}
                />
              </div>
            ) : null}

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              {phase === "payment" ? (
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  disabled={submitting}
                  onClick={() => {
                    setPhase("details");
                    setPay(null);
                    setError(null);
                    setCardReady(false);
                  }}
                >
                  Back
                </button>
              ) : null}
              <button
                type="submit"
                disabled={submitting || (phase === "payment" && !cardReady)}
                className="w-full rounded-md bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 sm:flex-1"
              >
                {submitting
                  ? "Processing…"
                  : phase === "payment"
                    ? `Pay $${total.toFixed(2)}`
                    : reserveMode
                      ? "Confirm reservation"
                      : "Continue to payment"}
              </button>
            </div>
          </form>
        </div>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Order summary</p>
          <ul className="mt-4 space-y-3 text-sm">
            {cart.lines.map((line) => (
              <li key={line.id} className="flex justify-between gap-3">
                <span className="text-slate-700">
                  {line.title} × {line.quantity}
                </span>
                <span className="font-medium">${(line.price * line.quantity).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-slate-200 pt-4 text-base font-bold">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </aside>
      </div>

      <style jsx global>{`
        .ck-input {
          margin-top: 0.25rem;
          width: 100%;
          border-radius: 0.375rem;
          border: 1px solid rgb(203 213 225);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          line-height: 1.25rem;
        }
        .ck-input:focus {
          border-color: rgb(220 38 38);
          outline: none;
          box-shadow: 0 0 0 3px rgb(254 226 226);
        }
        .ck-input:focus-within {
          border-color: rgb(220 38 38);
          box-shadow: 0 0 0 3px rgb(254 226 226);
        }
        .ck-input--stripe {
          display: flex;
          align-items: center;
        }
        .ck-input--stripe .StripeElement {
          width: 100%;
        }
      `}</style>
    </CheckoutPanel>
  );
}
