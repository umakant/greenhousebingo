"use client";

import { FormEventHandler, useState } from "react";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import CookieConsent from "@/components/cookie-consent";
import { t } from "@/lib/admin-t";
import {
  AuthCopyrightFooter,
  CrsBrandPanel,
  CrsMobileBrandBar,
  usePublicAuthBackgrounds,
  CRS_INPUT_BG,
  CRS_INPUT_BORDER,
} from "@/components/auth/crs-auth-brand";


export default function ForgotPasswordPage() {
  const { leftBg, rightBg } = usePublicAuthBackgrounds();
  const [processing, setProcessing] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit: FormEventHandler = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const payload = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;

    if (!res.ok || !payload?.ok) {
      setError(payload?.message ?? "Something went wrong. Please try again.");
      setProcessing(false);
      return;
    }

    setSuccess(payload.message ?? "Check your email for reset instructions.");
    setProcessing(false);
  };

  return (
    <div className="flex min-h-svh flex-col lg:flex-row" style={{ backgroundColor: leftBg }}>
      <CrsBrandPanel />
      <CrsMobileBrandBar />

      <div
        className="relative flex min-h-svh w-full flex-col justify-center px-7 py-12 sm:px-10 lg:w-[30%] lg:min-w-[min(100%,320px)] lg:max-w-[440px] lg:shrink-0 lg:px-10 xl:px-12"
        style={{ backgroundColor: rightBg }}
      >
        <div className="absolute right-4 top-4 z-10">
          <LanguageSwitcher />
        </div>

        <div className="mx-auto w-full max-w-[340px]">
          <h1 className="text-[1.65rem] font-bold leading-tight text-white">{t("Forgot password?")}</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            {t("Enter your email and we'll send you instructions to reset your password")}
          </p>

          <form onSubmit={submit} className="mt-10 flex flex-col gap-6">
            {success && (
              <div className="rounded-md border border-emerald-500/40 bg-emerald-950/40 px-3 py-2 text-center text-sm font-medium text-emerald-100">
                {success}
              </div>
            )}
            {error && (
              <div className="rounded-md border border-red-500/40 bg-red-950/40 px-3 py-2 text-center text-sm font-medium text-red-200">
                {error}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="email" className="text-sm font-medium text-white">
                {t("Email")}
              </Label>
              <Input
                id="email"
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
                placeholder="email@example.com"
                className="h-11 rounded-md border text-sm text-white placeholder:text-slate-500"
                style={{ backgroundColor: CRS_INPUT_BG, borderColor: CRS_INPUT_BORDER }}
              />
            </div>

            <Button
              type="submit"
              disabled={processing}
              className="h-11 w-full rounded-md font-semibold shadow-none"
            >
              {processing ? t("Sending...") : t("Send reset link")}
            </Button>

            <p className="text-center text-sm">
              <Link
                href="/login"
                className="font-medium text-primary hover:underline"
              >
                {t("Back to login")}
              </Link>
            </p>
          </form>
        </div>

        <AuthCopyrightFooter />
      </div>

      <CookieConsent settings={{}} />
    </div>
  );
}
