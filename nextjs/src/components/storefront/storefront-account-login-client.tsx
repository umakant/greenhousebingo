"use client";

import type { CSSProperties } from "react";
import { FormEventHandler, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { dispatchStorefrontAccountSync } from "@/components/storefront/public/storefront-account-sync";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const CONTROL_MARK = { "data-pf-account-control": "" } as const;

function safeAccountNext(next: string | null, websiteId: string): string | undefined {
  if (!next?.startsWith("/")) return undefined;
  const prefix = `/storefront/account/w/${websiteId}/`;
  if (next.startsWith(prefix)) return next;
  if (
    next === "/account" ||
    next === "/shop/account" ||
    next.startsWith("/account/") ||
    next.startsWith("/shop/account/")
  ) {
    return next;
  }
  return undefined;
}

function accountAuthPath(publicAccountPath: string, segment: string): string {
  const base = publicAccountPath.replace(/\/$/, "");
  return `${base}/${segment.replace(/^\//, "")}`;
}

export function StorefrontAccountLoginClient({
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
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = `/storefront/account/w/${encodeURIComponent(websiteId)}`;
  const tc = Boolean(themeChrome);
  const shopPath = publicAccountPath.startsWith("/shop") ? "/shop" : "/";

  const submit: FormEventHandler = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/storefront-customer-auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ websiteId, email, password }),
    });
    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; message?: string; redirect?: string }
      | null;
    setBusy(false);
    if (!res.ok || !data?.ok) {
      setError(data?.message ?? "Could not sign in.");
      return;
    }
    await fetch("/api/storefront/public/cart/merge", {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
    dispatchStorefrontAccountSync();
    const next = safeAccountNext(searchParams?.get("next") ?? null, websiteId);
    router.push(next ?? publicAccountPath);
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
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 md:text-3xl">Sign in</h1>
          <p className="mt-2 text-sm text-neutral-600">Access your orders and profile</p>
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
            <Label htmlFor="password" className="text-neutral-900">
              Password
            </Label>
            <Input
              {...CONTROL_MARK}
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border-neutral-300 bg-white text-neutral-900"
            />
          </div>
          <Button
            type="submit"
            disabled={busy}
            className="w-full"
            data-pf-account-save=""
          >
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="border-t border-neutral-200 px-6 py-4 text-center text-sm text-neutral-600 sm:px-8">
          <Link
            href={`${base}/forgot-password`}
            className="font-medium text-blue-700 hover:underline"
          >
            Forgot password
          </Link>
          <span className="mx-2 text-neutral-400">·</span>
          <Link
            href={accountAuthPath(publicAccountPath, "signup")}
            className="font-medium text-blue-700 hover:underline"
          >
            Create account
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
