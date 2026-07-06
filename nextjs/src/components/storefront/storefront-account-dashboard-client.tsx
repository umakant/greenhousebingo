"use client";

import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import Link from "next/link";
import { HelpCircle, LogOut, Package, ShoppingBag, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { dispatchStorefrontAccountSync } from "@/components/storefront/public/storefront-account-sync";

type OrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string | null;
  fulfillmentStatus: string;
  total: number;
  currency: string;
  createdAt: string;
  paidAt: string | null;
};

const CONTROL_MARK = { "data-pf-account-control": "" } as const;

function formatOrderStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusBadgeClass(kind: "payment" | "fulfillment", value: string): string {
  const v = value.toLowerCase();
  if (kind === "payment") {
    if (v === "paid" || v === "succeeded") return "pf-account-badge pf-account-badge--success";
    if (v === "pending" || v === "pending_payment" || v === "unpaid") return "pf-account-badge pf-account-badge--warning";
    if (v === "failed" || v === "refunded" || v === "cancelled") return "pf-account-badge pf-account-badge--muted";
  }
  if (v === "fulfilled" || v === "shipped" || v === "delivered") return "pf-account-badge pf-account-badge--success";
  if (v === "unfulfilled" || v === "pending") return "pf-account-badge pf-account-badge--warning";
  return "pf-account-badge pf-account-badge--neutral";
}

function firstNameFromFullName(full: string | null | undefined): string {
  const t = (full ?? "").trim();
  if (!t) return "";
  return t.split(/\s+/)[0] ?? "";
}

export function StorefrontAccountDashboardClient({
  websiteId,
  email,
  name,
  themeChrome,
  style,
  publicAccountPath = "/shop/account",
}: {
  websiteId: string;
  email: string;
  name: string | null;
  themeChrome?: boolean;
  style?: CSSProperties;
  publicAccountPath?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [profileName, setProfileName] = useState(name ?? "");
  const [phone, setPhone] = useState("");
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const savedAddressesRef = useRef<unknown[]>([]);

  const qs = `websiteId=${encodeURIComponent(websiteId)}`;
  const tc = Boolean(themeChrome);
  const shopPath = publicAccountPath.startsWith("/shop") ? "/shop" : "/";
  const welcomeName = firstNameFromFullName(profileName) || firstNameFromFullName(name) || "there";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, ordRes] = await Promise.all([
        fetch(`/api/storefront-customer-auth/me?${qs}`, { credentials: "same-origin" }),
        fetch(`/api/storefront-customer-auth/orders?${qs}`, { credentials: "same-origin" }),
      ]);
      const me = (await meRes.json().catch(() => null)) as {
        ok?: boolean;
        customer?: { name?: string | null; phone?: string | null; savedAddresses?: unknown };
      };
      const ord = (await ordRes.json().catch(() => null)) as { ok?: boolean; orders?: OrderRow[] };
      if (me?.ok && me.customer) {
        setProfileName(me.customer.name ?? "");
        setPhone(me.customer.phone ?? "");
        const addrs = me.customer.savedAddresses;
        savedAddressesRef.current = Array.isArray(addrs) ? addrs : [];
      }
      if (ord?.ok && ord.orders) setOrders(ord.orders);
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => {
    void load();
  }, [load]);

  const logout = async () => {
    setBusy(true);
    await fetch("/api/storefront-customer-auth/logout", { method: "POST", credentials: "same-origin" });
    dispatchStorefrontAccountSync();
    setBusy(false);
    router.push(`/storefront/account/w/${encodeURIComponent(websiteId)}/login?next=${encodeURIComponent(publicAccountPath)}`);
    router.refresh();
  };

  const saveProfile = async () => {
    setProfileMsg(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/storefront-customer-auth/profile?${qs}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: profileName.trim() || null,
          phone: phone.trim() || null,
          savedAddresses: savedAddressesRef.current,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (!res.ok || !data?.ok) {
        setProfileMsg(data?.message ?? "Could not save profile.");
        return;
      }
      setProfileMsg("Your profile has been updated.");
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <main
      data-pf-account="1"
      className={cn(
        "pf-account-root relative z-10 mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12",
        tc && "pf-account-theme",
      )}
      {...(tc && style ? { style } : {})}
    >
      {loading ? (
        <div className="space-y-8 animate-pulse" aria-busy="true" aria-label="Loading account">
          <div className="space-y-2">
            <div className="h-9 w-56 rounded-md bg-neutral-200" />
            <div className="h-4 w-72 rounded bg-neutral-200" />
          </div>
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="h-80 rounded-xl bg-neutral-200 lg:col-span-8" />
            <div className="h-64 rounded-xl bg-neutral-200 lg:col-span-4" />
          </div>
        </div>
      ) : (
        <>
          <header className="pf-account-header mb-8 space-y-1 lg:mb-10">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 md:text-3xl">My account</h1>
            <p className="text-sm text-neutral-600">
              Welcome back, <span className="font-medium text-neutral-900">{welcomeName}</span>. Track orders and
              update your details below.
            </p>
          </header>

          <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
            <div className="min-w-0 space-y-8 lg:col-span-8">
              <section className="pf-account-card overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-neutral-200 px-5 py-4 sm:px-6">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
                    <Package className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-neutral-900">Order history</h2>
                    <p className="text-xs text-neutral-600">
                      {orders.length === 0
                        ? "No orders yet"
                        : orders.length === 1
                          ? "1 order"
                          : `${orders.length} orders`}
                    </p>
                  </div>
                </div>

                {orders.length === 0 ? (
                  <div className="flex flex-col items-center px-6 py-12 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
                      <ShoppingBag className="h-5 w-5" aria-hidden />
                    </div>
                    <p className="mt-4 text-sm font-medium text-neutral-900">You haven&apos;t placed any orders yet.</p>
                    <p className="mt-1 max-w-sm text-sm text-neutral-600">
                      When you check out, your orders and delivery status will show up here.
                    </p>
                    <Button asChild className="mt-6" data-pf-account-shop-link="">
                      <Link href={shopPath}>Start shopping</Link>
                    </Button>
                  </div>
                ) : (
                  <ul className="divide-y divide-neutral-200">
                    {orders.map((o) => {
                      const paymentLabel = formatOrderStatus(o.paymentStatus ?? o.status);
                      const fulfillmentLabel = formatOrderStatus(o.fulfillmentStatus);
                      const placed = new Date(o.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      });
                      return (
                        <li
                          key={o.id}
                          className="pf-account-order flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5"
                        >
                          <div className="min-w-0 space-y-2">
                            <p className="font-semibold text-neutral-900">{o.orderNumber}</p>
                            <p className="text-xs text-neutral-600">Placed {placed}</p>
                            <div className="flex flex-wrap gap-2">
                              <span className={statusBadgeClass("payment", o.paymentStatus ?? o.status)}>
                                Payment · {paymentLabel}
                              </span>
                              <span className={statusBadgeClass("fulfillment", o.fulfillmentStatus)}>
                                Fulfillment · {fulfillmentLabel}
                              </span>
                            </div>
                          </div>
                          <p className="shrink-0 text-lg font-semibold tabular-nums text-neutral-900 sm:text-right">
                            {o.currency} {o.total.toFixed(2)}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className="pf-account-card overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-neutral-200 px-5 py-4 sm:px-6">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
                    <UserRound className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-neutral-900">Profile</h2>
                    <p className="text-xs text-neutral-600">Update your contact information</p>
                  </div>
                </div>

                <div className="space-y-4 px-5 py-5 sm:px-6 sm:py-6">
                  <div className="space-y-2">
                    <Label htmlFor="pname" className="text-neutral-900">
                      Full name
                    </Label>
                    <Input
                      {...CONTROL_MARK}
                      id="pname"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      autoComplete="name"
                      className="border-neutral-300 bg-white text-neutral-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pemail" className="text-neutral-900">
                      Email
                    </Label>
                    <Input
                      {...CONTROL_MARK}
                      id="pemail"
                      value={email}
                      readOnly
                      disabled
                      className="border-neutral-200 bg-neutral-50 text-neutral-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pphone" className="text-neutral-900">
                      Phone <span className="font-normal text-neutral-500">(optional)</span>
                    </Label>
                    <PhoneInput
                      {...CONTROL_MARK}
                      id="pphone"
                      value={phone}
                      onChange={setPhone}
                      autoComplete="tel"
                      className="border-neutral-300 bg-white text-neutral-900"
                    />
                  </div>
                  {profileMsg ? (
                    <p
                      className={cn(
                        "text-sm",
                        profileMsg.includes("updated") ? "text-emerald-700" : "text-amber-700",
                      )}
                      role="status"
                    >
                      {profileMsg}
                    </p>
                  ) : null}
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() => void saveProfile()}
                    data-pf-account-save=""
                    className="min-w-[140px]"
                  >
                    {busy ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </section>
            </div>

            <aside className="lg:col-span-4">
              <div className="pf-account-sidebar sticky top-24 space-y-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Account</h2>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-neutral-500">Signed in as</dt>
                    <dd className="mt-0.5 break-all font-medium text-neutral-900">{email}</dd>
                  </div>
                  {profileName.trim() ? (
                    <div>
                      <dt className="text-neutral-500">Name</dt>
                      <dd className="mt-0.5 font-medium text-neutral-900">{profileName.trim()}</dd>
                    </div>
                  ) : null}
                </dl>

                <div className="space-y-2 border-t border-neutral-200 pt-4">
                  <Button asChild variant="outline" className="w-full justify-start gap-2" data-pf-account-outline="">
                    <Link href={`/storefront/account/w/${encodeURIComponent(websiteId)}/support`}>
                      <HelpCircle className="h-4 w-4" aria-hidden />
                      Help &amp; support
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-start gap-2" data-pf-account-outline="">
                    <Link href={shopPath}>
                      <ShoppingBag className="h-4 w-4" aria-hidden />
                      Continue shopping
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start gap-2 text-red-700 hover:bg-red-50 hover:text-red-800"
                    disabled={busy}
                    onClick={() => void logout()}
                    data-pf-account-signout=""
                  >
                    <LogOut className="h-4 w-4" aria-hidden />
                    {busy ? "Signing out…" : "Sign out"}
                  </Button>
                </div>
              </div>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}
