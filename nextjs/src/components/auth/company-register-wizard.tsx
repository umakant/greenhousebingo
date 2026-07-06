"use client";

import { useCallback, useEffect, useMemo, useState, type FormEventHandler } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Eye, EyeOff, X } from "lucide-react";

import InputError from "@/components/ui/input-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/language-switcher";
import CookieConsent from "@/components/cookie-consent";
import { formatPhone, unformatPhone } from "@/lib/phone";
import { usePublicLoginBranding } from "@/components/auth/crs-auth-brand";
import { getImagePath } from "@/utils/image-path";
import { t } from "@/lib/admin-t";


const HERO_BACKGROUNDS = ["#fbbf24", "#38bdf8", "#a78bfa", "#4ade80", "#fb923c"] as const;

type UseCaseId = "work" | "personal" | "nonprofit" | "school";
type RoleId = "owner" | "lead" | "member" | "freelancer" | "director" | "other";

const USE_CASE_OPTIONS: { id: UseCaseId; label: string }[] = [
  { id: "work", label: t("Work") },
  { id: "personal", label: t("Personal") },
  { id: "nonprofit", label: t("Nonprofits") },
  { id: "school", label: t("School") },
];

const ROLE_OPTIONS: { id: RoleId; label: string }[] = [
  { id: "owner", label: t("Business owner") },
  { id: "lead", label: t("Team leader") },
  { id: "member", label: t("Team member") },
  { id: "freelancer", label: t("Freelancer") },
  { id: "director", label: t("Director") },
  { id: "other", label: t("Other") },
];

const PASSWORD_RULES: { id: string; label: string; test: (v: string) => boolean }[] = [
  { id: "length", label: t("At least 8 characters"), test: (v) => v.length >= 8 },
  { id: "number", label: t("At least 1 number"), test: (v) => /[0-9]/.test(v) },
  { id: "lower", label: t("At least 1 lowercase letter"), test: (v) => /[a-z]/.test(v) },
  { id: "upper", label: t("At least 1 uppercase letter"), test: (v) => /[A-Z]/.test(v) },
  { id: "special", label: t("At least 1 special character"), test: (v) => /[^A-Za-z0-9]/.test(v) },
];

function PasswordStrengthMeter({ value }: { value: string }) {
  if (!value) return null;
  const results = PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(value) }));
  const score = results.filter((r) => r.ok).length;
  const pct = Math.round((score / PASSWORD_RULES.length) * 100);
  const level = score >= 5 ? "strong" : score >= 3 ? "medium" : "weak";
  const barColor = level === "strong" ? "bg-emerald-500" : level === "medium" ? "bg-amber-500" : "bg-red-500";
  const label = level === "strong" ? t("Strong password.") : level === "medium" ? t("Medium password.") : t("Weak password.");
  return (
    <div className="mt-1 space-y-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {label} {t("Must contain:")}
      </p>
      <ul className="space-y-1.5">
        {results.map((r) => (
          <li key={r.id} className="flex items-center gap-2 text-sm">
            {r.ok ? (
              <Check className="h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <X className="h-4 w-4 shrink-0 text-slate-400" />
            )}
            <span className={cn(r.ok ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400")}>
              {t(r.label)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Shown when `/api/public/register-industry-modules` fails or returns no active industry modules (non-numeric ids are omitted from the registration payload). */
const INDUSTRY_FALLBACK_OPTIONS: { id: string; label: string }[] = [
  { id: "fb-general", label: t("General business") },
  { id: "fb-retail", label: t("Retail & commerce") },
  { id: "fb-services", label: t("Professional services") },
  { id: "fb-field", label: t("Home & field services") },
  { id: "fb-health", label: t("Health & wellness") },
  { id: "fb-other", label: t("Other") },
];

function PillSingle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T | "";
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label={t("Choices")}>
      {options.map((opt) => {
        const selected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.id)}
            className={cn(
              "rounded-full border-2 px-4 py-2.5 text-left text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950",
              selected
                ? "border-primary bg-primary/10 text-foreground shadow-sm dark:bg-primary/20"
                : "border-border bg-background text-foreground hover:border-slate-300 hover:bg-muted/50 dark:hover:border-slate-600 dark:hover:bg-muted/30",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function PillMulti({
  options,
  values,
  onToggle,
}: {
  options: { id: string; label: string }[];
  values: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((opt) => {
        const selected = values.has(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onToggle(opt.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border-2 px-4 py-2.5 text-left text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950",
              selected
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-background text-foreground hover:border-slate-300 hover:bg-muted/50 dark:hover:border-slate-600 dark:hover:bg-muted/30",
            )}
          >
            {selected ? <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} aria-hidden /> : null}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function WizardHeroIllustration({ step }: { step: number }) {
  const bg = HERO_BACKGROUNDS[step % HERO_BACKGROUNDS.length];
  return (
    <div
      className="relative flex min-h-[40vh] flex-1 flex-col items-center justify-center overflow-hidden px-8 py-16 lg:min-h-svh"
      style={{ backgroundColor: bg }}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/25 to-transparent" aria-hidden />
      <svg
        viewBox="0 0 400 320"
        className="relative z-[1] h-auto w-full max-w-[min(100%,420px)] drop-shadow-xl"
        aria-hidden
      >
        <rect x="48" y="40" width="304" height="200" rx="16" fill="white" opacity="0.95" />
        <rect x="72" y="72" width="120" height="10" rx="4" fill="#e2e8f0" />
        <rect x="72" y="96" width="80" height="8" rx="3" fill="#cbd5e1" />
        <rect x="72" y="118" width="100" height="8" rx="3" fill="#cbd5e1" />
        <rect x="220" y="72" width="100" height="36" rx="8" fill="#dbeafe" />
        <rect x="220" y="120" width="100" height="36" rx="8" fill="#dcfce7" />
        <rect x="220" y="168" width="100" height="36" rx="8" fill="#ffedd5" />
        <circle cx="100" cy="200" r="18" fill="#94a3b8" />
        <circle cx="140" cy="200" r="18" fill="#cbd5e1" />
        <rect x="72" y="232" width="256" height="6" rx="2" fill="#e2e8f0" />
        <rect x="72" y="246" width="200" height="6" rx="2" fill="#f1f5f9" />
        {step >= 2 ? (
          <g opacity="0.9">
            <rect x="260" y="88" width="48" height="48" rx="10" fill="#6366f1" />
            <path d="M276 108 L284 116 L296 100" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" />
          </g>
        ) : null}
      </svg>
      <p className="relative z-[1] mt-8 max-w-sm text-center text-sm font-medium text-slate-800/80">
        {step === 0 && t("Tell us how you plan to use Paper Flight.")}
        {step === 1 && t("We’ll tailor tips based on your role.")}
        {step === 2 && t("Pick what you want to focus on first — you can enable more later.")}
        {step === 3 && t("Your organization and admin name appear on invoices and invites.")}
        {step === 4 && t("Secure sign-in for your company administrator account.")}
      </p>
    </div>
  );
}

export function CompanyRegisterWizard() {
  const router = useRouter();
  const brand = usePublicLoginBranding();
  const [step, setStep] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

  const [useCase, setUseCase] = useState<UseCaseId | "">("");
  const [role, setRole] = useState<RoleId | "">("");
  const [focusSet, setFocusSet] = useState<Set<string>>(() => new Set());
  const [industryPickList, setIndustryPickList] = useState<{ id: string; label: string }[]>([]);
  const [industryListReady, setIndustryListReady] = useState(false);
  const [partnerRef, setPartnerRef] = useState("");

  // Capture partner referral from ?partner=slug (URL) with a fallback to the pf_partner_ref cookie.
  useEffect(() => {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get("partner")?.trim();
      if (fromUrl) {
        setPartnerRef(fromUrl);
        return;
      }
      const cookie = document.cookie
        .split("; ")
        .find((c) => c.startsWith("pf_partner_ref="))
        ?.split("=")[1];
      if (cookie) setPartnerRef(decodeURIComponent(cookie).trim());
    } catch {
      /* no-op */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/register-industry-modules")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled || !json?.ok || !Array.isArray(json.items)) {
          if (!cancelled) setIndustryPickList([]);
          return;
        }
        const opts = json.items
          .filter((x: unknown): x is { id: string; label: string } => {
            if (!x || typeof x !== "object") return false;
            const o = x as { id?: unknown; label?: unknown };
            return typeof o.id === "string" && typeof o.label === "string";
          })
          .map((x: { id: string; label: string }) => ({ id: x.id.trim(), label: x.label.trim() }))
          .filter((x: { id: string; label: string }) => /^\d+$/.test(x.id) && x.label.length > 0);
        if (!cancelled) setIndustryPickList(opts);
      })
      .catch(() => {
        if (!cancelled) setIndustryPickList([]);
      })
      .finally(() => {
        if (!cancelled) setIndustryListReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const moduleStepOptions = useMemo(
    () => (industryPickList.length > 0 ? industryPickList : INDUSTRY_FALLBACK_OPTIONS),
    [industryPickList],
  );
  const [data, setData] = useState({
    company_name: "",
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    password: "",
    password_confirmation: "",
  });

  const toggleFocus = useCallback((id: string) => {
    setFocusSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const canContinue = useCallback(() => {
    switch (step) {
      case 0:
        return Boolean(useCase);
      case 1:
        return Boolean(role);
      case 2:
        return industryListReady && focusSet.size > 0;
      case 3:
        return (
          data.company_name.trim().length > 0 &&
          data.first_name.trim().length > 0 &&
          data.last_name.trim().length > 0
        );
      case 4:
        return true;
      default:
        return false;
    }
  }, [step, useCase, role, focusSet, data, industryListReady]);

  const goNext = () => {
    setErrors({});
    if (step === 3) {
      if (!canContinue()) {
        setErrors({ general: t("Please fill in all fields.") });
        return;
      }
    }
    if (step === 2 && (!industryListReady || focusSet.size === 0)) {
      setErrors({
        general: !industryListReady ? t("Loading industries…") : t("Select at least one industry."),
      });
      return;
    }
    if (step < 4) setStep((s) => s + 1);
  };

  const goBack = () => {
    setErrors({});
    if (step > 0) setStep((s) => s - 1);
  };

  const submit: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setErrors({});

    if (unformatPhone(data.phone).length !== 10) {
      setErrors({ phone: t("Enter a valid 10-digit phone number.") });
      setProcessing(false);
      return;
    }

    const res = await fetch("/api/auth/register-company", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        company_name: data.company_name,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        email: data.email,
        password: data.password,
        password_confirmation: data.password_confirmation,
        interested_modules: Array.from(focusSet).filter((id) => /^\d+$/.test(id)),
        ...(partnerRef ? { partner_slug: partnerRef } : {}),
      }),
    });

    const payload = (await res.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
      redirect?: string;
    } | null;

    if (!res.ok || !payload?.ok) {
      const msg = payload?.message ?? "Registration failed.";
      if (res.status === 409) {
        setErrors({ email: msg });
      } else {
        setErrors({ general: msg });
      }
      setProcessing(false);
      return;
    }

    router.push(payload.redirect ?? "/register?pending=1");
    router.refresh();
  };

  const inputClass =
    "h-11 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus-visible:border-primary focus-visible:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:placeholder:text-slate-500";

  const loginImage = brand.loginImage ? getImagePath(brand.loginImage) : null;

  return (
    <div className="flex min-h-svh flex-col bg-slate-50 dark:bg-slate-950 lg:flex-row">
      <div className="order-2 flex min-h-0 flex-1 flex-col lg:order-1 lg:max-w-[min(100%,560px)] lg:shrink-0 lg:border-r lg:border-slate-200/80 dark:lg:border-slate-800">
        <div className="flex min-h-svh flex-col px-6 py-8 sm:px-10 sm:py-10">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div className="min-w-0">
              {loginImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={loginImage} alt="" className="h-9 w-auto max-w-[200px] object-contain object-left" />
              ) : (
                <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">Paper Flight</span>
              )}
              <div className="mt-4 flex gap-1.5" aria-label={t("Progress")}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1.5 flex-1 max-w-10 rounded-full transition-colors",
                      i <= step ? "bg-primary" : "bg-slate-200 dark:bg-slate-800",
                    )}
                  />
                ))}
              </div>
            </div>
            <LanguageSwitcher />
          </div>

          <div className="flex flex-1 flex-col">
            {step === 0 && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-[1.65rem] sm:leading-tight">
                  {t("Hey there, what brings you here today?")}
                </h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("Choose one — you can refine this later in settings.")}</p>
                <div className="mt-8">
                  <PillSingle options={USE_CASE_OPTIONS} value={useCase} onChange={setUseCase} />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-[1.65rem] sm:leading-tight">
                  {t("What best describes your current role?")}
                </h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("Helps us show the most relevant setup paths.")}</p>
                <div className="mt-8">
                  <PillSingle options={ROLE_OPTIONS} value={role} onChange={setRole} />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-[1.65rem] sm:leading-tight">
                  {t("Which industry modules fit your company?")}
                </h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {t("Choose one or more industry templates from your platform catalog. You can adjust modules after approval.")}
                </p>
                {errors.general && step === 2 ? (
                  <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100">
                    {errors.general}
                  </div>
                ) : null}
                <div className="mt-8">
                  {!industryListReady ? (
                    <div className="flex flex-wrap gap-2.5" aria-busy="true" aria-label={t("Loading industry modules")}>
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-10 w-[7.5rem] animate-pulse rounded-full bg-slate-200 dark:bg-slate-800"
                        />
                      ))}
                    </div>
                  ) : (
                    <PillMulti options={moduleStepOptions} values={focusSet} onToggle={toggleFocus} />
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-[1.65rem] sm:leading-tight">
                  {t("Your organization")}
                </h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {t("Create your organization account. You will use your email to sign in as the company administrator.")}
                </p>
                {errors.general && (
                  <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/35 dark:text-red-100">
                    {errors.general}
                  </div>
                )}
                <div className="mt-8 grid gap-5">
                  <div className="grid gap-2">
                    <Label htmlFor="company_name" className="text-slate-800 dark:text-slate-200">
                      {t("Company name")} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="company_name"
                      value={data.company_name}
                      onChange={(e) => setData((d) => ({ ...d, company_name: e.target.value }))}
                      required
                      autoComplete="organization"
                      placeholder={t("Acme Inc.")}
                      className={inputClass}
                    />
                    <InputError message={errors.company_name} />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="first_name" className="text-slate-800 dark:text-slate-200">
                        {t("First name")} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="first_name"
                        value={data.first_name}
                        onChange={(e) => setData((d) => ({ ...d, first_name: e.target.value }))}
                        required
                        autoComplete="given-name"
                        placeholder={t("First name")}
                        className={inputClass}
                      />
                      <InputError message={errors.first_name} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="last_name" className="text-slate-800 dark:text-slate-200">
                        {t("Last name")} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="last_name"
                        value={data.last_name}
                        onChange={(e) => setData((d) => ({ ...d, last_name: e.target.value }))}
                        required
                        autoComplete="family-name"
                        placeholder={t("Last name")}
                        className={inputClass}
                      />
                      <InputError message={errors.last_name} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <form id="register-final-step" onSubmit={submit} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-[1.65rem] sm:leading-tight">
                  {t("Sign-in details")}
                </h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("Phone, email, and a secure password for your admin account.")}</p>
                {errors.general && (
                  <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/35 dark:text-red-100">
                    {errors.general}
                  </div>
                )}
                <div className="mt-8 grid gap-5">
                  <div className="grid gap-2">
                    <Label htmlFor="phone" className="text-slate-800 dark:text-slate-200">
                      {t("Phone number")} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      placeholder="(000) 000-0000"
                      value={data.phone}
                      onChange={(e) => setData((d) => ({ ...d, phone: formatPhone(e.target.value) }))}
                      required
                      className={inputClass}
                    />
                    <InputError message={errors.phone} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email" className="text-slate-800 dark:text-slate-200">
                      {t("Email Address")} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="email@example.com"
                      value={data.email}
                      onChange={(e) => setData((d) => ({ ...d, email: e.target.value }))}
                      required
                      className={inputClass}
                    />
                    <InputError message={errors.email} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password" className="text-slate-800 dark:text-slate-200">
                      {t("Password")} <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder={t("Password")}
                        value={data.password}
                        onChange={(e) => setData((d) => ({ ...d, password: e.target.value }))}
                        required
                        minLength={6}
                        className={cn(inputClass, "pr-11")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-slate-400 hover:text-slate-600"
                        aria-label={showPassword ? t("Hide password") : t("Show password")}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <InputError message={errors.password} />
                    <PasswordStrengthMeter value={data.password} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password_confirmation" className="text-slate-800 dark:text-slate-200">
                      {t("Confirm Password")} <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="password_confirmation"
                        type={showPassword2 ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder={t("Confirm password")}
                        value={data.password_confirmation}
                        onChange={(e) => setData((d) => ({ ...d, password_confirmation: e.target.value }))}
                        required
                        minLength={6}
                        className={cn(inputClass, "pr-11")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword2((s) => !s)}
                        className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-slate-400 hover:text-slate-600"
                        aria-label={showPassword2 ? t("Hide confirm password") : t("Show confirm password")}
                      >
                        {showPassword2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <InputError message={errors.password_confirmation} />
                  </div>
                </div>
              </form>
            )}
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-6 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-lg border-slate-300 bg-white px-5 font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={goBack}
              disabled={step === 0 || processing}
            >
              <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
              {t("Back")}
            </Button>
            {step < 4 ? (
              <Button
                type="button"
                className="h-11 rounded-lg px-6 font-semibold shadow-sm"
                onClick={goNext}
                disabled={!canContinue()}
              >
                {t("Continue")}
                <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
              </Button>
            ) : (
              <Button
                type="submit"
                form="register-final-step"
                className="h-11 rounded-lg px-6 font-semibold shadow-sm"
                disabled={processing}
                data-test="register-company-button"
              >
                {processing ? t("Loading...") : t("Create company account")}
              </Button>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            {t("Already have an account?")}{" "}
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              {t("Log in")}
            </Link>
          </p>
        </div>
      </div>

      <div className="order-1 min-h-[36vh] shrink-0 lg:order-2 lg:flex-1 lg:min-h-svh">
        <WizardHeroIllustration step={step} />
      </div>

      <CookieConsent settings={{}} />
    </div>
  );
}
