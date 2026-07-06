"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  Check,
  CreditCard,
  Crown,
  Gift,
  LineChart,
  Pencil,
  Sparkles,
  Zap,
} from "lucide-react";

import type { TenantBillingPanelPageData } from "@/lib/settings-page-data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/lib/admin-t";


function formatMoney(amountStr: string, currency: string) {
  const n = Number(String(amountStr ?? "0").replace(/,/g, ""));
  const safe = Number.isFinite(n) ? n : 0;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.length === 3 ? currency : "USD",
      maximumFractionDigits: 0,
    }).format(safe);
  } catch {
    return `$${Math.round(safe)}`;
  }
}

function useCountdown(targetMs: number | null) {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    if (targetMs == null) return;
    const id = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, [targetMs]);
  if (targetMs == null) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  const diff = Math.max(0, targetMs - Date.now());
  const sec = Math.floor(diff / 1000);
  return {
    days: Math.floor(sec / 86400),
    hours: Math.floor((sec % 86400) / 3600),
    minutes: Math.floor((sec % 3600) / 60),
    seconds: sec % 60,
    expired: diff <= 0,
  };
}

function parseFeatureLines(description: string | null | undefined, fallbackSeats: number): string[] {
  const raw = (description ?? "").trim();
  if (raw) {
    const parts = raw
      .split(/\n|•|;/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length) return parts.slice(0, 5);
  }
  const seats = Math.max(0, fallbackSeats);
  return [
    seats ? t(`Up to ${seats} team seats`) : t("Team collaboration"),
    t("Cloud access to your workspace"),
    t("Standard support"),
  ];
}

function SegTimer({ label, value, padDays }: { label: string; value: number; padDays?: boolean }) {
  const display = padDays ? String(Math.max(0, value)) : String(Math.max(0, value)).padStart(2, "0");
  return (
    <div className="flex min-w-[3rem] flex-col items-center rounded-lg border border-sky-300 bg-white px-2.5 py-2.5 shadow-sm sm:min-w-[3.5rem] sm:px-3 sm:py-3">
      <span className="text-xl font-bold tabular-nums leading-none text-sky-600 sm:text-2xl">{display}</span>
      <span className="mt-1.5 text-[11px] font-medium text-slate-500">{label}</span>
    </div>
  );
}

type CountdownParts = { days: number; hours: number; minutes: number; seconds: number };

function StatusCountdownRow({
  cd,
  label,
  variant = "default",
}: {
  cd: CountdownParts;
  label: string;
  /** Trial banner: label + timer centered on small screens, right-aligned on large. */
  variant?: "default" | "trial";
}) {
  const trialVisual = variant === "trial";
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-2",
        trialVisual ? "w-full items-center lg:w-auto lg:items-end" : "sm:items-end",
      )}
    >
      <p
        className={cn(
          "text-xs font-medium text-slate-500",
          trialVisual ? "text-center lg:text-right" : "sm:text-right",
        )}
      >
        {label}
      </p>
      <div className={cn("flex flex-wrap items-end gap-1 sm:gap-1.5", trialVisual && "justify-center lg:justify-end")}>
        <SegTimer label={t("days")} value={cd.days} padDays />
        <span className="mb-6 select-none text-xl font-bold leading-none text-sky-500 sm:mb-7 sm:text-2xl" aria-hidden>
          :
        </span>
        <SegTimer label={t("hrs")} value={cd.hours} />
        <span className="mb-6 select-none text-xl font-bold leading-none text-sky-500 sm:mb-7 sm:text-2xl" aria-hidden>
          :
        </span>
        <SegTimer label={t("min")} value={cd.minutes} />
        <span className="mb-6 select-none text-xl font-bold leading-none text-sky-500 sm:mb-7 sm:text-2xl" aria-hidden>
          :
        </span>
        <SegTimer label={t("sec")} value={cd.seconds} />
      </div>
    </div>
  );
}

export function ProfileSubscriptionSection({
  billing,
  canManagePlans,
}: {
  billing: TenantBillingPanelPageData | null;
  canManagePlans: boolean;
}) {
  const [cancelStep, setCancelStep] = React.useState<null | "risk" | "feedback" | "offer" | "pause" | "done">(null);
  const [cancelReason, setCancelReason] = React.useState("other");
  const [cancelNotes, setCancelNotes] = React.useState("");
  const currency = (billing?.defaultCurrency ?? "USD").trim() || "USD";
  const info = billing?.subscriptionInfo;
  const plan = billing?.planDetails;
  const hasPlan = Boolean(info?.activePlanId && plan);
  const trialEndMs = info?.trialExpireDate ? new Date(`${info.trialExpireDate}T23:59:59`).getTime() : null;
  const showTrial = Boolean(hasPlan && !info?.isTrialDone && trialEndMs && !Number.isNaN(trialEndMs));

  const planEndParsed = info?.planExpireDate ? new Date(`${info.planExpireDate}T23:59:59`).getTime() : null;
  const planEndMs =
    planEndParsed != null && !Number.isNaN(planEndParsed) ? planEndParsed : null;
  /** Trial end takes precedence; otherwise count down to plan period end when it is still in the future (e.g. paid renewal, or dated free tier). */
  const countdownTargetMs = showTrial
    ? trialEndMs
    : planEndMs != null && planEndMs > Date.now()
      ? planEndMs
      : null;

  const cd = useCountdown(countdownTargetMs);

  const monthly = plan?.packagePriceMonthly ?? "0";
  const yearly = plan?.packagePriceYearly ?? "0";
  const mNum = Number(String(monthly).replace(/,/g, ""));
  const yNum = Number(String(yearly).replace(/,/g, ""));
  const annualSavings =
    Number.isFinite(mNum) && Number.isFinite(yNum) && mNum > 0 && yNum > 0 && mNum * 12 > yNum
      ? Math.round(mNum * 12 - yNum)
      : null;
  const annualPct =
    annualSavings != null && mNum * 12 > 0 ? Math.round((annualSavings / (mNum * 12)) * 100) : null;

  const planLabel = plan?.name?.trim() || info?.activePlanName?.trim() || t("Current plan");
  const priceLine =
    plan?.freePlan || !Number.isFinite(mNum) || mNum <= 0
      ? t("Included")
      : `${formatMoney(monthly, currency)}${t("/month")}`;

  const trialEndsLabel = info?.trialExpireDate
    ? new Date(`${info.trialExpireDate}T12:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  /** Banner line: "May 1" when same calendar year as today (matches trial promo UI). */
  const trialEndsBannerLabel = info?.trialExpireDate
    ? (() => {
        const d = new Date(`${info.trialExpireDate}T12:00:00`);
        if (Number.isNaN(d.getTime())) return "—";
        const opts: Intl.DateTimeFormatOptions =
          d.getFullYear() === new Date().getFullYear()
            ? { month: "short", day: "numeric" }
            : { month: "short", day: "numeric", year: "numeric" };
        return d.toLocaleDateString(undefined, opts);
      })()
    : "—";

  const firstChargeLabel = info?.planExpireDate
    ? new Date(`${info.planExpireDate}T12:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  const features = parseFeatureLines(plan?.description ?? null, plan?.numberOfUsers ?? 0);
  const pm = billing?.defaultPaymentMethod;

  const settingsLink = (
    <Button asChild variant="outline" size="sm" className="shrink-0 border-slate-300 bg-white">
      <Link href="/settings">{t("Open Settings")}</Link>
    </Button>
  );

  if (!billing || !hasPlan) {
    return (
      <section className="space-y-4 rounded-xl border border-border/80 bg-card p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">{t("Subscription Management")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("Manage your plan, billing cycle, and payment methods — all in one place.")}
          </p>
        </div>
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            {t("No company subscription is linked to this profile yet. When a plan is assigned, status and billing will appear here.")}
          </p>
          {canManagePlans ? (
            <div className="mt-4 flex justify-center">{settingsLink}</div>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 rounded-xl border border-border/80 bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">{t("Subscription Management")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {showTrial ? (
              <>
                {t("Manage your Pro subscription — all in one place")}{" "}
                <span className="inline-block" aria-hidden>
                  🔥
                </span>
              </>
            ) : (
              <>
                {t("Manage your")} <span className="font-medium text-foreground">{planLabel}</span>{" "}
                {t("subscription — all in one place.")}
              </>
            )}
          </p>
        </div>
        {canManagePlans ? settingsLink : null}
      </div>

      {showTrial ? (
        <div className="rounded-2xl border border-sky-200/90 bg-sky-50 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-md ring-2 ring-sky-400/30">
                <Sparkles className="h-6 w-6" strokeWidth={2} aria-hidden />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-lg font-bold tracking-tight text-sky-800 sm:text-xl">
                  {t("Free Trial Active")}{" "}
                  <span className="inline-block" aria-hidden>
                    🔥
                  </span>
                </p>
                <p className="text-sm leading-relaxed text-sky-900/70">
                  {t("Ends")} {trialEndsBannerLabel}
                  <span className="mx-1.5 text-sky-700/60" aria-hidden>
                    ·
                  </span>
                  {t("All Pro features unlocked")}
                </p>
              </div>
            </div>
            <StatusCountdownRow cd={cd} label={t("Trial ends in")} variant="trial" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm">
              <Crown className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-foreground">{t("Subscription active")}</p>
              <p className="text-sm text-muted-foreground">
                {planLabel}
                {info?.planExpireDate ? (
                  <>
                    {" "}
                    · {t("Renews or ends")}{" "}
                    {new Date(`${info.planExpireDate}T12:00:00`).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </>
                ) : null}
              </p>
            </div>
          </div>
          {countdownTargetMs != null && !showTrial ? <StatusCountdownRow cd={cd} label={t("Renews in")} /> : null}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-700">
            <CreditCard className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{t("Update card")}</p>
            <p className="truncate text-xs text-muted-foreground">
              {pm?.last4 ? `···· ${pm.last4}` : t("Add or change your saved card in Settings.")}
            </p>
          </div>
          {canManagePlans ? (
            <Button asChild variant="ghost" size="sm" className="shrink-0 text-sky-600 hover:text-sky-700">
              <Link href="/settings">{t("Manage")}</Link>
            </Button>
          ) : null}
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-amber-600">
            <Zap className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{t("Change plan")}</p>
            <p className="text-xs text-muted-foreground">{t("Switch billing cycle or compare packages.")}</p>
          </div>
          {canManagePlans ? (
            <Button asChild variant="ghost" size="sm" className="shrink-0 text-sky-600 hover:text-sky-700">
              <Link href="/settings">{t("Plans")}</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Crown className="h-4 w-4 text-amber-500" aria-hidden />
            {t("Current plan")}
          </div>
          <p className="mt-3 text-lg font-bold text-foreground">{planLabel}</p>
          <p className="text-lg font-semibold text-sky-600">{priceLine}</p>
          <ul className="mt-4 space-y-2">
            {features.map((line) => (
              <li key={line} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Calendar className="h-4 w-4 text-slate-600" aria-hidden />
            {t("Billing cycle")}
          </div>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="text-muted-foreground">{showTrial ? t("Trial period ends") : t("Status")}</dt>
              <dd className="font-medium text-foreground">
                {showTrial ? trialEndsLabel : t("Active")}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                {showTrial ? t("First charge after trial") : t("Next renewal / plan date")}
              </dt>
              <dd className="font-medium text-sky-600">{firstChargeLabel}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("Next amount")}</dt>
              <dd className="font-bold text-foreground">{priceLine}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CreditCard className="h-4 w-4 text-slate-600" aria-hidden />
            {t("Payment method")}
          </div>
          {pm ? (
            <>
              <p className="mt-3 font-bold text-foreground">{pm.displayBrand}</p>
              <p className="text-sm text-muted-foreground">{pm.last4 ? `···· ${pm.last4}` : pm.displayBrand}</p>
              {pm.expiresText ? <p className="mt-1 text-xs text-muted-foreground">{t("Expires")} {pm.expiresText}</p> : null}
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">{t("No saved card on file. Add one under Settings → Subscription.")}</p>
          )}
          {canManagePlans ? (
            <Button asChild variant="outline" size="sm" className="mt-4 w-full border-slate-300 sm:w-auto">
              <Link href="/settings" className="inline-flex items-center gap-2">
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                {t("Update card")}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {annualSavings != null && annualSavings > 0 && annualPct != null ? (
        <div className="flex flex-col gap-4 rounded-xl border border-orange-200 bg-orange-50/90 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white shadow-sm">
              <Gift className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-bold text-orange-950">
                {t("Save with annual billing")}
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-700">
                  {annualPct}% {t("off")}
                </span>
              </p>
              <p className="mt-1 text-sm text-orange-900/80">
                {t("Pay")} {formatMoney(yearly, currency)}
                {t("/year instead of")} {formatMoney(String(mNum * 12), currency)}
                {t(" when billed monthly.")}
              </p>
            </div>
          </div>
          {canManagePlans ? (
            <Button asChild className="shrink-0 bg-orange-500 font-semibold text-white hover:bg-orange-600">
              <Link href="/settings" className="inline-flex items-center gap-2">
                <Zap className="h-4 w-4" aria-hidden />
                {t("Compare yearly")}
              </Link>
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <LineChart className="h-4 w-4 text-slate-600" aria-hidden />
          {t("Your usage snapshot")}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t("High-level activity tied to your plan.")}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-4 text-center">
            <p className="text-2xl font-bold tabular-nums text-foreground">1</p>
            <p className="text-xs text-muted-foreground">{t("Active workspace")}</p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-4 text-center">
            <p className="text-2xl font-bold tabular-nums text-foreground">1</p>
            <p className="text-xs text-muted-foreground">{t("This month")}</p>
          </div>
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/80 px-4 py-4 text-center">
            <p className="text-2xl font-bold tabular-nums text-emerald-700">~15m</p>
            <p className="text-xs text-muted-foreground">{t("Time saved (est.)")}</p>
          </div>
        </div>
      </div>

      {hasPlan ? (
        <div className="flex justify-center border-t border-border/70 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setCancelStep("risk")}
          >
            {t("Cancel Subscription")}
          </Button>
        </div>
      ) : null}

      <Dialog open={cancelStep === "risk"} onOpenChange={(o) => !o && setCancelStep(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              {t("Access Ends Immediately")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
              <p className="font-semibold">{t("Since you're on a free trial or promotional period:")}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>{t("Your access will end now, not at period end.")}</li>
                <li>{t("You may lose unlimited usage immediately.")}</li>
                <li>{t("Branded reports and saved history may be unavailable.")}</li>
              </ul>
            </div>
            <p className="text-muted-foreground">
              {t("To keep access until trial/promo ends, remain subscribed.")}
            </p>
            <div className="space-y-2">
              <Button type="button" className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => setCancelStep(null)}>
                {t("Keep Pro - Stay Subscribed")}
              </Button>
              <Button type="button" variant="destructive" className="w-full" onClick={() => setCancelStep("feedback")}>
                {t("Cancel Now & Lose Access Immediately")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelStep === "feedback"} onOpenChange={(o) => !o && setCancelStep(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Help us improve")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">{t("Why are you canceling?")}</p>
            {[
              ["too_expensive", "Too expensive"],
              ["not_using", "Not using enough"],
              ["better_tool", "Found a better tool"],
              ["technical", "Technical issues"],
              ["other", "Other"],
            ].map(([id, label]) => (
              <label key={id} className="flex cursor-pointer items-center gap-2 rounded-md border p-2">
                <input
                  type="radio"
                  name="cancel-reason"
                  checked={cancelReason === id}
                  onChange={() => setCancelReason(id)}
                />
                <span>{t(label)}</span>
              </label>
            ))}
            <Textarea
              value={cancelNotes}
              onChange={(e) => setCancelNotes(e.target.value)}
              placeholder={t("Optional details")}
              rows={3}
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setCancelStep(null)}>
                {t("Keep Pro - I changed my mind")}
              </Button>
              <Button type="button" className="flex-1" onClick={() => setCancelStep("offer")}>
                {t("Submit & Continue")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelStep === "offer"} onOpenChange={(o) => !o && setCancelStep(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Before you go... how about a FREE extra month?")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              {t("Extend your Pro access for 1 more month with no charge.")}
            </p>
            <ul className="rounded-lg border bg-muted/30 p-3 text-muted-foreground">
              <li>{t("Unlimited usage")}</li>
              <li>{t("Custom branded reports")}</li>
              <li>{t("Saved history")}</li>
            </ul>
            <div className="space-y-2">
              <Button type="button" className="w-full" onClick={() => setCancelStep(null)}>
                {t("Yes! Give Me The Free Month")}
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => setCancelStep("pause")}>
                {t("No thanks, continue canceling")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelStep === "pause"} onOpenChange={(o) => !o && setCancelStep(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Need a break? Pause instead!")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              {t("Take 30 days off with no charges during the pause.")}
            </p>
            <ul className="rounded-lg border bg-muted/30 p-3 text-muted-foreground">
              <li>{t("Your account stays intact")}</li>
              <li>{t("No payments for 30 days")}</li>
              <li>{t("Auto-resumes after pause period")}</li>
            </ul>
            <div className="space-y-2">
              <Button type="button" className="w-full" onClick={() => setCancelStep(null)}>
                {t("Pause for 30 Days")}
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => setCancelStep("done")}>
                {t("No thanks, continue canceling")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelStep === "done"} onOpenChange={(o) => !o && setCancelStep(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Subscription Canceled")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              {t("We're sad to see you go. Access ended based on your current trial/promo status.")}
            </p>
            <div className="rounded-lg border bg-muted/30 p-3 text-muted-foreground">
              <p className="font-medium text-foreground">{t("Good to know:")}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>{t("You can resubscribe any time.")}</li>
                <li>{t("We'd love to have you back.")}</li>
              </ul>
            </div>
            <Button type="button" className="w-full" onClick={() => setCancelStep(null)}>
              {t("Got it")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
