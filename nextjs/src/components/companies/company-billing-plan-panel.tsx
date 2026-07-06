"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Package } from "lucide-react";

import type { UserSubscriptionInfo } from "@/components/plans/subscription-setting";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "@/contexts/translation-context";
import { refreshSessionAuthCookies } from "@/lib/refresh-session-auth-client";
import { cn } from "@/lib/utils";

export type CompanyPlanDetailsPayload = {
  id: string;
  name: string | null;
  description: string | null;
  freePlan: boolean;
  packagePriceMonthly: string;
  packagePriceYearly: string;
  trialDays: number;
  numberOfUsers: number;
} | null;

function formatMoney(amountStr: string, currency: string) {
  const n = Number(String(amountStr ?? "0").replace(/,/g, ""));
  const safe = Number.isFinite(n) ? n : 0;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.length === 3 ? currency : "USD",
      maximumFractionDigits: 2,
    }).format(safe);
  } catch {
    return `$${safe.toFixed(2)}`;
  }
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function parseYmd(ymd: string): Date | null {
  const d = new Date(`${ymd}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function calendarDaysBetween(start: Date, end: Date): number {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / MS_PER_DAY));
}

function calendarDaysElapsedSince(start: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((today.getTime() - start.getTime()) / MS_PER_DAY));
}

type Props = {
  companyId: string;
  companyName: string;
  subscriptionInfo: UserSubscriptionInfo | null;
  planDetails: CompanyPlanDetailsPayload;
  defaultCurrency: string;
};

export function CompanyBillingPlanPanel({ companyId, companyName, subscriptionInfo, planDetails, defaultCurrency }: Props) {
  const { t: tr } = useTranslation();
  const router = useRouter();
  const [removing, setRemoving] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const currency = (defaultCurrency ?? "USD").trim() || "USD";
  const hasPlan = Boolean(subscriptionInfo?.activePlanId);
  const planTitle = planDetails?.name?.trim() || subscriptionInfo?.activePlanName?.trim() || tr("Plan");
  const expireRaw = subscriptionInfo?.planExpireDate ?? null;
  const startRaw = subscriptionInfo?.planStartDate ?? null;
  const expireDate = expireRaw ? parseYmd(expireRaw) : null;
  const startDate = startRaw ? parseYmd(startRaw) : null;
  const daysToExpire =
    expireDate && !Number.isNaN(expireDate.getTime())
      ? Math.max(0, Math.ceil((expireDate.getTime() - Date.now()) / MS_PER_DAY))
      : null;
  const expiringSoon = daysToExpire != null && daysToExpire >= 0 && daysToExpire <= 30;
  const totalPeriodDays =
    startDate && expireDate ? calendarDaysBetween(startDate, expireDate) : null;
  const daysElapsedInPeriod =
    startDate && totalPeriodDays != null
      ? Math.min(totalPeriodDays, calendarDaysElapsedSince(startDate))
      : null;
  const renewalProgress =
    totalPeriodDays != null && daysElapsedInPeriod != null
      ? Math.min(100, Math.round((daysElapsedInPeriod / totalPeriodDays) * 100))
      : null;

  const scrollToComparison = () => {
    window.dispatchEvent(new CustomEvent("subscription:show-all-plans"));
    const target =
      document.getElementById("company-plan-comparison") ??
      document.getElementById("subscription-plan-catalog");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const removePlan = async () => {
    setRemoving(true);
    try {
      const res = await fetch(`/api/companies/${encodeURIComponent(companyId)}/subscription`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ clear_subscription: true }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (!res.ok || !json?.ok) throw new Error(json?.message ?? "Failed to remove plan");
      setConfirmOpen(false);
      await refreshSessionAuthCookies();
      router.refresh();
    } catch {
      /* toast optional */
    } finally {
      setRemoving(false);
    }
  };

  const monthlyLabel = planDetails?.freePlan
    ? tr("Free")
    : formatMoney(planDetails?.packagePriceMonthly ?? "0", currency);
  const yearlyLabel = planDetails?.freePlan ? tr("Free") : formatMoney(planDetails?.packagePriceYearly ?? "0", currency);

  return (
    <>
      <Card className="overflow-hidden border-border/80 shadow-sm">
        <CardContent className="p-0">
          <div className="grid gap-0 lg:grid-cols-2">
            <div className="space-y-4 border-b p-6 lg:border-b-0 lg:border-r">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" aria-hidden />
                <p className="text-sm font-semibold tracking-tight text-foreground">{tr("Current plan")}</p>
              </div>

              {hasPlan && planDetails ? (
                <>
                  <div>
                    <p className="text-lg font-bold text-foreground">
                      {tr("Your current plan is")} <span className="text-primary">{planTitle}</span>
                    </p>
                    {planDetails.description ? (
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{planDetails.description}</p>
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">{tr("Standard plan for this organization.")}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="font-normal">
                      {planDetails.freePlan ? tr("Free") : `${monthlyLabel} ${tr("/ month")}`}
                    </Badge>
                    {!planDetails.freePlan ? (
                      <Badge variant="outline" className="border-primary/30 font-normal text-muted-foreground">
                        {yearlyLabel} {tr("/ year")}
                      </Badge>
                    ) : null}
                    {planDetails.trialDays > 0 ? (
                      <Badge className="bg-primary/15 text-primary hover:bg-primary/20">
                        {planDetails.trialDays}d {tr("trial")}
                      </Badge>
                    ) : null}
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {expireRaw ? (
                      <>
                        <span className="font-medium text-foreground">{tr("Active until")}</span> {expireRaw}
                      </>
                    ) : (
                      tr("No expiry date on file.")
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {planDetails.numberOfUsers === -1
                      ? tr("Unlimited users")
                      : `${planDetails.numberOfUsers} ${tr("users included")}`}
                  </p>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button type="button" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={scrollToComparison}>
                      {tr("Upgrade or change plan")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-destructive/40 text-destructive hover:bg-destructive/10"
                      onClick={() => setConfirmOpen(true)}
                    >
                      {tr("Remove plan")}
                    </Button>
                  </div>
                </>
              ) : hasPlan ? (
                <>
                  <div>
                    <p className="text-lg font-bold text-foreground">
                      {tr("Your current plan is")} <span className="text-primary">{planTitle}</span>
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{tr("Plan details are unavailable (plan may have been removed from the catalog).")}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {expireRaw ? (
                      <>
                        <span className="font-medium text-foreground">{tr("Active until")}</span> {expireRaw}
                      </>
                    ) : (
                      tr("No expiry date on file.")
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button type="button" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={scrollToComparison}>
                      {tr("Upgrade or change plan")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-destructive/40 text-destructive hover:bg-destructive/10"
                      onClick={() => setConfirmOpen(true)}
                    >
                      {tr("Remove plan")}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {tr("This organization has no subscription plan assigned yet.")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {companyName ? (
                      <>
                        {tr("Choose a plan for")} <span className="font-medium text-foreground">{companyName}</span>{" "}
                        {tr("below.")}
                      </>
                    ) : (
                      tr("Choose a plan below.")
                    )}
                  </p>
                  <Button type="button" onClick={scrollToComparison}>
                    {tr("Select a plan")}
                  </Button>
                </div>
              )}
            </div>

            <div
              className={cn(
                "flex flex-col justify-center p-6",
                expiringSoon ? "bg-amber-50 dark:bg-amber-950/25" : "bg-muted/30",
              )}
            >
              {expiringSoon ? (
                <>
                  <div className="flex gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
                    <div>
                      <p className="font-semibold text-amber-900 dark:text-amber-100">{tr("We need your attention")}</p>
                      <p className="mt-1 text-sm text-amber-800/90 dark:text-amber-200/90">
                        {tr("This plan expires soon. Renew or change the plan before the end date.")}
                      </p>
                    </div>
                  </div>
                  {daysToExpire != null ? (
                    <div className="mt-4 space-y-2">
                      {daysElapsedInPeriod != null && totalPeriodDays != null ? (
                        <>
                          <div className="flex items-baseline justify-between gap-2 text-sm text-amber-900 dark:text-amber-100">
                            <span className="font-medium">
                              {daysElapsedInPeriod} {tr("of")} {totalPeriodDays} {tr("days")}
                            </span>
                          </div>
                          {renewalProgress != null ? (
                            <Progress value={renewalProgress} className="h-2 bg-amber-200/80 dark:bg-amber-900/40" />
                          ) : null}
                        </>
                      ) : null}
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                        {daysToExpire === 0
                          ? tr("Expires today.")
                          : `${daysToExpire} ${tr("day(s) remaining")}`}
                      </p>
                    </div>
                  ) : null}
                </>
              ) : hasPlan ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">{tr("Plan status")}</p>
                  <p className="text-sm text-muted-foreground">
                    {expireRaw
                      ? tr("Subscription is active. You can change or remove the plan at any time.")
                      : tr("A plan is assigned. Set an expiry date when you assign or change plans from the catalog below.")}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {tr("Assigning a plan unlocks product limits for this company account.")}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tr("Remove subscription plan?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tr("This will clear the active plan and expiry date for this company. You can assign a new plan anytime.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>{tr("Cancel")}</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={removing}
              onClick={() => void removePlan()}
            >
              {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : tr("Remove plan")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
