"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Check,
  CircleHelp,
  CreditCard,
  Globe,
  LayoutGrid,
  Loader2,
  Package,
  Palette,
  Receipt,
  Rocket,
  Store,
  Truck,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  getNextStorefrontSetupAction,
  groupStorefrontSetupStepsBySource,
} from "@/lib/storefront/setup-progress";
import type { StorefrontSetupOverviewPayload } from "@/lib/storefront/setup-status";
import type { StorefrontSetupStepSnapshot } from "@/lib/storefront/setup-types";
import { t } from "@/lib/admin-t";


type Props = {
  overview: StorefrontSetupOverviewPayload;
  /** Requires `storefront.settings.manage` (set by server). */
  canEditManualSteps?: boolean;
};

const STEP_ICONS: Partial<Record<StorefrontSetupStepSnapshot["id"], LucideIcon>> = {
  website_created: Store,
  domain_attached: Globe,
  theme_selected: Palette,
  homepage_published: LayoutGrid,
  first_product_created: Package,
  payment_configured: CreditCard,
  shipping_configured: Truck,
  taxes_configured: Receipt,
  customer_accounts_enabled: Users,
};

function stepIcon(step: StorefrontSetupStepSnapshot): LucideIcon {
  return STEP_ICONS[step.id] ?? Store;
}

function CircularProgress({ percent, size = 88 }: { percent: number; size?: number }) {
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-emerald-600 transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums">
        {percent}%
      </span>
    </div>
  );
}

function StorefrontStepCard({
  step,
  canMarkDone,
  loading,
  onToggle,
}: {
  step: StorefrontSetupStepSnapshot;
  canMarkDone: boolean;
  loading: boolean;
  onToggle: () => void;
}) {
  const Icon = stepIcon(step);

  return (
    <Card
      className={cn(
        "relative flex h-full flex-col transition-colors",
        step.completed
          ? "border-emerald-500/50 bg-emerald-500/[0.03] dark:border-emerald-500/40"
          : "hover:border-muted-foreground/30",
      )}
    >
      {step.completed ? (
        <Badge
          variant="secondary"
          className="absolute right-3 top-3 border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
        >
          {t("Done")}
        </Badge>
      ) : null}
      <CardHeader className="space-y-3 pb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted/40">
          {step.completed ? (
            <Check className="h-5 w-5 text-emerald-600" aria-hidden />
          ) : (
            <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
          )}
        </div>
        <div className="space-y-1 pr-14">
          <CardTitle className="text-base leading-snug">{step.label}</CardTitle>
          <CardDescription className="text-sm leading-relaxed">{step.description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="mt-auto flex flex-wrap items-center gap-3 pt-0">
        <Link
          href={step.href}
          className="inline-flex items-center text-sm font-medium text-primary hover:underline"
        >
          {step.completed ? t("View") : t("Open")}
          <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
        </Link>
        {canMarkDone ? (
          <Button
            type="button"
            variant={step.completed ? "secondary" : "default"}
            size="sm"
            disabled={loading}
            onClick={onToggle}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : step.completed ? (
              t("Mark not done")
            ) : (
              t("Mark done")
            )}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** Day 56 — guided onboarding styled to match the Launchpad command center. */
export function StorefrontOnboardingWizard({ overview, canEditManualSteps = false }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyStep, setBusyStep] = useState<string | null>(null);
  const [hideDone, setHideDone] = useState(false);

  const focusId = overview.focusWebsiteId;
  const next = getNextStorefrontSetupAction(overview);
  const grouped = useMemo(() => groupStorefrontSetupStepsBySource(overview), [overview]);

  const chipStatus = useMemo(() => {
    const done = (id: StorefrontSetupStepSnapshot["id"]) =>
      overview.steps.find((s) => s.id === id)?.completed ?? false;
    return {
      Website: done("website_created"),
      Domain: done("domain_attached"),
      Theme: done("theme_selected"),
      Homepage: done("homepage_published"),
      Products: done("first_product_created"),
    };
  }, [overview.steps]);

  const visibleDerived = hideDone ? grouped.derived.filter((s) => !s.completed) : grouped.derived;
  const visibleManual = hideDone ? grouped.manual.filter((s) => !s.completed) : grouped.manual;

  const setManualStep = (stepId: string, done: boolean) => {
    if (!focusId) return;
    setBusyStep(stepId);
    startTransition(() => {
      void (async () => {
        try {
          const res = await fetch("/api/storefront/setup/step", {
            method: "POST",
            headers: { "content-type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ websiteId: focusId, step: stepId, done }),
          });
          const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
          if (!res.ok || !data?.ok) {
            console.error(data?.message ?? "Update failed");
            return;
          }
          router.refresh();
        } finally {
          setBusyStep(null);
        }
      })();
    });
  };

  const onWebsiteChange = (id: string) => {
    const url = id ? `/storefront/onboarding?websiteId=${encodeURIComponent(id)}` : "/storefront/onboarding";
    router.push(url);
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-primary/5 text-primary">
            <Rocket className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("Storefront launch")}</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              {t("Work through the steps below to take your shop live. Steps update automatically from your store data.")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 sm:justify-end">
          {overview.websites.length > 1 ? (
            <select
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              value={focusId ?? ""}
              onChange={(e) => onWebsiteChange(e.target.value)}
            >
              {overview.websites.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.slug})
                </option>
              ))}
            </select>
          ) : null}
          <p className="text-sm font-medium tabular-nums text-muted-foreground">
            {overview.completedCount} / {overview.total} {t("complete")}
          </p>
          <div className="flex items-center gap-2">
            <Switch id="storefront-hide-done" checked={hideDone} onCheckedChange={setHideDone} />
            <Label htmlFor="storefront-hide-done" className="cursor-pointer text-sm font-normal">
              {t("Hide done")}
            </Label>
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <Card className="overflow-hidden border-emerald-500/35 bg-gradient-to-br from-emerald-500/[0.06] to-transparent">
          <CardContent className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <CircularProgress percent={overview.percent} />
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{t("Storefront setup")}</h2>
                  <Badge className="bg-emerald-600 hover:bg-emerald-600">{t("Recommended")}</Badge>
                </div>
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {t("Connect a domain, pick a theme, publish your homepage, and add products so customers can shop.")}
                </p>
                <ul className="flex flex-wrap gap-2 pt-1">
                  {Object.entries(chipStatus).map(([label, done]) => (
                    <li
                      key={label}
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-xs font-medium",
                        done
                          ? "border-emerald-600/40 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300"
                          : "border-border bg-background text-muted-foreground",
                      )}
                    >
                      {done ? "✓ " : ""}
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <Button asChild size="lg" className="shrink-0">
              <Link href={next?.href ?? "/storefront/websites"}>
                {t("Start setup")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col border-primary/25">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">{next ? t("Next action") : t("All set")}</CardTitle>
              {next ? <Badge variant="outline">{t("In progress")}</Badge> : (
                <Badge className="bg-emerald-600 hover:bg-emerald-600">{t("Complete")}</Badge>
              )}
            </div>
            <CardDescription>
              {next ? next.label : t("Every checklist item is complete. Your storefront is ready to go live.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto flex flex-wrap gap-2">
            {next ? (
              <>
                <Button asChild>
                  <Link href={next.href}>
                    {t("Go")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/storefront/overview">{t("Overview")}</Link>
                </Button>
              </>
            ) : (
              <Button variant="outline" asChild>
                <Link href="/storefront/overview">{t("View overview")}</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              {t("Store configuration")}
              <CircleHelp className="h-4 w-4 text-muted-foreground" aria-hidden />
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("Auto-detected from your store data as you set things up.")}
            </p>
          </div>
          <p className="text-sm font-medium tabular-nums text-muted-foreground">
            {grouped.derivedCompleted} / {grouped.derived.length} {t("complete")}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleDerived.map((step) => (
            <StorefrontStepCard
              key={step.id}
              step={step}
              canMarkDone={false}
              loading={false}
              onToggle={() => {}}
            />
          ))}
        </div>
        {visibleDerived.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("All store configuration steps are complete.")}</p>
        ) : null}
      </section>

      {grouped.manual.length > 0 ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">{t("Confirm when ready")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("Mark these done as you finish configuring each area.")}
              </p>
            </div>
            <p className="text-sm font-medium tabular-nums text-muted-foreground">
              {grouped.manualCompleted} / {grouped.manual.length} {t("complete")}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleManual.map((step) => (
              <StorefrontStepCard
                key={step.id}
                step={step}
                canMarkDone={Boolean(focusId) && canEditManualSteps}
                loading={pending && busyStep === step.id}
                onToggle={() => setManualStep(step.id, !step.completed)}
              />
            ))}
          </div>
          {visibleManual.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("All manual confirmations are complete or hidden.")}</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
