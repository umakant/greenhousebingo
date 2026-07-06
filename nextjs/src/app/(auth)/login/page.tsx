"use client";

import { FormEventHandler, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import InputError from "@/components/ui/input-error";
import { Checkbox } from "@/components/ui/checkbox";
import { LanguageSwitcher } from "@/components/language-switcher";
import CookieConsent from "@/components/cookie-consent";
import { Eye, EyeOff } from "lucide-react";
import {
  AuthCopyrightFooter,
  CrsBrandPanel,
  CrsMobileBrandBar,
  usePublicAuthBackgrounds,
  usePublicAuthBrand,
  CRS_INPUT_BG,
  CRS_INPUT_BORDER,
} from "@/components/auth/crs-auth-brand";
import { resolvePostLoginDestination } from "@/lib/launchpad/resolve-post-login-destination";
import { sanitizePostLoginPath } from "@/lib/safe-post-login-path";
import { t } from "@/lib/admin-t";


function LoginPageContent() {
  const { leftBg, rightBg } = usePublicAuthBackgrounds();
  const { brandName } = usePublicAuthBrand();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextFromQuery = searchParams?.get("next") ?? null;

  const [processing, setProcessing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [data, setData] = useState({
    email: "",
    password: "",
    remember: false,
    recaptcha_token: null as string | null,
  });

  const canResetPassword = true;

  const submit: FormEventHandler = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setErrors({});

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: data.email, password: data.password }),
    });
    const payload = (await res.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
      home?: string;
    } | null;

    if (!res.ok || !payload?.ok) {
      setErrors({ general: payload?.message ?? "Invalid credentials." });
      setProcessing(false);
      return;
    }

    const destination = nextFromQuery
      ? sanitizePostLoginPath(nextFromQuery)
      : sanitizePostLoginPath(await resolvePostLoginDestination(payload.home));
    router.push(destination);
    router.refresh();
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
          <h1 className="text-[1.65rem] font-bold leading-tight text-white">Welcome to {brandName}</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Please sign-in to your account and start the adventure
          </p>

          <form onSubmit={submit} className="mt-10 flex flex-col gap-6">
            {errors.general && (
              <div className="rounded-md border border-red-500/40 bg-red-950/40 px-3 py-2 text-center text-sm font-medium text-red-200">
                {errors.general}
              </div>
            )}

            <div className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-sm font-medium text-white">
                  {t("Email")}
                </Label>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  value={data.email}
                  onChange={(e) => setData((d) => ({ ...d, email: e.target.value }))}
                  required
                  autoFocus
                  tabIndex={1}
                  autoComplete="email"
                  placeholder={t("Email")}
                  className="h-11 rounded-md border text-sm text-white placeholder:text-slate-500"
                  style={{ backgroundColor: CRS_INPUT_BG, borderColor: CRS_INPUT_BORDER }}
                />
                <InputError message={errors.email} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password" className="text-sm font-medium text-white">
                  {t("Password")}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={data.password}
                    onChange={(e) => setData((d) => ({ ...d, password: e.target.value }))}
                    required
                    tabIndex={2}
                    autoComplete="current-password"
                    placeholder={t("Password")}
                    className="h-11 rounded-md border pr-11 text-sm text-white placeholder:text-slate-500"
                    style={{ backgroundColor: CRS_INPUT_BG, borderColor: CRS_INPUT_BORDER }}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-r-md text-slate-400 transition-colors hover:text-slate-200"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <InputError message={errors.password} />
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    name="remember"
                    checked={data.remember}
                    onCheckedChange={(checked) => setData((d) => ({ ...d, remember: !!checked }))}
                    tabIndex={3}
                    className="border-slate-500 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                  />
                  <Label htmlFor="remember" className="cursor-pointer text-sm font-normal text-slate-300">
                    {t("Remember me")}
                  </Label>
                </div>
                {canResetPassword && (
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-primary hover:underline"
                    tabIndex={5}
                  >
                    {t("Forgot password?")}
                  </Link>
                )}
              </div>

              <Button
                type="submit"
                tabIndex={4}
                disabled={processing}
                data-test="login-button"
                className="h-11 w-full rounded-md font-semibold shadow-none"
              >
                {processing ? "Loading..." : t("Log In")}
              </Button>
            </div>
          </form>
        </div>

        <AuthCopyrightFooter />
      </div>

      <CookieConsent settings={{}} />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-svh bg-slate-950" aria-busy="true" />}>
      <LoginPageContent />
    </Suspense>
  );
}
