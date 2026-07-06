"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PublicPricingAddOn, PublicPricingPlan } from "@/lib/public-pricing-data";

export type PublicPricingPageConfig = {
  title: string;
  subtitle: string;
  emptyMessage: string;
  defaultPricingPeriod: "monthly" | "yearly";
  showMonthlyYearlyToggle: boolean;
  isAuthenticated: boolean;
  enableRegistration: boolean;
};

function toMoney(x: string) {
  const n = Number(String(x ?? "0").replace(/,/g, ""));
  const safe = Number.isFinite(n) ? n : 0;
  return `$${safe.toFixed(0)}`;
}

function formatStorageBytes(storageLimitBytes: number) {
  const b = Number(storageLimitBytes ?? 0) || 0;
  if (b <= 0) return "Storage included";
  const gb = b / (1024 * 1024 * 1024);
  if (gb >= 1) return `${Math.round(gb)} GB storage`;
  const mb = Math.max(1, Math.round(b / (1024 * 1024)));
  return `${mb} MB storage`;
}

function hasModule(plan: PublicPricingPlan, moduleCode: string) {
  const mods = plan.modules.map((m) => m.toLowerCase());
  return mods.includes(moduleCode.toLowerCase());
}

function PeriodToggle({
  value,
  onChange,
}: {
  value: "monthly" | "yearly";
  onChange: (v: "monthly" | "yearly") => void;
}) {
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-1">
      {(["monthly", "yearly"] as const).map((period) => (
        <button
          key={period}
          type="button"
          onClick={() => onChange(period)}
          className={[
            "rounded-md px-4 py-2 text-sm font-medium capitalize transition-all",
            value === period ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900",
          ].join(" ")}
        >
          {period}
        </button>
      ))}
    </div>
  );
}

export function PublicPricingPage({
  plans,
  addOns,
  config,
}: {
  plans: PublicPricingPlan[];
  addOns: PublicPricingAddOn[];
  config: PublicPricingPageConfig;
}) {
  const [pricingPeriod, setPricingPeriod] = React.useState<"monthly" | "yearly">(config.defaultPricingPeriod);

  const mostPopularPlanId = React.useMemo(() => {
    if (plans.length === 0) return null;
    return plans.reduce((prev, cur) => (cur.ordersCount > prev.ordersCount ? cur : prev)).id;
  }, [plans]);

  const gridGapPx = 24;
  const featureColPx = 280;
  const planColPx = 260;
  const matrixMinWidth = featureColPx + plans.length * planColPx + Math.max(0, plans.length - 1) * gridGapPx;

  const ctaHref = (planId: string) =>
    config.isAuthenticated ? `/plans/${planId}/subscribe` : "/register";

  return (
    <div className="bg-slate-50/80">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Pricing</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">{config.title}</h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600 md:text-lg">{config.subtitle}</p>
          {config.showMonthlyYearlyToggle ? (
            <div className="mt-8 flex justify-center">
              <PeriodToggle value={pricingPeriod} onChange={setPricingPeriod} />
            </div>
          ) : null}
        </div>

        {plans.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <p className="text-slate-600">{config.emptyMessage}</p>
            {config.enableRegistration ? (
              <Button asChild className="mt-6">
                <Link href="/register">
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="mt-10 overflow-x-auto overflow-y-visible pb-4">
            <div className="space-y-6" style={{ minWidth: `${matrixMinWidth}px` }}>
              {/* Plan header cards */}
              <div
                className="grid items-stretch gap-6"
                style={{ gridTemplateColumns: `${featureColPx}px repeat(${plans.length}, ${planColPx}px)` }}
              >
                <div className="sticky left-0 z-20 flex flex-col justify-center rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <h2 className="text-center text-lg font-bold text-foreground">Features &amp; add-ons</h2>
                </div>

                {plans.map((plan) => {
                  const isPopular = plan.id === mostPopularPlanId && plans.length > 1;
                  const price = plan.freePlan
                    ? { main: "Free", sub: "forever" }
                    : pricingPeriod === "monthly"
                      ? { main: toMoney(plan.packagePriceMonthly), sub: "/mo" }
                      : { main: toMoney(plan.packagePriceYearly), sub: "/mo" };

                  return (
                    <div
                      key={plan.id}
                      className={cn(
                        "flex h-full flex-col rounded-2xl border-2 bg-card p-6 shadow-sm",
                        isPopular ? "border-brand ring-2 ring-brand/20" : "border-border",
                      )}
                    >
                      <div className="mb-4 flex h-[26px] items-center justify-center">
                        {isPopular ? (
                          <span className="rounded-full bg-ink px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-ink-foreground shadow-sm">
                            Most popular
                          </span>
                        ) : null}
                      </div>

                      <h3 className="text-center text-lg font-bold text-foreground">{plan.name ?? "Plan"}</h3>
                      {plan.description ? (
                        <p className="mt-2 text-center text-sm text-slate-500 line-clamp-3">{plan.description}</p>
                      ) : null}

                      <div className="mt-6 text-center">
                        <span className="text-3xl font-black text-slate-900">{price.main}</span>
                        {!plan.freePlan ? (
                          <span className="ml-1 text-lg font-medium text-slate-500">{price.sub}</span>
                        ) : null}
                      </div>

                      <ul className="mt-4 space-y-2 text-center text-sm text-slate-600">
                        <li>{plan.numberOfUsers === -1 ? "Unlimited users" : `${plan.numberOfUsers} users`}</li>
                        <li>{formatStorageBytes(plan.storageLimit)}</li>
                        {plan.trial && plan.trialDays > 0 ? (
                          <li className="font-medium text-emerald-600">{plan.trialDays}-day free trial</li>
                        ) : null}
                      </ul>

                      <div className="mt-auto pt-6">
                        <Button asChild className="w-full" size="sm">
                          <Link href={ctaHref(plan.id)}>
                            {config.isAuthenticated ? "Subscribe" : "Start free trial"}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Module comparison matrix */}
              {addOns.length > 0 ? (
                <div
                  className="grid items-stretch gap-6"
                  style={{ gridTemplateColumns: `${featureColPx}px repeat(${plans.length}, ${planColPx}px)` }}
                >
                  <div className="sticky left-0 z-20 rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <p className="mb-3 border-b border-slate-100 pb-3 text-center text-sm font-semibold text-slate-900">
                      Included modules
                    </p>
                    <ul className="space-y-3">
                      {addOns.map((addon) => (
                        <li key={addon.module} className="flex h-6 items-center justify-center text-sm text-slate-600">
                          {addon.alias}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {plans.map((plan) => {
                    const isPopular = plan.id === mostPopularPlanId && plans.length > 1;
                    const enabledCount = addOns.filter((a) => hasModule(plan, a.module)).length;
                    return (
                      <div
                        key={plan.id}
                        className={cn(
                          "rounded-2xl border bg-card p-6 shadow-sm",
                          isPopular ? "border-2 border-brand ring-2 ring-brand/20" : "border-border",
                        )}
                      >
                        <p className="mb-3 border-b border-slate-100 pb-3 text-center text-sm font-semibold text-slate-900">
                          {enabledCount}/{addOns.length} enabled
                        </p>
                        <ul className="space-y-3">
                          {addOns.map((addon) => {
                            const enabled = hasModule(plan, addon.module);
                            return (
                              <li key={addon.module} className="flex h-6 items-center justify-center">
                                {enabled ? (
                                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
                                    <Check className="h-3 w-3 text-emerald-600" />
                                  </span>
                                ) : (
                                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100">
                                    <X className="h-3 w-3 text-slate-400" />
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        )}

        <div className="mt-12 rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Need a custom setup?</h2>
          <p className="mt-2 text-slate-600">
            Contact our team for enterprise pricing, custom modules, and onboarding support.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild variant="outline">
              <Link href="/login">Sign in</Link>
            </Button>
            {config.enableRegistration ? (
              <Button asChild>
                <Link href="/register">
                  Register your company
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

