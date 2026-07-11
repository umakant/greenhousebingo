"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Check, ChevronLeft, CreditCard, Crown, Lock, ShieldCheck, User, X } from "lucide-react";

import { SiteHeader } from "@/components/waterice/site-header";
import {
  WaterIceStripeCardForm,
  type WaterIceStripeConfirmRef,
} from "@/components/waterice/waterice-stripe-card-form";
import { GoogleBusinessInput } from "@/components/account/google-business-input";
import { cn } from "@/lib/utils";
import { formatPhone } from "@/lib/phone";

export type MembershipPlanView = {
  slug: string;
  name: string;
  price: number;
  billingPeriod: string;
  tagline: string;
};

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PASSWORD_RULES: { id: string; label: string; test: (v: string) => boolean }[] = [
  { id: "length", label: "At least 8 characters", test: (v) => v.length >= 8 },
  { id: "number", label: "At least 1 number", test: (v) => /[0-9]/.test(v) },
  { id: "lower", label: "At least 1 lowercase letter", test: (v) => /[a-z]/.test(v) },
  { id: "upper", label: "At least 1 uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { id: "special", label: "At least 1 special character", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

const passwordMeetsComplexity = (v: string) => PASSWORD_RULES.every((r) => r.test(v));

function PasswordStrengthMeter({ value }: { value: string }) {
  if (!value) return null;
  const results = PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(value) }));
  const score = results.filter((r) => r.ok).length;
  const pct = Math.round((score / PASSWORD_RULES.length) * 100);
  const level = score >= 5 ? "strong" : score >= 3 ? "medium" : "weak";
  const barColor = level === "strong" ? "bg-emerald-500" : level === "medium" ? "bg-amber-500" : "bg-red-500";
  const label = level === "strong" ? "Strong password." : level === "medium" ? "Medium password." : "Weak password.";
  return (
    <div className="mt-2 space-y-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-sm font-medium text-foreground">{label} Must contain:</p>
      <ul className="space-y-1.5">
        {results.map((r) => (
          <li key={r.id} className="flex items-center gap-2 text-sm">
            {r.ok ? (
              <Check className="h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <X className="h-4 w-4 shrink-0 text-slate-400" />
            )}
            <span className={cn(r.ok ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
              {r.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type FormState = {
  companyName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  passwordConfirm: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

const initialForm: FormState = {
  companyName: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  passwordConfirm: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  country: "",
};

/** Normalize a Google-provided phone to the form's `(000) 000-0000` mask. */
function toPhoneMask(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (ten.length !== 10) return null;
  return formatPhone(ten);
}

export function MembershipJoinClient({ plan }: { plan: MembershipPlanView }) {
  const [step, setStep] = useState<"details" | "payment">("details");
  const [form, setForm] = useState<FormState>(initialForm);

  const [payMode, setPayMode] = useState<"unknown" | "stripe" | "mock">("unknown");
  const [pay, setPay] = useState<{ clientSecret: string; publishableKey: string; paymentIntentId?: string } | null>(null);
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const stripeConfirmRef: WaterIceStripeConfirmRef = useRef(null);
  const [cardReady, setCardReady] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const update = (next: Partial<FormState>) => setForm((f) => ({ ...f, ...next }));

  const detailsValid =
    !!form.companyName.trim() &&
    !!form.firstName.trim() &&
    !!form.lastName.trim() &&
    /\S+@\S+\.\S+/.test(form.email) &&
    form.phone.replace(/\D/g, "").length === 10 &&
    passwordMeetsComplexity(form.password) &&
    form.password === form.passwordConfirm;

  // Move to payment: start the Stripe PaymentIntent (or fall back to mock).
  const goToPayment = async () => {
    if (!detailsValid || creatingIntent) return;
    setCreatingIntent(true);
    setPayError(null);
    try {
      const res = await fetch("/api/waterice/membership/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: plan.slug, customerEmail: form.email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        setPayError(data.error || "Could not start payment. Please try again.");
        return;
      }
      if (data.mockPayment || !data.clientSecret) {
        setPayMode("mock");
        setPay(null);
      } else {
        setPayMode("stripe");
        setPay({
          clientSecret: data.clientSecret,
          publishableKey: data.publishableKey,
          paymentIntentId: data.paymentIntentId,
        });
      }
      setStep("payment");
    } catch {
      setPayError("Network error starting payment. Please try again.");
    } finally {
      setCreatingIntent(false);
    }
  };

  const register = async (paymentIntentId?: string): Promise<boolean> => {
    const res = await fetch("/api/waterice/membership/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        slug: plan.slug,
        company_name: form.companyName,
        first_name: form.firstName,
        last_name: form.lastName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        password_confirmation: form.passwordConfirm,
        address: form.address,
        city: form.city,
        state: form.state,
        zip: form.zip,
        country: form.country,
        ...(paymentIntentId ? { paymentIntentId } : { mock: true }),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      setSubmitError(
        data.message ||
          "Your payment went through, but we couldn't finish creating your account. Please contact support.",
      );
      return false;
    }
    setDone(true);
    return true;
  };

  const handleComplete = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      let paymentIntentId: string | undefined;
      if (payMode === "stripe") {
        const confirm = stripeConfirmRef.current;
        if (!confirm) {
          setSubmitError("The payment form isn't ready yet. Please wait a moment and try again.");
          return;
        }
        const result = await confirm();
        if (!result.ok) {
          setSubmitError(result.error || "Your payment could not be processed.");
          return;
        }
        paymentIntentId = result.paymentIntentId ?? pay?.paymentIntentId;
      }
      await register(paymentIntentId);
    } catch {
      setSubmitError("Network error completing your membership. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader active="memberships" />
        <main className="mx-auto max-w-2xl px-6 py-24 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-secondary text-secondary-foreground">
            <Check className="h-8 w-8" />
          </span>
          <h1 className="mt-6 font-display text-4xl font-extrabold">Welcome to the crew!</h1>
          <p className="mt-3 text-muted-foreground">
            Your <span className="font-semibold text-foreground">{plan.name}</span> membership is
            active and your business account has been created. Check your inbox for your login
            details.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground hover:opacity-90"
            >
              Go to Login
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 font-semibold hover:bg-muted/40"
            >
              Back to Home
            </Link>
          </div>
        </main>
        <style>{CK_STYLE}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader active="memberships" />

      <section className="border-b border-border/60 bg-muted/40">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary">Home</Link>
            <span>/</span>
            <Link href="/memberships" className="hover:text-primary">Memberships</Link>
            <span>/</span>
            <span className="font-medium text-foreground">Join</span>
          </nav>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight md:text-5xl">
            Join {plan.name}
          </h1>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[1fr_380px]">
          <div>
            <div className="rounded-3xl border bg-card p-7 shadow-sm">
              {step === "details" ? (
                <div>
                  <h3 className="flex items-center gap-2 font-display text-2xl font-bold">
                    <User className="h-5 w-5 text-primary" /> Your Business Details
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    We&apos;ll create your business account with these details.
                  </p>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <Field label="Business Name" required className="sm:col-span-2">
                      <GoogleBusinessInput
                        className="ck-input"
                        value={form.companyName}
                        onChange={(v) => update({ companyName: v })}
                        onBusinessSelected={(b) => {
                          const next: Partial<FormState> = { companyName: b.name || form.companyName };
                          const masked = toPhoneMask(b.phone);
                          if (masked) next.phone = masked;
                          if (b.address) {
                            next.address = [b.address.address_line_1, b.address.address_line_2].filter(Boolean).join(", ");
                            next.city = b.address.city;
                            next.state = b.address.state;
                            next.zip = b.address.zip_code;
                            next.country = b.address.country;
                          }
                          update(next);
                        }}
                        placeholder="Search your business name"
                      />
                      {form.address ? (
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          {[form.address, form.city, form.state, form.zip].filter(Boolean).join(", ")}
                        </p>
                      ) : null}
                    </Field>
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
                    <Field label="Password" required className="sm:col-span-2">
                      <input type="password" className="ck-input" value={form.password} onChange={(e) => update({ password: e.target.value })} placeholder="Create a password" />
                      <PasswordStrengthMeter value={form.password} />
                    </Field>
                    <Field label="Confirm Password" required className="sm:col-span-2">
                      <input type="password" className="ck-input" value={form.passwordConfirm} onChange={(e) => update({ passwordConfirm: e.target.value })} placeholder="Re-enter password" />
                    </Field>
                  </div>

                  {form.password && form.passwordConfirm && form.password !== form.passwordConfirm ? (
                    <p className="mt-3 text-sm font-medium text-destructive">Passwords do not match.</p>
                  ) : null}

                  {payError ? (
                    <div className="mt-6 rounded-2xl border-2 border-destructive bg-destructive/10 p-4 text-sm">
                      <p className="font-semibold text-destructive">{payError}</p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div>
                  <h3 className="flex items-center gap-2 font-display text-2xl font-bold">
                    <CreditCard className="h-5 w-5 text-primary" /> Payment
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    You&apos;ll be charged <span className="font-semibold text-foreground">${fmt(plan.price)}</span> for your first {plan.billingPeriod}.
                  </p>

                  {payMode === "stripe" && pay ? (
                    <WaterIceStripeCardForm
                      publishableKey={pay.publishableKey}
                      clientSecret={pay.clientSecret}
                      email={form.email}
                      confirmRef={stripeConfirmRef}
                      onReadyChange={setCardReady}
                    />
                  ) : (
                    <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5 text-sm">
                      <div className="flex items-center gap-2 font-semibold text-primary">
                        <Lock className="h-4 w-4" /> Test mode
                      </div>
                      <p className="mt-2 text-muted-foreground">
                        Card payments aren&apos;t configured for this site yet, so your membership
                        will be created without a live charge. Configure Stripe under Storefront →
                        Payments to take real payments.
                      </p>
                    </div>
                  )}

                  <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Your payment is 100% secure &amp; encrypted
                  </div>

                  {submitError ? (
                    <div className="mt-6 rounded-2xl border-2 border-destructive bg-destructive/10 p-4 text-sm">
                      <p className="font-semibold text-destructive">{submitError}</p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              {step === "payment" ? (
                <button
                  type="button"
                  onClick={() => setStep("details")}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold transition-colors hover:bg-muted/40"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
              ) : (
                <Link
                  href="/memberships"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold transition-colors hover:bg-muted/40"
                >
                  <ChevronLeft className="h-4 w-4" /> Back to Plans
                </Link>
              )}

              {step === "details" ? (
                <button
                  type="button"
                  disabled={!detailsValid || creatingIntent}
                  onClick={goToPayment}
                  className="inline-flex items-center gap-2 rounded-full bg-secondary px-6 py-3 font-semibold text-secondary-foreground transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creatingIntent ? "Preparing…" : "Continue to Payment"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting || (payMode === "stripe" && !cardReady)}
                  onClick={handleComplete}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? payMode === "stripe"
                      ? "Processing payment…"
                      : "Creating account…"
                    : `Complete Membership — $${fmt(plan.price)}`}
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-primary">
                    <Check className="h-4 w-4" />
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Summary */}
          <aside className="self-start lg:sticky lg:top-28">
            <div className="rounded-3xl border bg-card p-7 shadow-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                <Crown className="h-3.5 w-3.5" /> Membership
              </span>
              <h3 className="mt-4 font-display text-2xl font-extrabold">{plan.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{plan.tagline}</p>

              <dl className="mt-6 space-y-4 text-[15px]">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Plan</dt>
                  <dd className="font-bold">{plan.name}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Billing</dt>
                  <dd className="font-bold capitalize">Per {plan.billingPeriod}</dd>
                </div>
                <div className="flex items-center justify-between border-t pt-4">
                  <dt className="font-display text-xl font-extrabold">Due Today</dt>
                  <dd className="font-display text-2xl font-extrabold text-primary">${fmt(plan.price)}</dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </section>

      <style>{CK_STYLE}</style>
    </div>
  );
}

const CK_STYLE = `
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
  .ck-input:focus { border-color: hsl(var(--primary)); box-shadow: 0 0 0 3px color-mix(in oklab, hsl(var(--primary)) 22%, transparent); }
  .ck-input:focus-within { border-color: hsl(var(--primary)); box-shadow: 0 0 0 3px color-mix(in oklab, hsl(var(--primary)) 22%, transparent); }
  .ck-input--stripe { display: flex; align-items: center; }
  .ck-input--stripe .StripeElement { width: 100%; }
`;

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
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label} {required && <span className="text-primary">*</span>}
      </span>
      {children}
    </label>
  );
}
