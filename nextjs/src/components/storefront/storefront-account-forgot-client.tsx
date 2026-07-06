"use client";

import { FormEventHandler, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function StorefrontAccountForgotClient({ websiteId }: { websiteId: string }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const base = `/storefront/account/w/${encodeURIComponent(websiteId)}`;

  const submit: FormEventHandler = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/storefront-customer-auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ websiteId, email }),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    setBusy(false);
    if (!res.ok || !data?.ok) {
      setError(data?.message ?? "Something went wrong.");
      return;
    }
    setDone(true);
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight">Forgot password</h1>
      <p className="mt-2 text-sm text-muted-foreground">We will email a reset link if an account exists.</p>

      {done ? (
        <p className="mt-8 rounded-lg border border-border bg-muted/40 p-4 text-sm text-foreground">
          If an account exists for this store, check your inbox for reset instructions.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href={`${base}/login`} className="text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
