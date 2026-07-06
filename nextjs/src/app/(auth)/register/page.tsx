"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import CookieConsent from "@/components/cookie-consent";
import {
  AuthCopyrightFooter,
  CrsBrandPanel,
  CrsMobileBrandBar,
  usePublicAuthBackgrounds,
} from "@/components/auth/crs-auth-brand";
import { CompanyRegisterWizard } from "@/components/auth/company-register-wizard";
import { t } from "@/lib/admin-t";


function RegisterPendingPanel() {
  return (
    <div className="mx-auto w-full max-w-[340px]">
      <h1 className="text-[1.65rem] font-bold leading-tight text-white">{t("Registration received")}</h1>
      <div className="mt-6 rounded-lg border border-amber-500/35 bg-amber-950/25 px-4 py-4 text-sm leading-relaxed text-amber-50">
        <p className="font-medium text-amber-100">{t("Your account is waiting for the approval of the Paperflight admin.")}</p>
        <p className="mt-3 text-amber-100/90">
          {t(
            "We have emailed you a confirmation. Once an administrator approves your company, you can sign in with the email and password you registered.",
          )}
        </p>
      </div>
      <div className="mt-8 flex flex-col gap-3">
        <Button asChild className="h-11 w-full rounded-md font-semibold shadow-none">
          <Link href="/login">{t("Go to log in")}</Link>
        </Button>
        <Button asChild variant="outline" className="h-11 w-full rounded-md border-slate-600 bg-transparent text-slate-200 hover:bg-slate-800">
          <Link href="/register">{t("Register another company")}</Link>
        </Button>
      </div>
    </div>
  );
}

function RegisterPendingView() {
  const { leftBg, rightBg } = usePublicAuthBackgrounds();
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
        <RegisterPendingPanel />
        <AuthCopyrightFooter />
      </div>
      <CookieConsent settings={{}} />
    </div>
  );
}

function RegisterPageContent() {
  const searchParams = useSearchParams();
  const pending = searchParams?.get("pending") === "1";

  if (pending) {
    return <RegisterPendingView />;
  }

  return <CompanyRegisterWizard />;
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-svh bg-slate-50" aria-busy="true" />}>
      <RegisterPageContent />
    </Suspense>
  );
}
