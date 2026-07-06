"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { t } from "@/lib/admin-t";


type Plan = {
  id: string;
  name: string | null;
  description: string | null;
  numberOfUsers: number;
  storageLimit: number;
  freePlan: boolean;
  customPlan: boolean;
  trial: boolean;
  trialDays: number;
  packagePriceMonthly: string;
  packagePriceYearly: string;
  pricePerUserMonthly: string;
  pricePerUserYearly: string;
  pricePerStorageMonthly: string;
  pricePerStorageYearly: string;
  modules: unknown;
};

function toMoney(x: string) {
  const n = Number(String(x ?? "0").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function formatStorageBytes(bytes: number) {
  if (bytes <= 0) return "0 GB";
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb} GB`;
}

export default function SubscribePlanView() {
  const params = useParams();
  const router = useRouter();
  const planId = typeof params?.id === "string" ? params.id : null;
  const [plan, setPlan] = React.useState<Plan | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [pricingPeriod, setPricingPeriod] = React.useState<"monthly" | "yearly">("monthly");
  const [submitting, setSubmitting] = React.useState(false);
  const [subscribeError, setSubscribeError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!planId) {
      setLoading(false);
      setError("Invalid plan");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/plans/${planId}`, { credentials: "include", cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (!data?.ok || !data?.plan) {
          setError(data?.message || "Plan not found");
          setPlan(null);
          return;
        }
        setPlan(data.plan);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || "Failed to load plan");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [planId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">{t("Loading plan...")}</p>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{error || t("Plan not found")}</p>
        <Button asChild variant="outline">
          <Link href="/plans">{t("Back to Plans")}</Link>
        </Button>
      </div>
    );
  }

  const price =
    pricingPeriod === "monthly"
      ? toMoney(plan.packagePriceMonthly)
      : toMoney(plan.packagePriceYearly);
  const periodLabel = pricingPeriod === "monthly" ? t("Monthly") : t("Yearly");

  const handleSubscribe = async () => {
    if (!planId) return;
    setSubscribeError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/plans/${planId}/subscribe`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pricingPeriod }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; redirect?: string };
      if (!res.ok || data?.ok === false) {
        setSubscribeError(data?.message || t("Subscription failed"));
        return;
      }
      await fetch("/api/auth/refresh-permissions", { method: "POST", credentials: "include" });
      const redirectTo = data?.redirect || "/plans";
      router.push(redirectTo);
    } catch (e) {
      setSubscribeError(e instanceof Error ? e.message : t("Subscription failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex justify-center">
        <div className="bg-muted p-1 rounded-lg flex">
          <button
            type="button"
            onClick={() => setPricingPeriod("monthly")}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              pricingPeriod === "monthly"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("Monthly")}
          </button>
          <button
            type="button"
            onClick={() => setPricingPeriod("yearly")}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              pricingPeriod === "yearly"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("Yearly")}
          </button>
        </div>
      </div>

      <Card className="p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold">{plan.name ?? t("Plan")}</h2>
          {plan.description ? (
            <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
          ) : null}
        </div>

        <div className="flex items-baseline gap-2">
          {plan.freePlan ? (
            <span className="text-3xl font-black text-emerald-600">{t("Free")}</span>
          ) : (
            <>
              <span className="text-3xl font-black">
                ${price.toFixed(2)}
                <span className="text-lg font-normal text-muted-foreground">/{periodLabel.toLowerCase()}</span>
              </span>
            </>
          )}
        </div>

        <ul className="space-y-2">
          <li className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            {plan.numberOfUsers === -1
              ? t("Unlimited users")
              : `${plan.numberOfUsers} ${t("users")}`}
          </li>
          <li className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            {formatStorageBytes(plan.storageLimit)} {t("storage")}
          </li>
          {plan.trial && plan.trialDays > 0 && (
            <li className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              {plan.trialDays}d {t("trial")}
            </li>
          )}
        </ul>

        {subscribeError && (
          <p className="text-sm text-destructive">{subscribeError}</p>
        )}
        <div className="pt-4 flex flex-col sm:flex-row gap-3">
          <Button asChild className="flex-1" variant="outline" disabled={submitting}>
            <Link href="/plans">{t("Back to Plans")}</Link>
          </Button>
          <Button
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            onClick={handleSubscribe}
            disabled={submitting}
          >
            {submitting
              ? t("Submitting...")
              : plan.freePlan
                ? t("Subscribe to Plan")
                : `${t("Subscribe to Plan")} - $${price.toFixed(2)}`}
          </Button>
        </div>
      </Card>
    </div>
  );
}
