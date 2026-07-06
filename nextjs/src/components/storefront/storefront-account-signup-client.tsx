"use client";

import type { CSSProperties } from "react";
import { FormEventHandler, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { unformatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

const CONTROL_MARK = { "data-pf-account-control": "" } as const;

function accountAuthPath(publicAccountPath: string, segment: string): string {
  const base = publicAccountPath.replace(/\/$/, "");
  return `${base}/${segment.replace(/^\//, "")}`;
}

export function StorefrontAccountSignupClient({
  websiteId,
  themeChrome,
  style,
  publicAccountPath = "/shop/account",
}: {
  websiteId: string;
  themeChrome?: boolean;
  style?: CSSProperties;
  publicAccountPath?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = `/storefront/account/w/${encodeURIComponent(websiteId)}`;
  const tc = Boolean(themeChrome);
  const shopPath = publicAccountPath.startsWith("/shop") ? "/shop" : "/";

  const submit: FormEventHandler = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/storefront-customer-auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        websiteId,
        email,
        password,
        name,
        phone: unformatPhone(phone).trim() || undefined,
      }),
    });
    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; message?: string; redirect?: string }
      | null;
    setBusy(false);
    if (!res.ok || !data?.ok) {
      setError(data?.message ?? "Could not sign up.");
      return;
    }
    await fetch("/api/storefront/public/cart/merge", {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
    router.push(data.redirect ?? `${base}/dashboard`);
    router.refresh();
  };

  return (
    <main
      data-pf-account="1"
      data-pf-account-login="1"
      className={cn(
        "pf-account-root relative z-10 mx-auto w-full max-w-md px-4 py-10 sm:px-6 lg:py-14",
        tc && "pf-account-theme",
      )}
      {...(tc && style ? { style } : {})}
    >
      <div className="pf-account-card overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-200 px-6 py-5 text-center sm:px-8">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 md:text-3xl">
            Create account
          </h1>
          <p className="mt-2 text-sm text-neutral-600">Set up your customer account</p>
        </div>

        <form onSubmit={submit} className="space-y-5 px-6 py-6 sm:px-8 sm:py-7">
          {error ? (
            <div
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              role="alert"
            >
              {error}
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-neutral-900">
              Name (optional)
            </Label>
            <Input
              {...CONTROL_MARK}
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-neutral-300 bg-white text-neutral-900"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-neutral-900">
              Email
            </Label>
            <Input
              {...CONTROL_MARK}
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-neutral-300 bg-white text-neutral-900"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-neutral-900">
              Phone (optional)
            </Label>
            <PhoneInput
              {...CONTROL_MARK}
              id="phone"
              autoComplete="tel"
              value={phone}
              onChange={setPhone}
              className="border-neutral-300 bg-white text-neutral-900"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-neutral-900">
              Password
            </Label>
            <Input
              {...CONTROL_MARK}
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="border-neutral-300 bg-white text-neutral-900"
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full" data-pf-account-save="">
            {busy ? "Creating…" : "Create account"}
          </Button>
        </form>

        <p className="border-t border-neutral-200 px-6 py-4 text-center text-sm text-neutral-600 sm:px-8">
          Already have an account?{" "}
          <Link
            href={accountAuthPath(publicAccountPath, "login")}
            className="font-medium text-blue-700 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>

      <p className="mt-6 text-center text-sm text-neutral-600">
        <Link href={shopPath} className="font-medium text-neutral-900 hover:underline">
          ← Back to store
        </Link>
      </p>
    </main>
  );
}
