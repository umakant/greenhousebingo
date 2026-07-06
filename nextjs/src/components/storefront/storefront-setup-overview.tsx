"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, Check, Circle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getNextStorefrontSetupAction, groupStorefrontSetupStepsBySource } from "@/lib/storefront/setup-progress";
import type { StorefrontSetupOverviewPayload } from "@/lib/storefront/setup-status";
import { t } from "@/lib/admin-t";


type Props = {
  overview: StorefrontSetupOverviewPayload;
  /** Requires `storefront.settings.manage` (set by server). */
  canEditManualSteps?: boolean;
};

export function StorefrontSetupOverview({ overview, canEditManualSteps = false }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyStep, setBusyStep] = useState<string | null>(null);

  const next = getNextStorefrontSetupAction(overview);
  const grouped = groupStorefrontSetupStepsBySource(overview);
  const focusId = overview.focusWebsiteId;

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
    const url = id ? `/storefront/overview?websiteId=${encodeURIComponent(id)}` : "/storefront/overview";
    router.push(url);
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("Storefront setup")}</CardTitle>
          <CardDescription>
            {t("Track launch readiness for the Storefronts add-on. Derived steps update from your data; manual steps stay in sync until catalog and checkout APIs are fully wired.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {overview.websites.length > 1 ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">{t("Website")}</span>
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
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">{t("Overall progress")}</span>
              <span className="font-medium">
                {overview.completedCount}/{overview.total} ({overview.percent}%)
              </span>
            </div>
            <Progress value={overview.percent} className="h-2" />
            {focusId ? (
              <p className="text-xs text-muted-foreground">
                {t("Auto-detected")}: {grouped.derivedCompleted}/{grouped.derived.length} · {t("Confirmed")}:{" "}
                {grouped.manualCompleted}/{grouped.manual.length}
              </p>
            ) : null}
          </div>

          {next ? (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-primary">{t("Next action")}</p>
              <p className="mt-1 font-medium">{next.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{next.description}</p>
              <Button asChild className="mt-3" size="sm">
                <Link href={next.href}>
                  {t("Go")}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{t("All checklist items are complete.")}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("Checklist")}</CardTitle>
          <CardDescription>
            {!focusId
              ? t("Create a website to start tracking setup for a storefront.")
              : t("Manual items can be marked done as you finish configuration in each section.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border">
            {overview.steps.map((step) => {
              const isManual = step.source === "manual";
              const loading = pending && busyStep === step.id;
              return (
                <li key={step.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-3">
                    <span className="mt-0.5 shrink-0 text-muted-foreground">
                      {step.completed ? (
                        <Check className="h-5 w-5 text-emerald-600" aria-hidden />
                      ) : (
                        <Circle className="h-5 w-5" aria-hidden />
                      )}
                    </span>
                    <div>
                      <p className="font-medium">{step.label}</p>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {step.source === "derived" ? t("Auto-detected") : t("Merchant confirmed")}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 pl-8 sm:pl-0">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={step.href}>{t("Open")}</Link>
                    </Button>
                    {isManual && focusId && canEditManualSteps ? (
                      <Button
                        type="button"
                        variant={step.completed ? "secondary" : "default"}
                        size="sm"
                        disabled={loading}
                        onClick={() => setManualStep(step.id, !step.completed)}
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
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
