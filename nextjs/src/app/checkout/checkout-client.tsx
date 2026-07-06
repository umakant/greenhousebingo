"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Lock,
  Mail,
  Minus,
  Phone,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  User,
} from "lucide-react";
import { SiteHeader } from "@/components/waterice/site-header";
import {
  WaterIceStripeCardForm,
  type WaterIceStripeConfirmRef,
} from "@/components/waterice/waterice-stripe-card-form";
import { cn } from "@/lib/utils";
import { formatPhone } from "@/lib/phone";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type CartItem = { title: string; price: number; format: string; cover: string; qty?: number };

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  card: string;
  exp: string;
  cvc: string;
  nameOnCard: string;
};

const initialForm: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "PA",
  zip: "",
  card: "",
  exp: "",
  cvc: "",
  nameOnCard: "",
};

export function CheckoutClient() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [form, setForm] = useState<FormState>(initialForm);
  const [deliveryState, setDeliveryState] = useState("FL");
  const [deliveryCity, setDeliveryCity] = useState("Jacksonville");
  const [promo, setPromo] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);

  // Stripe payment (keys resolved server-side from Storefront → Payments).
  const [payMode, setPayMode] = useState<"unknown" | "stripe" | "mock">("unknown");
  const [pay, setPay] = useState<{ clientSecret: string; publishableKey: string; amountCents: number; paymentIntentId?: string } | null>(null);
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  // The card form is collected on the Payment step; the charge runs on the last
  // step's "Place Order" via this imperative handle (set by the Stripe form).
  const stripeConfirmRef: WaterIceStripeConfirmRef = useRef(null);
  const [cardReady, setCardReady] = useState(false);
  // Order completion (persist customer + order to the Paperflight admin).
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);

  const citiesByState: Record<string, string[]> = {
    FL: ["Jacksonville"],
  };
  const routes: Record<string, { date: string; window: string; status: "scheduled" | "confirmed" }> = {
    "FL:Jacksonville": { date: "June 16, 2027", window: "1:00 PM – 3:00 PM EST", status: "scheduled" },
  };
  const routeKey = `${deliveryState}:${deliveryCity}`;
  const selectedRoute = routes[routeKey];

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("ebooks:state");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.items)) setItems(parsed.items);
      }
    } catch {}
  }, []);

  const update = (next: Partial<FormState>) => setForm((f) => ({ ...f, ...next }));

  const hasPrint = items.some((i) => i.format === "Print +$10");
  const subtotal = items.reduce((s, i) => s + i.price * (i.qty ?? 1), 0);

  const persist = (next: CartItem[]) => {
    setItems(next);
    try {
      const cart = next.map((i) => i.title);
      sessionStorage.setItem(
        "ebooks:state",
        JSON.stringify({ cart, formats: {}, items: next }),
      );
      window.dispatchEvent(new CustomEvent("cart:update"));
    } catch {}
  };
  const setQty = (title: string, qty: number) => {
    if (qty <= 0) {
      persist(items.filter((i) => i.title !== title));
    } else {
      persist(items.map((i) => (i.title === title ? { ...i, qty } : i)));
    }
  };
  const discount = promoApplied ? +(subtotal * 0.1).toFixed(2) : 0;
  const shipping = hasPrint ? 5.99 : 0;
  const tax = +((subtotal - discount + shipping) * 0.06).toFixed(2);
  const total = +(subtotal - discount + shipping + tax).toFixed(2);

  const tubItems = items.filter((i) => i.format === "2.5 Gallon Tub");
  const tubCount = tubItems.reduce((s, i) => s + (i.qty ?? 1), 0);
  const hasTubs = tubItems.length > 0;
  const tubMinMet = !hasTubs || tubCount >= 6;
  const tubsShort = Math.max(0, 6 - tubCount);

  const totalCents = Math.round(total * 100);

  // When the buyer reaches the Payment step, ask the server to start a Stripe
  // PaymentIntent using the Paperflight Stripe Settings. Falls back to the mock
  // flow when Stripe is disabled/unconfigured.
  useEffect(() => {
    if (step < 3 || paid || items.length === 0) return;
    if (payMode === "mock") return;
    if (payMode === "stripe" && pay && pay.amountCents === totalCents) return;

    let cancelled = false;
    setCreatingIntent(true);
    setPayError(null);
    (async () => {
      try {
        const res = await fetch("/api/waterice/checkout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            items: items.map((i) => ({
              title: i.title,
              price: i.price,
              qty: i.qty ?? 1,
              format: i.format,
            })),
            promoApplied,
            customerEmail: form.email,
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || data.ok === false) {
          setPayError(data.error || "Could not start payment. Please try again.");
          return;
        }
        if (data.mockPayment || !data.clientSecret) {
          setPayMode("mock");
          setPay(null);
          return;
        }
        setPayMode("stripe");
        setPay({
          clientSecret: data.clientSecret,
          publishableKey: data.publishableKey,
          amountCents: data.amount,
          paymentIntentId: data.paymentIntentId,
        });
      } catch {
        if (!cancelled) setPayError("Network error starting payment. Please try again.");
      } finally {
        if (!cancelled) setCreatingIntent(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, totalCents, promoApplied, paid, items, payMode, pay, form.email]);

  // Persist the customer (Paperflight Customers + login) and the order to the admin.
  // `paymentIntentId` is set after a successful Stripe charge; mock flow omits it.
  const submitOrder = async (paymentIntentId?: string): Promise<boolean> => {
    const res = await fetch("/api/waterice/checkout/order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({
          title: i.title,
          price: i.price,
          qty: i.qty ?? 1,
          format: i.format,
        })),
        promoApplied,
        customer: {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          address: form.address,
          city: form.city,
          state: form.state,
          zip: form.zip,
        },
        ...(paymentIntentId ? { paymentIntentId } : { mock: true }),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      setPlaceError(
        data.error ||
          "Your payment went through, but we couldn't record the order. Please contact support with your email.",
      );
      return false;
    }
    try {
      sessionStorage.removeItem("ebooks:state");
      window.dispatchEvent(new CustomEvent("cart:update"));
    } catch {}
    setPaid(true);
    return true;
  };

  // Final step: run the Stripe charge (if configured), then register the order.
  const handlePlaceOrder = async () => {
    if (placing) return;
    setPlacing(true);
    setPlaceError(null);
    try {
      let paymentIntentId: string | undefined;
      if (payMode === "stripe") {
        const confirm = stripeConfirmRef.current;
        if (!confirm) {
          setPlaceError("The payment form isn't ready yet. Please wait a moment and try again.");
          return;
        }
        const result = await confirm();
        if (!result.ok) {
          setPlaceError(result.error || "Your payment could not be processed.");
          return;
        }
        paymentIntentId = result.paymentIntentId ?? pay?.paymentIntentId;
      }
      await submitOrder(paymentIntentId);
    } catch {
      setPlaceError("Network error completing your order. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  const canNext1 =
    tubMinMet &&
    !!form.firstName &&
    !!form.lastName &&
    !!form.email &&
    form.phone.replace(/\D/g, "").length === 10 &&
    (!hasPrint || (!!form.address && !!form.city && !!form.zip));
  const canNext2 =
    form.card.replace(/\s/g, "").length >= 15 &&
    form.exp.length >= 4 &&
    form.cvc.length >= 3 &&
    !!form.nameOnCard;

  if (paid) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-2xl px-6 py-24 text-center">
          <span className="mx-auto grid place-items-center w-16 h-16 rounded-full bg-secondary text-secondary-foreground">
            <Check className="w-8 h-8" />
          </span>
          <h1 className="mt-6 font-display text-4xl font-extrabold">Payment successful!</h1>
          <p className="mt-3 text-muted-foreground">
            Thank you for your order. Check your inbox (and spam folder) for your confirmation
            email and eBook download links.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold hover:opacity-90"
            >
              Back to Home
            </Link>
            <Link
              href="/ebooks"
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 font-semibold hover:bg-muted/40"
            >
              Keep Shopping
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-2xl px-6 py-24 text-center">
          <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground" />
          <h1 className="mt-6 font-display text-4xl font-extrabold">Your cart is empty</h1>
          <p className="mt-3 text-muted-foreground">Browse our eBooks and add some titles to get started.</p>
          <Link
            href="/ebooks"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold hover:opacity-90"
          >
            Browse eBooks
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader cartItems={items.map((i) => ({ title: i.title, price: i.price }))} />

      <section className="bg-muted/40 border-b border-border/60">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <Link href="/ebooks" className="hover:text-primary">eBooks</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground font-medium">Checkout</span>
          </nav>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold mt-4 leading-tight">
            Secure Checkout
          </h1>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-[1fr_380px] gap-10">
          <div>
            {/* Item summary cards */}
            {hasTubs && !tubMinMet && (
              <div
                role="alert"
                className="mb-4 rounded-2xl border-2 border-destructive bg-destructive/10 p-4 flex items-start gap-3"
              >
                <span className="grid place-items-center w-9 h-9 rounded-full bg-destructive text-destructive-foreground font-bold shrink-0">
                  !
                </span>
                <div className="text-sm">
                  <p className="font-bold text-destructive">
                    Minimum order: 6 wholesale tubs required
                  </p>
                  <p className="mt-1 text-foreground">
                    You currently have <strong>{tubCount}</strong>{" "}
                    {tubCount === 1 ? "tub" : "tubs"} in your cart. Add{" "}
                    <strong>{tubsShort}</strong> more to continue.{" "}
                    <Link href="/shop/flavors" className="font-semibold text-primary hover:underline">
                      Add more flavors →
                    </Link>
                  </p>
                </div>
              </div>
            )}
            <div className="space-y-3">
              {items.map((i) => {
                const qty = i.qty ?? 1;
                const isTub = i.format === "2.5 Gallon Tub";
                return (
                  <div
                    key={i.title}
                    className="bg-card border rounded-2xl p-5 flex flex-wrap items-center gap-5 shadow-sm"
                  >
                    <img
                      src={i.cover}
                      alt={i.title}
                      className="w-24 h-24 rounded-xl object-cover bg-muted"
                    />
                    <div className="flex-1 min-w-[200px]">
                      <p className="text-xs font-extrabold text-primary uppercase tracking-wider">
                        {isTub ? "Flavor" : "eBook"}
                      </p>
                      <h2 className="font-display text-2xl font-extrabold mt-1 leading-tight">
                        {i.title}
                      </h2>
                      <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
                        {i.format}
                      </span>
                      <div className="mt-3 flex items-center gap-3">
                        {isTub && (
                          <div className="inline-flex items-center rounded-full border border-border">
                            <button
                              type="button"
                              onClick={() => setQty(i.title, qty - 1)}
                              className="w-8 h-8 grid place-items-center rounded-full hover:bg-muted transition-colors"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-3 text-sm font-bold tabular-nums min-w-[2ch] text-center">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => setQty(i.title, qty + 1)}
                              className="w-8 h-8 grid place-items-center rounded-full hover:bg-muted transition-colors"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setQty(i.title, 0)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-3xl font-extrabold text-primary">
                        ${fmt(i.price * (isTub ? qty : 1))}
                      </div>
                      {isTub && (
                        <div className="text-xs text-muted-foreground">
                          ${fmt(i.price)} × {qty}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stepper */}
            <ol className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { n: 1, label: "Location" },
                { n: 2, label: "Information" },
                { n: 3, label: "Payment" },
                { n: 4, label: "Confirm" },
              ].map((s) => {
                const active = step === s.n;
                const done = step > s.n;
                return (
                  <li
                    key={s.n}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors",
                      active && "bg-primary/5 border-primary",
                      done && "bg-secondary/5 border-secondary/40",
                      !active && !done && "bg-card",
                    )}
                  >
                    <span
                      className={cn(
                        "grid place-items-center w-9 h-9 rounded-full font-bold text-sm",
                        active && "bg-primary text-primary-foreground",
                        done && "bg-secondary text-secondary-foreground",
                        !active && !done && "bg-muted text-muted-foreground",
                      )}
                    >
                      {done ? <Check className="w-4 h-4" /> : s.n}
                    </span>
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                        Step {s.n}
                      </div>
                      <div className="text-sm font-semibold leading-tight">{s.label}</div>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-8 bg-card border rounded-3xl p-7 shadow-sm">
              {step === 1 && (
                <div>
                  <h3 className="font-display text-2xl font-bold flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-primary" /> Delivery Location
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select your state and city to see the next available delivery route.
                  </p>

                  <div className="mt-6 grid sm:grid-cols-2 gap-4">
                    <Field label="State" required>
                      <select
                        className="ck-input"
                        value={deliveryState}
                        onChange={(e) => {
                          const st = e.target.value;
                          setDeliveryState(st);
                          setDeliveryCity(citiesByState[st]?.[0] ?? "");
                        }}
                      >
                        <option value="FL">Florida</option>
                      </select>
                    </Field>
                    <Field label="City" required>
                      <select
                        className="ck-input"
                        value={deliveryCity}
                        onChange={(e) => setDeliveryCity(e.target.value)}
                      >
                        {(citiesByState[deliveryState] ?? []).map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  {selectedRoute && (
                    <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                          {selectedRoute.status === "confirmed" ? "Confirmed Delivery" : "Estimated Delivery"}
                        </div>
                        <span
                          className={cn(
                            "px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider",
                            selectedRoute.status === "confirmed"
                              ? "bg-secondary/15 text-secondary"
                              : "bg-primary/10 text-primary",
                          )}
                        >
                          {selectedRoute.status}
                        </span>
                      </div>
                      <div className="mt-2 font-display text-2xl font-extrabold text-foreground">
                        {selectedRoute.date}
                      </div>
                      <div className="text-sm text-muted-foreground">{selectedRoute.window}</div>
                      <div className="mt-2 text-sm text-foreground">
                        {deliveryCity}, {deliveryState}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === 2 && (
                <div>
                  <h3 className="font-display text-2xl font-bold flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" /> Your Information
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {hasPrint
                      ? "Where should we email your eBooks and ship your printed copies?"
                      : "We'll email your eBooks to this address."}
                  </p>

                  <div className="mt-6 grid sm:grid-cols-2 gap-4">
                    <Field label="First Name" required>
                      <input className="ck-input" value={form.firstName} onChange={(e) => update({ firstName: e.target.value })} placeholder="First Name" />
                    </Field>
                    <Field label="Last Name" required>
                      <input className="ck-input" value={form.lastName} onChange={(e) => update({ lastName: e.target.value })} placeholder="Last Name" />
                    </Field>
                    <Field label="Email" required>
                      <input type="email" className="ck-input" value={form.email} onChange={(e) => update({ email: e.target.value })} placeholder="you@email.com" />
                    </Field>
                    <Field label="Phone" required>
                      <input
                        type="tel"
                        inputMode="tel"
                        maxLength={14}
                        className="ck-input"
                        value={form.phone}
                        onChange={(e) => update({ phone: formatPhone(e.target.value) })}
                        placeholder="(000) 000-0000"
                      />
                    </Field>

                    {hasPrint && (
                      <>
                        <Field label="Shipping Address" required className="sm:col-span-2">
                          <input className="ck-input" value={form.address} onChange={(e) => update({ address: e.target.value })} placeholder="123 Main St" />
                        </Field>
                        <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-[1fr_120px_150px] gap-4">
                          <Field label="City" required>
                            <input className="ck-input" value={form.city} onChange={(e) => update({ city: e.target.value })} placeholder="Philadelphia" />
                          </Field>
                          <Field label="State" required>
                            <input className="ck-input" value={form.state} onChange={(e) => update({ state: e.target.value })} />
                          </Field>
                          <Field label="ZIP" required>
                            <input className="ck-input" value={form.zip} onChange={(e) => update({ zip: e.target.value })} placeholder="19103" />
                          </Field>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {(step === 3 || (step === 4 && payMode === "stripe")) && (
                <div
                  className={cn(
                    step === 4 && "pointer-events-none absolute -z-10 h-0 w-0 overflow-hidden opacity-0",
                  )}
                  aria-hidden={step === 4}
                >
                  <h3 className="font-display text-2xl font-bold flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" /> Payment Details
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">All transactions are encrypted and secure.</p>

                  {creatingIntent && (
                    <div className="mt-6 rounded-2xl border border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                      Preparing secure payment…
                    </div>
                  )}

                  {payError && (
                    <div className="mt-6 rounded-2xl border-2 border-destructive bg-destructive/10 p-4 text-sm">
                      <p className="font-semibold text-destructive">{payError}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setPayError(null);
                          setPay(null);
                          setPayMode("unknown");
                          setCardReady(false);
                        }}
                        className="mt-2 inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                      >
                        Try again
                      </button>
                    </div>
                  )}

                  {!creatingIntent && !payError && payMode === "stripe" && pay && (
                    <WaterIceStripeCardForm
                      publishableKey={pay.publishableKey}
                      clientSecret={pay.clientSecret}
                      email={form.email}
                      confirmRef={stripeConfirmRef}
                      onReadyChange={setCardReady}
                    />
                  )}

                  {!creatingIntent && !payError && payMode === "mock" && (
                    <>
                      <div className="mt-6 grid sm:grid-cols-2 gap-4">
                        <Field label="Name on Card" required className="sm:col-span-2">
                          <input className="ck-input" value={form.nameOnCard} onChange={(e) => update({ nameOnCard: e.target.value })} placeholder="Full name" />
                        </Field>
                        <Field label="Card Number" required className="sm:col-span-2">
                          <div className="relative">
                            <input
                              className="ck-input pr-10"
                              value={form.card}
                              onChange={(e) => {
                                const digits = e.target.value.replace(/\D/g, "").slice(0, 16);
                                update({ card: digits.replace(/(.{4})/g, "$1 ").trim() });
                              }}
                              inputMode="numeric"
                              placeholder="1234 5678 9012 3456"
                            />
                            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          </div>
                        </Field>
                        <Field label="Expiration (MM/YY)" required>
                          <input
                            className="ck-input"
                            value={form.exp}
                            onChange={(e) => {
                              const d = e.target.value.replace(/\D/g, "").slice(0, 4);
                              update({ exp: d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d });
                            }}
                            placeholder="12/27"
                            inputMode="numeric"
                          />
                        </Field>
                        <Field label="CVC" required>
                          <input
                            className="ck-input"
                            value={form.cvc}
                            onChange={(e) => update({ cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                            placeholder="123"
                            inputMode="numeric"
                          />
                        </Field>
                      </div>

                      <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        Your payment is 100% secure & encrypted
                      </div>
                    </>
                  )}

                  {items.map((i) => (
                    <div
                      key={`confirm-${i.title}`}
                      className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5 text-sm"
                    >
                      <div className="flex items-center gap-2 font-display text-base font-bold text-primary">
                        <Mail className="w-4 h-4" /> Confirmation Email Instructions
                      </div>
                      <p className="mt-2 text-muted-foreground">
                        Please check both your inbox and spam folders for your confirmation email.
                      </p>
                      <p className="mt-2 text-foreground">
                        <span className="font-semibold">Email Subject:</span> Your {i.title} eBook has
                        arrived — Let&apos;s Level Up Your Journey!
                      </p>
                      <p className="mt-2 text-muted-foreground">
                        This email is extremely important, as it contains the next steps you need to
                        download The {i.title} eBook. Be sure to review its contents carefully to
                        proceed with your order.
                      </p>
                      <p className="mt-3 font-semibold uppercase tracking-wide text-xs text-primary">
                        This email contains your eBook link, and free seminar class information for
                        June 14, 2026 @ 8:30PM
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {step === 4 && (
                <div>
                  <h3 className="font-display text-2xl font-bold flex items-center gap-2">
                    <Check className="w-5 h-5 text-primary" /> Review & Confirm
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Verify your details before placing the order.</p>

                  <div className="mt-6 grid sm:grid-cols-2 gap-4">
                    <ConfirmCard icon={<User className="w-4 h-4" />} title="Contact">
                      <p>{form.firstName} {form.lastName}</p>
                      <p className="text-muted-foreground">{form.email}</p>
                      <p className="text-muted-foreground">{form.phone}</p>
                    </ConfirmCard>
                    <ConfirmCard icon={<CreditCard className="w-4 h-4" />} title="Payment">
                      {payMode === "stripe" ? (
                        <>
                          <p>Credit / debit card</p>
                          <p className="text-muted-foreground">
                            Secured by Stripe — your card is charged when you place the order.
                          </p>
                        </>
                      ) : (
                        <>
                          <p>{form.nameOnCard}</p>
                          <p className="text-muted-foreground">
                            •••• •••• •••• {form.card.replace(/\s/g, "").slice(-4)} · Exp {form.exp}
                          </p>
                        </>
                      )}
                    </ConfirmCard>
                    {hasPrint && (
                      <ConfirmCard icon={<Mail className="w-4 h-4" />} title="Shipping Address" className="sm:col-span-2">
                        <p>{form.address}</p>
                        <p className="text-muted-foreground">{form.city}, {form.state} {form.zip}</p>
                      </ConfirmCard>
                    )}
                    <ConfirmCard icon={<ShoppingBag className="w-4 h-4" />} title="Order" className="sm:col-span-2">
                      <ul className="divide-y divide-border/60">
                        {items.map((i) => (
                          <li key={i.title} className="flex items-center justify-between py-1.5">
                            <span>
                              {i.title} <span className="text-muted-foreground text-xs">· {i.format}</span>
                            </span>
                            <span className="font-semibold">${fmt(i.price)}</span>
                          </li>
                        ))}
                      </ul>
                    </ConfirmCard>
                  </div>
                </div>
              )}
            </div>

            {placeError && (
              <div className="mt-6 rounded-2xl border-2 border-destructive bg-destructive/10 p-4 text-sm">
                <p className="font-semibold text-destructive">{placeError}</p>
              </div>
            )}

            {/* Navigation */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4)}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold hover:bg-muted/40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
              ) : (
                <Link
                  href="/ebooks"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold hover:bg-muted/40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Continue Shopping
                </Link>
              )}
              {step < 4 ? (
                <button
                  type="button"
                  disabled={
                    step === 1
                      ? !selectedRoute
                      : step === 2
                        ? !canNext1
                        : creatingIntent ||
                          (payMode === "stripe" ? !cardReady : !canNext2)
                  }
                  onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3 | 4)}
                  className="inline-flex items-center gap-2 rounded-full bg-secondary text-secondary-foreground pl-6 pr-2 py-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-secondary/90"
                >
                  Continue{" "}
                  <span className="grid place-items-center w-9 h-9 rounded-full bg-white text-secondary">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!tubMinMet || placing}
                  onClick={handlePlaceOrder}
                  className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground pl-6 pr-2 py-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-primary/90"
                >
                  {placing
                    ? payMode === "stripe"
                      ? "Processing payment…"
                      : "Placing order…"
                    : `Place Order — $${fmt(total)}`}{" "}
                  <span className="grid place-items-center w-9 h-9 rounded-full bg-white text-primary">
                    <Check className="w-4 h-4" />
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Summary */}
          <aside className="lg:sticky lg:top-28 self-start">
            <div className="bg-card border rounded-3xl shadow-xl p-7">
              <h3 className="font-display text-2xl font-extrabold">Price Summary</h3>

              <dl className="mt-6 space-y-4 text-[15px]">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="font-bold">${fmt(subtotal)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Shipping</dt>
                  <dd className={cn("font-bold", shipping === 0 && "text-secondary")}>
                    {shipping > 0 ? `$${fmt(shipping)}` : "$0.00"}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Discount</dt>
                  <dd className="font-bold">- ${fmt(discount)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Tax (6%)</dt>
                  <dd className="font-bold">${fmt(tax)}</dd>
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  <dt className="font-display text-xl font-extrabold">Order Total</dt>
                  <dd className="font-display text-2xl font-extrabold text-primary">
                    ${fmt(total)}
                  </dd>
                </div>
              </dl>

              <div className="my-6 border-t border-dashed border-border" />

              <div>
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">
                  Promo Code
                </label>
                <div className="mt-3 flex gap-2">
                  <input
                    value={promo}
                    onChange={(e) => setPromo(e.target.value.toUpperCase())}
                    placeholder="ENTER CODE"
                    className="ck-input flex-1 uppercase tracking-wide"
                  />
                  <button
                    type="button"
                    onClick={() => setPromoApplied(promo.trim().length > 0)}
                    className="rounded-xl bg-foreground text-background px-5 text-sm font-bold hover:bg-foreground/90 transition-colors"
                  >
                    Apply
                  </button>
                </div>
                {promoApplied && (
                  <p className="mt-2 text-xs text-secondary font-semibold">10% promo applied</p>
                )}
              </div>

              <div className="mt-6 pt-6 border-t flex items-center gap-3">
                <span className="grid place-items-center w-11 h-11 rounded-full bg-primary/10 text-primary">
                  <Phone className="w-5 h-5" />
                </span>
                <div>
                  <div className="text-sm text-muted-foreground">Questions? Call us</div>
                  <div className="font-display font-extrabold text-foreground">(215) 555-ICEE</div>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-card border rounded-3xl shadow-xl p-7">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                    Next Delivery Route
                  </div>
                  <div className="mt-1 font-display text-xl font-extrabold text-foreground">
                    Jacksonville, FL
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider">
                  Scheduled
                </span>
              </div>

              <div className="mt-5">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Tubs reserved</span>
                  <span className="font-display text-lg font-extrabold text-foreground tabular-nums">
                    {tubCount}<span className="text-muted-foreground">/50</span>
                  </span>
                </div>
                <div className="mt-2 h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, (tubCount / 50) * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {tubCount >= 50
                    ? "Route is full — delivery confirmed."
                    : `${50 - tubCount} more ${50 - tubCount === 1 ? "tub" : "tubs"} needed to release the truck.`}
                </p>
              </div>

              <div className="mt-5 pt-5 border-t border-dashed border-border">
                <div className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                  Estimated Delivery
                </div>
                <div className="mt-1 font-semibold text-foreground">June 16, 2027</div>
                <div className="text-sm text-muted-foreground">1:00 PM – 3:00 PM EST</div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <style>{`
        .ck-input {
          width: 100%;
          background: hsl(var(--card));
          border: 2px solid color-mix(in oklab, hsl(var(--foreground)) 18%, hsl(var(--border)));
          border-radius: 0.75rem;
          padding: 0.75rem 0.875rem;
          font-size: 0.875rem;
          font-weight: 500;
          outline: none;
          color: hsl(var(--foreground));
          transition: border-color .15s, box-shadow .15s;
        }
        .ck-input:focus {
          border-color: hsl(var(--primary));
          box-shadow: 0 0 0 3px color-mix(in oklab, hsl(var(--primary)) 22%, transparent);
        }
        .ck-input:focus-within {
          border-color: hsl(var(--primary));
          box-shadow: 0 0 0 3px color-mix(in oklab, hsl(var(--primary)) 22%, transparent);
        }
        .ck-input--stripe {
          display: flex;
          align-items: center;
        }
        .ck-input--stripe .StripeElement {
          width: 100%;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
        {label} {required && <span className="text-primary">*</span>}
      </span>
      {children}
    </label>
  );
}

function ConfirmCard({
  icon,
  title,
  className,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-2xl border border-border bg-muted/30 p-4", className)}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide font-semibold text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {title}
      </div>
      <div className="mt-2 text-sm space-y-0.5">{children}</div>
    </div>
  );
}
