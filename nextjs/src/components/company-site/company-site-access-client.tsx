"use client";

import { useState } from "react";
import { Lock } from "lucide-react";

type Props = {
  companySlug: string;
  companyName: string;
  nextPath: string;
  siteBase?: string;
};

export function CompanySiteAccessClient({
  companySlug,
  companyName,
  nextPath,
  siteBase: siteBaseProp,
}: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/company-sites/${encodeURIComponent(companySlug)}/access`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password, next: nextPath }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string; redirectTo?: string } | null;
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || "Access denied.");
      }
      const fallback = siteBaseProp ?? `/sites/${encodeURIComponent(companySlug)}`;
      window.location.href = data.redirectTo || fallback;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Access denied.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/80 p-8 shadow-2xl backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-red-600/20 text-red-400">
            <Lock className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold">Password required</h1>
            <p className="text-sm text-white/60">{companyName}</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-white/70">
          This marketing site is private. Enter the access password shared with you to continue.
        </p>
        <form className="mt-6 space-y-4" onSubmit={(e) => void submit(e)}>
          <div>
            <label htmlFor="access-password" className="text-sm font-medium text-white/80">
              Access password
            </label>
            <input
              id="access-password"
              type="password"
              autoComplete="current-password"
              className="mt-1 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none ring-red-500 focus:ring-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {submitting ? "Checking…" : "Enter site"}
          </button>
        </form>
      </div>
    </div>
  );
}
