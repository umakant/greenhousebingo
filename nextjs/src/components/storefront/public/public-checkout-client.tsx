"use client";

import type { CSSProperties } from "react";
import * as React from "react";
import Link from "next/link";

import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PublicStorefrontBrandSettings } from "@/lib/storefront/public-storefront-settings";
import { shippingAmountForMethod } from "@/lib/storefront/shipping-rates";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { PublishedPageChrome } from "@/components/storefront/public/published-page-view";
import { PF_STOREFRONT_CART_SYNC_EVENT } from "@/components/storefront/public/storefront-liquid-cart-sync";
import { dispatchStorefrontAccountSync } from "@/components/storefront/public/storefront-account-sync";
import { StorefrontCheckoutStripePayment } from "@/components/storefront/public/storefront-checkout-stripe";

type Props = {
  publicSettings: PublicStorefrontBrandSettings;
  websiteId: string;
  style?: CSSProperties;
  /** Browser path to My Account (`/account` on custom domain, `/shop/account` on app host). */
  publicAccountPath?: string;
  /** When true, skip `PublishedPageChrome` — content portals into Liquid `#pf-react-main-slot` (still use shadcn/Tailwind; theme `.heading` / `.card` are unsafe there). */
  themeChrome?: boolean;
};

type CartLine = {
  id: string;
  quantity: number;
  unitPrice: number;
  product: { name: string; slug: string | null } | null;
};

/** Theme OS2 can zero out shadcn borders in `#pf-react-main-slot`; CSS targets this marker. */
const CHECKOUT_CONTROL_MARK = { "data-pf-checkout-control": "" } as const;

function splitStorefrontCustomerName(full: string): { firstName: string; lastName: string } {
  const t = full.trim();
  if (!t) return { firstName: "", lastName: "" };
  const parts = t.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

export function PublicCheckoutClient({
  publicSettings,
  websiteId,
  style,
  themeChrome,
  publicAccountPath = "/shop/account",
}: Props) {
  const [email, setEmail] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [createAccount, setCreateAccount] = React.useState(true);
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [emailCheck, setEmailCheck] = React.useState<{
    checking: boolean;
    allowedForSignup: boolean | null;
    existingCustomer: boolean;
    message: string | null;
  }>({ checking: false, allowedForSignup: null, existingCustomer: false, message: null });
  const [line1, setLine1] = React.useState("");
  const [city, setCity] = React.useState("");
  const [region, setRegion] = React.useState("");
  const [postal, setPostal] = React.useState("");
  const [country, setCountry] = React.useState("US");
  const [billLine1, setBillLine1] = React.useState("");
  const [billCity, setBillCity] = React.useState("");
  const [billRegion, setBillRegion] = React.useState("");
  const [billPostal, setBillPostal] = React.useState("");
  const [billCountry, setBillCountry] = React.useState("US");
  const [sameAsBilling, setSameAsBilling] = React.useState(true);
  const [shippingMethod, setShippingMethod] = React.useState("standard");
  const [coupon, setCoupon] = React.useState("");
  const [cartLines, setCartLines] = React.useState<CartLine[]>([]);
  const [checkoutSessionId, setCheckoutSessionId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [cartLoading, setCartLoading] = React.useState(true);
  const [quoteLoading, setQuoteLoading] = React.useState(false);
  const [quoteSubtotal, setQuoteSubtotal] = React.useState(0);
  const [quoteShipping, setQuoteShipping] = React.useState(0);
  const [quoteTax, setQuoteTax] = React.useState(0);
  const [quoteDiscount, setQuoteDiscount] = React.useState(0);
  const [couponHint, setCouponHint] = React.useState<string | null>(null);
  const [quoteTotal, setQuoteTotal] = React.useState(0);
  const [payStep, setPayStep] = React.useState<{
    clientSecret: string;
    orderNumber: string;
    orderId: string;
  } | null>(null);
  const [done, setDone] = React.useState<{
    orderNumber: string;
    orderId: string;
    pendingStripe?: boolean;
    accountReady?: boolean;
    accountError?: string | null;
  } | null>(null);

  const completeCheckoutAccount = React.useCallback(
    async (orderId: string, opts?: { skipPassword?: boolean }) => {
      if (isLoggedIn) {
        const res = await fetch("/api/storefront/public/checkout/complete-account", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
        if (res.ok && data?.ok) {
          dispatchStorefrontAccountSync();
          return { ok: true as const };
        }
        return { ok: false as const, message: data?.message ?? "Could not link order to your account." };
      }
      if (!createAccount && !opts?.skipPassword) {
        return { ok: true as const, skipped: true as const };
      }
      if (!password || password.length < 8) {
        return { ok: false as const, message: "Choose a password with at least 8 characters to create your account." };
      }
      if (password !== confirmPassword) {
        return { ok: false as const, message: "Passwords do not match." };
      }
      const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
      const res = await fetch("/api/storefront/public/checkout/complete-account", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId, password, name: fullName || null }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (res.ok && data?.ok) {
        dispatchStorefrontAccountSync();
        return { ok: true as const };
      }
      return { ok: false as const, message: data?.message ?? "Could not create your account." };
    },
    [confirmPassword, createAccount, firstName, isLoggedIn, lastName, password],
  );

  const finishOrder = React.useCallback(
    async (order: { orderNumber: string; orderId: string; pendingStripe?: boolean }) => {
      if (order.pendingStripe) {
        setDone({ ...order, accountReady: isLoggedIn, accountError: null });
        return;
      }
      if (!isLoggedIn && !createAccount) {
        setDone({ ...order, accountReady: false, accountError: null });
        return;
      }
      const account = await completeCheckoutAccount(order.orderId);
      setDone({
        ...order,
        accountReady: account.ok,
        accountError: account.ok ? null : account.message ?? null,
      });
    },
    [completeCheckoutAccount, createAccount, isLoggedIn],
  );

  const loginReturnPath = publicAccountPath.startsWith("/shop") ? "/shop/checkout" : "/checkout";
  const loginHref = `${publicAccountPath}/login?next=${encodeURIComponent(loginReturnPath)}`;

  const runEmailCheck = React.useCallback(
    async (
      em: string,
    ): Promise<{ allowedForSignup: boolean | null; existingCustomer: boolean; message: string | null }> => {
      if (isLoggedIn) {
        setEmailCheck({ checking: false, allowedForSignup: null, existingCustomer: false, message: null });
        return { allowedForSignup: null, existingCustomer: false, message: null };
      }
      const trimmed = em.trim();
      if (!trimmed || !trimmed.includes("@")) {
        setEmailCheck({ checking: false, allowedForSignup: null, existingCustomer: false, message: null });
        return { allowedForSignup: null, existingCustomer: false, message: null };
      }
      setEmailCheck((prev) => ({ ...prev, checking: true }));
      try {
        const res = await fetch("/api/storefront/public/checkout/check-email", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: trimmed }),
        });
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          allowedForSignup?: boolean;
          existingCustomer?: boolean;
          message?: string | null;
        };
        if (!res.ok || !data?.ok) {
          const message = data?.message ?? "Could not verify email.";
          setEmailCheck({
            checking: false,
            allowedForSignup: null,
            existingCustomer: false,
            message,
          });
          return { allowedForSignup: null, existingCustomer: false, message };
        }
        const existingCustomer = Boolean(data.existingCustomer);
        const allowed = data.allowedForSignup === true;
        const message = data.message?.trim() || null;
        setEmailCheck({
          checking: false,
          allowedForSignup: allowed,
          existingCustomer,
          message,
        });
        if (existingCustomer || (!allowed && message)) {
          setCreateAccount(false);
        }
        return { allowedForSignup: allowed, existingCustomer, message };
      } catch {
        setEmailCheck({
          checking: false,
          allowedForSignup: null,
          existingCustomer: false,
          message: null,
        });
        return { allowedForSignup: null, existingCustomer: false, message: null };
      }
    },
    [isLoggedIn],
  );

  React.useEffect(() => {
    if (isLoggedIn) {
      setEmailCheck({ checking: false, allowedForSignup: null, existingCustomer: false, message: null });
      return;
    }
    const trimmed = email.trim();
    if (!trimmed.includes("@")) return;
    const tid = window.setTimeout(() => {
      void runEmailCheck(trimmed);
    }, 450);
    return () => window.clearTimeout(tid);
  }, [email, isLoggedIn, runEmailCheck]);

  const refreshQuote = React.useCallback(async () => {
    setQuoteLoading(true);
    try {
      const res = await fetch("/api/storefront/public/checkout/quote", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          shippingMethodKey: shippingMethod,
          couponCode: coupon.trim(),
          shippingCountry: country.trim() || "US",
          shippingRegion: region.trim(),
        }),
      });
      const q = (await res.json().catch(() => null)) as {
        ok?: boolean;
        subtotal?: number;
        shippingAmount?: number;
        taxAmount?: number;
        discountAmount?: number;
        total?: number;
        couponMessage?: string;
        couponApplied?: boolean;
      };
      if (q?.ok) {
        setQuoteSubtotal(Number(q.subtotal ?? 0));
        setQuoteShipping(Number(q.shippingAmount ?? 0));
        setQuoteTax(Number(q.taxAmount ?? 0));
        setQuoteDiscount(Number(q.discountAmount ?? 0));
        setQuoteTotal(Number(q.total ?? 0));
        setCouponHint(q.couponMessage?.trim() ? q.couponMessage : null);
      }
    } finally {
      setQuoteLoading(false);
    }
  }, [shippingMethod, coupon, country, region]);

  const loadCartLines = React.useCallback(async () => {
    setCartLoading(true);
    try {
      const res = await fetch("/api/storefront/public/cart", { credentials: "include" });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        cart?: { lines?: CartLine[] | null; subtotal?: number };
      };
      if (data?.ok && data.cart) {
        setCartLines(Array.isArray(data.cart.lines) ? data.cart.lines : []);
      }
    } finally {
      setCartLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadCartLines();
  }, [loadCartLines]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/storefront-customer-auth/me?websiteId=${encodeURIComponent(websiteId)}`,
          { credentials: "include" },
        );
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          customer?: { email?: string; name?: string | null };
        };
        if (cancelled || !res.ok || !data?.ok || !data.customer) return;
        const c = data.customer;
        setIsLoggedIn(true);
        setCreateAccount(false);
        const em = (c.email ?? "").trim();
        if (em) {
          setEmail((prev) => (prev.trim() === "" ? em : prev));
        }
        const { firstName: fn, lastName: ln } = splitStorefrontCustomerName(c.name ?? "");
        if (fn) setFirstName((prev) => (prev.trim() === "" ? fn : prev));
        if (ln) setLastName((prev) => (prev.trim() === "" ? ln : prev));
      } catch {
        /* guest checkout — ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [websiteId]);

  React.useEffect(() => {
    const onCartSync = () => {
      void loadCartLines();
    };
    window.addEventListener(PF_STOREFRONT_CART_SYNC_EVENT, onCartSync);
    return () => window.removeEventListener(PF_STOREFRONT_CART_SYNC_EVENT, onCartSync);
  }, [loadCartLines]);

  React.useEffect(() => {
    void refreshQuote();
  }, [refreshQuote]);

  React.useEffect(() => {
    if (!payStep) return;
    const el = document.querySelector("[data-pf-checkout-payment]");
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [payStep]);

  const shippingFlat = shippingAmountForMethod(shippingMethod);
  const estimatedTotal = quoteTotal > 0 ? quoteTotal : Math.max(0, quoteSubtotal + shippingFlat);

  const submit = async () => {
    setLoading(true);
    try {
      const fn = firstName.trim();
      const ln = lastName.trim();
      if (!fn) {
        toast.error("First name is required");
        return;
      }
      if (!ln) {
        toast.error("Last name is required");
        return;
      }
      const em = email.trim();
      if (!em.includes("@")) {
        toast.error("Enter a valid email address");
        return;
      }
      if (!isLoggedIn) {
        const check = await runEmailCheck(em);
        if (createAccount && check.existingCustomer) {
          toast.error("An account already exists for this email. Please sign in.");
          return;
        }
        if (createAccount && check.allowedForSignup === false) {
          toast.error(check.message ?? "This email cannot be used to create a customer account.");
          return;
        }
        if (createAccount) {
          if (password.length < 8) {
            toast.error("Account password must be at least 8 characters");
            return;
          }
          if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
          }
        }
      }

      const shippingAddress = { line1, city, region, postal, country };
      const billingAddress = sameAsBilling
        ? shippingAddress
        : {
            line1: billLine1 || line1,
            city: billCity || city,
            region: billRegion || region,
            postal: billPostal || postal,
            country: billCountry || country,
          };

      let sessionId = checkoutSessionId;
      if (!sessionId && cartLines.length > 0) {
        const prep = await fetch("/api/storefront/public/checkout/prepare", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            shippingMethodKey: shippingMethod,
            couponCode: coupon.trim(),
            shippingCountry: country.trim() || "US",
            shippingRegion: region.trim(),
          }),
        });
        const pd = (await prep.json().catch(() => null)) as {
          ok?: boolean;
          checkoutSessionId?: string;
          error?: string;
        };
        if (!prep.ok || !pd?.ok || !pd.checkoutSessionId) {
          toast.error(pd?.error ?? "Could not start checkout session");
          return;
        }
        sessionId = pd.checkoutSessionId;
        setCheckoutSessionId(sessionId);
      }

      const res = await fetch("/api/storefront/public/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerEmail: email,
          customerFirstName: fn,
          customerLastName: ln,
          shippingAddress,
          billingAddress,
          checkoutSessionId: sessionId,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        orderNumber?: string;
        orderId?: string;
        mockPayment?: boolean;
        clientSecret?: string | null;
      };
      if (!res.ok || !data?.ok) {
        toast.error(data?.error ?? "Checkout failed");
        return;
      }
      if (data.mockPayment && data.orderId) {
        const c = await fetch("/api/storefront/public/checkout/confirm-test", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ orderId: data.orderId }),
        });
        const cd = (await c.json().catch(() => null)) as { ok?: boolean; error?: string };
        if (!c.ok || !cd?.ok) {
          toast.error(cd?.error ?? "Could not confirm test payment");
        }
      }
      if (data.clientSecret && data.orderNumber && data.orderId && data.mockPayment === false) {
        setPayStep({
          clientSecret: data.clientSecret,
          orderNumber: data.orderNumber,
          orderId: data.orderId,
        });
        return;
      }
      if (data.orderNumber && data.orderId) {
        await finishOrder({
          orderNumber: data.orderNumber,
          orderId: data.orderId,
          pendingStripe: Boolean(data.clientSecret) && data.mockPayment === false,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const wrap = (title: string, inner: React.ReactElement) =>
    themeChrome ? (
      inner
    ) : (
      <PublishedPageChrome publicSettings={publicSettings} title={title} websiteId={websiteId} style={style}>
        {inner}
      </PublishedPageChrome>
    );

  const tc = Boolean(themeChrome);

  /**
   * Inside Liquid `#pf-react-main-slot`, avoid OS2 theme utility classes like `.heading` / `.section` / `.card`:
   * headings are normally wrapped with `split-words` + `animate-element`, so bare `.heading` can stay invisible;
   * `.card` can also ship with opacity / motion states. Use Tailwind + shadcn only (same approach as `PublicCartClient`).
   */

  if (done) {
    const setupAccount = async () => {
      if (!done.orderId) return;
      setLoading(true);
      try {
        const account = await completeCheckoutAccount(done.orderId);
        setDone((prev) =>
          prev
            ? {
                ...prev,
                accountReady: account.ok,
                accountError: account.ok ? null : account.message ?? null,
              }
            : prev,
        );
        if (account.ok) toast.success("Your account is ready.");
        else toast.error(account.message ?? "Could not create account.");
      } finally {
        setLoading(false);
      }
    };

    return wrap(
      "Thank you",
      <main
        data-pf-checkout="1"
        className="pf-checkout-root relative z-10 mx-auto w-full max-w-lg px-4 py-12 sm:px-6"
        {...(tc && style ? { style } : {})}
      >
        <div className="pf-checkout-thank-you rounded-lg border border-border bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 md:text-3xl">Thank you!</h1>
          <p className="mt-2 text-base font-medium text-neutral-700">Order {done.orderNumber}</p>
          {done.pendingStripe ? (
            <p className="mt-4 text-sm text-neutral-600">
              Complete card payment on your Stripe integration (PaymentIntent issued server-side). Status updates via
              webhook.
            </p>
          ) : null}
          {done.accountReady ? (
            <p className="mt-4 text-sm text-neutral-600">
              You&apos;re signed in. View order status anytime from My Account.
            </p>
          ) : done.accountError ? (
            <p className="mt-4 text-sm text-amber-700">{done.accountError}</p>
          ) : !isLoggedIn && !createAccount ? (
            <p className="mt-4 text-sm text-neutral-600">Create an account below to track this order.</p>
          ) : null}
          {!done.accountReady && !done.pendingStripe && !isLoggedIn && createAccount ? (
            <div className="mt-6 space-y-3 text-left">
              <div className="space-y-2">
                <Label htmlFor="ty-pw">Password</Label>
                <Input
                  {...CHECKOUT_CONTROL_MARK}
                  id="ty-pw"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ty-pw2">Confirm password</Label>
                <Input
                  {...CHECKOUT_CONTROL_MARK}
                  id="ty-pw2"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <Button
                type="button"
                className="w-full"
                disabled={loading}
                data-pf-checkout-create-account=""
                onClick={() => void setupAccount()}
              >
                {loading ? "Creating account…" : "Create account & view orders"}
              </Button>
            </div>
          ) : null}
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            {done.accountReady ? (
              <Button asChild data-pf-checkout-my-account="">
                <Link href={publicAccountPath}>My account</Link>
              </Button>
            ) : null}
            <Button asChild variant="outline" data-pf-checkout-back-store="">
              <Link href={publicAccountPath.startsWith("/shop") ? "/shop" : "/"}>Back to store</Link>
            </Button>
          </div>
        </div>
      </main>,
    );
  }

  const orderSummary = (
    <div
      className={cn(
        "pf-checkout-order-summary h-fit rounded-lg border border-border bg-white p-4 shadow-sm md:p-5",
        tc ? "min-w-0 lg:col-span-5" : "min-w-0",
      )}
    >
      <h2 className="pf-checkout-summary-title text-base font-semibold text-neutral-900">Order summary</h2>
      {cartLoading || quoteLoading ? (
        <p className="mt-2 text-sm text-neutral-600">Loading…</p>
      ) : cartLines.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-600">Your cart is empty.</p>
      ) : (
        <ul className="pf-checkout-lines mt-3 space-y-2 text-sm leading-snug text-neutral-900">
          {cartLines.map((l) => (
            <li key={l.id} className="flex justify-between gap-2">
              <span className="truncate text-neutral-900">
                {l.product?.name ?? "Item"} × {l.quantity}
              </span>
              <span className="tabular-nums text-neutral-900">${(l.quantity * l.unitPrice).toFixed(2)}</span>
            </li>
          ))}
          <li className="flex justify-between border-t border-neutral-200 pt-2 text-neutral-600">
            <span>Subtotal</span>
            <span className="tabular-nums">${quoteSubtotal.toFixed(2)}</span>
          </li>
          {quoteDiscount > 0 ? (
            <li className="flex justify-between text-emerald-600">
              <span>Discount</span>
              <span className="tabular-nums">−${quoteDiscount.toFixed(2)}</span>
            </li>
          ) : null}
          <li className="flex justify-between text-neutral-600">
            <span>Shipping</span>
            <span className="tabular-nums">${quoteShipping.toFixed(2)}</span>
          </li>
          <li className="flex justify-between text-neutral-600">
            <span>Tax</span>
            <span className="tabular-nums">${quoteTax.toFixed(2)}</span>
          </li>
          <li className="flex justify-between border-t border-neutral-200 pt-2 text-base font-semibold text-neutral-900">
            <span>Total</span>
            <span className="tabular-nums">${estimatedTotal.toFixed(2)}</span>
          </li>
        </ul>
      )}
    </div>
  );

  const checkoutForm = (
    <>
      <fieldset disabled={!!payStep} className="min-w-0 space-y-4 border-0 p-0">
      <div className="space-y-2">
        <Label htmlFor="em">Email</Label>
        <Input
          {...CHECKOUT_CONTROL_MARK}
          id="em"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailCheck.message) {
              setEmailCheck({ checking: false, allowedForSignup: null, existingCustomer: false, message: null });
            }
          }}
          onBlur={() => {
            if (!isLoggedIn && email.trim().includes("@")) {
              void runEmailCheck(email);
            }
          }}
          autoComplete="email"
          required
        />
        {emailCheck.checking ? (
          <p className="text-xs text-neutral-600">Checking email…</p>
        ) : emailCheck.existingCustomer ? (
          <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm" role="status">
            <p className="font-medium text-neutral-900">{emailCheck.message}</p>
            <Button asChild size="sm" className="mt-2" data-pf-checkout-sign-in="">
              <Link href={loginHref}>Sign in</Link>
            </Button>
          </div>
        ) : emailCheck.message ? (
          <p className="text-xs text-amber-700" role="status">
            {emailCheck.message}
          </p>
        ) : createAccount && emailCheck.allowedForSignup ? (
          <p className="text-xs text-emerald-700">This email can be used for your account.</p>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fn">First name</Label>
          <Input
            {...CHECKOUT_CONTROL_MARK}
            id="fn"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ln">Last name</Label>
          <Input
            {...CHECKOUT_CONTROL_MARK}
            id="ln"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
            required
          />
        </div>
      </div>
      <h2 className="pt-2 text-sm font-medium text-neutral-900">Shipping address</h2>
      <div className="space-y-2">
        <Label htmlFor="a1">Address</Label>
        <AddressAutocomplete
          inputProps={{ ...CHECKOUT_CONTROL_MARK, required: true }}
          id="a1"
          value={line1}
          onChange={setLine1}
          placeholder="Start typing your street address…"
          onPlaceSelect={(addr) => {
            if (addr.city.trim()) setCity(addr.city.trim());
            if (addr.state.trim()) setRegion(addr.state.trim());
            if (addr.zip.trim()) setPostal(addr.zip.trim());
            const cc = addr.countryCode.trim().slice(0, 2).toUpperCase();
            setCountry(cc || "US");
          }}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ci">City</Label>
          <Input {...CHECKOUT_CONTROL_MARK} id="ci" value={city} onChange={(e) => setCity(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rg">State / Region</Label>
          <Input {...CHECKOUT_CONTROL_MARK} id="rg" value={region} onChange={(e) => setRegion(e.target.value)} required />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pc">Postal</Label>
          <Input {...CHECKOUT_CONTROL_MARK} id="pc" value={postal} onChange={(e) => setPostal(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ct">Country</Label>
          <Input {...CHECKOUT_CONTROL_MARK} id="ct" value={country} onChange={(e) => setCountry(e.target.value)} required />
        </div>
      </div>
      <div className="flex items-center gap-2 pt-2">
        <Checkbox id="same" checked={sameAsBilling} onCheckedChange={(v) => setSameAsBilling(v === true)} />
        <Label htmlFor="same" className="text-sm font-normal">
          Billing address same as shipping
        </Label>
      </div>
      {!sameAsBilling ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <p className="text-sm font-medium text-neutral-900">Billing address</p>
          <Input {...CHECKOUT_CONTROL_MARK} placeholder="Street" value={billLine1} onChange={(e) => setBillLine1(e.target.value)} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input {...CHECKOUT_CONTROL_MARK} placeholder="City" value={billCity} onChange={(e) => setBillCity(e.target.value)} />
            <Input {...CHECKOUT_CONTROL_MARK} placeholder="Region" value={billRegion} onChange={(e) => setBillRegion(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input {...CHECKOUT_CONTROL_MARK} placeholder="Postal" value={billPostal} onChange={(e) => setBillPostal(e.target.value)} />
            <Input {...CHECKOUT_CONTROL_MARK} placeholder="Country" value={billCountry} onChange={(e) => setBillCountry(e.target.value)} />
          </div>
        </div>
      ) : null}
      {!isLoggedIn && emailCheck.existingCustomer ? (
        <p className="text-sm text-neutral-600">
          Checkout as guest below, or{" "}
          <Link href={loginHref} className="font-medium text-blue-700 underline underline-offset-2">
            sign in
          </Link>{" "}
          to save this order to your account.
        </p>
      ) : !isLoggedIn ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="create-acct"
              checked={createAccount}
              onCheckedChange={(v) => {
                const on = v === true;
                if (on && emailCheck.existingCustomer) return;
                setCreateAccount(on);
                if (on && email.trim().includes("@")) {
                  void runEmailCheck(email);
                }
              }}
              disabled={emailCheck.existingCustomer || (emailCheck.allowedForSignup === false && Boolean(emailCheck.message))}
            />
            <Label htmlFor="create-acct" className="text-sm font-normal">
              Create an account to track orders
            </Label>
          </div>
          {createAccount && !emailCheck.existingCustomer && emailCheck.allowedForSignup !== false ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="pw">Password</Label>
                <Input
                  {...CHECKOUT_CONTROL_MARK}
                  id="pw"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="pw2">Confirm password</Label>
                <Input
                  {...CHECKOUT_CONTROL_MARK}
                  id="pw2"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-neutral-600">Signed in — this order will be added to your account.</p>
      )}
      <div className="space-y-2">
        <Label>Shipping method</Label>
        <Select value={shippingMethod} onValueChange={setShippingMethod}>
          <SelectTrigger {...CHECKOUT_CONTROL_MARK}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pickup">Pickup — $0</SelectItem>
            <SelectItem value="standard">Standard — $5</SelectItem>
            <SelectItem value="express">Express — $15</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="cp">Coupon</Label>
        <Input
          {...CHECKOUT_CONTROL_MARK}
          id="cp"
          value={coupon}
          onChange={(e) => setCoupon(e.target.value)}
          placeholder="Code"
          onBlur={() => void refreshQuote()}
        />
        {couponHint ? <p className="text-xs text-neutral-600">{couponHint}</p> : null}
      </div>
      </fieldset>
      <Button
        type="button"
        className="w-full"
        data-pf-checkout-place-order=""
        disabled={loading || cartLoading || !!payStep}
        onClick={() => void submit()}
      >
        {payStep ? "Complete payment below" : loading ? "Placing order…" : "Place order"}
      </Button>
      {payStep ? (
        <div
          data-pf-checkout-payment=""
          className="space-y-3 rounded-lg border border-border bg-muted/20 p-4"
        >
          <h2 className="text-sm font-semibold text-neutral-900">Payment</h2>
          <p className="text-xs text-neutral-600">
            Order <span className="font-medium text-neutral-900">{payStep.orderNumber}</span>. Use a test card in
            Stripe sandbox (for example 4242 4242 4242 4242) when keys are in test mode.
          </p>
          <StorefrontCheckoutStripePayment
            publishableKey={publicSettings.stripePublishableKey}
            clientSecret={payStep.clientSecret}
            onPaid={() => {
              const snap = payStep;
              if (!snap) return;
              setPayStep(null);
              void finishOrder({
                orderNumber: snap.orderNumber,
                orderId: snap.orderId,
                pendingStripe: false,
              });
            }}
            onError={(m) => toast.error(m)}
          />
        </div>
      ) : null}
      <p className="text-center text-xs text-neutral-600 pf-checkout-footnote">
        Totals use your server cart via <code className="rounded bg-muted px-1">/checkout/quote</code>. When Stripe is
        enabled under Storefronts → System Setup → Payments, card checkout runs here; otherwise a test confirmation is
        used after you place the order.
      </p>
    </>
  );

  return wrap(
    "Checkout",
    <main
      data-pf-checkout="1"
      className={cn(
        "pf-checkout-root relative z-10 mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8",
        !tc && "max-w-4xl flex-1",
      )}
      {...(tc && style ? { style } : {})}
    >
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 md:text-3xl">Checkout</h1>
      <div
        className={cn(
          "mt-6 grid gap-8",
          tc ? "lg:grid-cols-12 lg:gap-10" : "md:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]",
        )}
      >
        <div className={cn("min-w-0 space-y-4", tc && "lg:col-span-7")}>{checkoutForm}</div>
        {orderSummary}
      </div>
    </main>,
  );
}
