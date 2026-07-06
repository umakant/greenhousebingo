"use client";

import { FormEventHandler, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function StorefrontAccountResetClient({
  websiteId,
  email = "",
  token,
}: {
  websiteId: string;
  email?: string;
  token: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = `/storefront/account/w/${encodeURIComponent(websiteId)}`;

  const submit: FormEventHandler = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/storefront-customer-auth/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        websiteId,
        token,
        password,
        ...(email.trim() ? { email: email.trim() } : {}),
      }),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    setBusy(false);
    if (!res.ok || !data?.ok) {
      setError(data?.message ?? "Could not reset password.");
      return;
    }
    router.push(`${base}/login`);
    router.refresh();
  };

  if (!websiteId.trim() || !token.trim()) {
    return (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-950 dark:text-amber-100">
        <p className="font-medium">Invalid link</p>
        <p className="mt-2 opacity-90">Use the link from your email or request a new reset.</p>
        <p className="mt-3">
          <Link href={`${base}/forgot-password`} className="text-primary hover:underline">
            Forgot password
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {email.trim() ? `For ${email.trim()}` : "Choose a new password for your account."}
      </p>

      <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
        )}
        <div className="grid gap-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Saving…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}
