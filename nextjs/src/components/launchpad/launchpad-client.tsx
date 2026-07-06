"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpen,
  Building2,
  Calculator,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock,
  GraduationCap,
  Headphones,
  LayoutGrid,
  LifeBuoy,
  Lightbulb,
  Lock,
  Mail,
  MessageCircle,
  Monitor,
  Package,
  Palette,
  Receipt,
  Rocket,
  Sparkles,
  Store,
  Target,
  UserPlus,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useAppSettingsOptional } from "@/contexts/app-settings-context";
import { resolveBrandPrimaryHex } from "@/lib/brand-theme";
import { cn } from "@/lib/utils";
import { DonutWithLegend, scoreDonutSlices } from "@/components/compliance/compliance-donut-chart";
import {
  LAUNCHPAD_HOME_SKIPPED_EVENT,
  isLaunchpadHomeSkipped,
  setLaunchpadHomeSkipped,
  type LaunchpadHomeSkippedEventDetail,
} from "@/lib/launchpad/launchpad-home-prefs";
import { flattenGroupSteps } from "@/lib/launchpad/launchpad-layout";
import { fetchDashboardSidebarTenantId } from "@/lib/launchpad/resolve-post-login-destination";
import type {
  LaunchpadGroupSnapshot,
  LaunchpadOverviewPayload,
  LaunchpadStepSnapshot,
} from "@/lib/launchpad/launchpad-types";
import { t } from "@/lib/admin-t";

type Props = {
  initialOverview: LaunchpadOverviewPayload;
  /** SSR brand color so the progress donut matches theme on first paint. */
  brandPrimaryHex?: string;
};

const STEP_ICONS: Partial<Record<LaunchpadStepSnapshot["id"], LucideIcon>> = {
  verify_email: Mail,
  brand_settings: Palette,
  company_profile: Building2,
  email_delivery: Mail,
  invite_team: UserPlus,
  notification_templates: Mail,
  payment_setup: Wallet,
  accounting_setup: Calculator,
  project_first: LayoutGrid,
  crm_first_lead: Users,
  hrm_first_employee: Users,
  lms_first_course: GraduationCap,
  expense_setup: Receipt,
  expense_workspace: Receipt,
  support_setup: LifeBuoy,
  storefront_launch: Store,
  pos_catalog: Package,
  recruitment_jobs: Users,
  appointment_setup: Monitor,
  whatsapp_setup: MessageCircle,
  form_builder_form: Sparkles,
  review_setup: CheckCircle2,
  go_live: Rocket,
  affiliate_partners: Users,
};

function stepIcon(step: LaunchpadStepSnapshot): LucideIcon {
  return STEP_ICONS[step.id] ?? Sparkles;
}

function actionLabel(step: LaunchpadStepSnapshot): string {
  if (step.completed) return t("Completed");
  if (step.id === "go_live") return t("Go live now");
  if (step.id === "review_setup") return t("Review");
  if (step.id === "invite_team") return t("Invite");
  if (step.id === "verify_email") return t("Verify");
  if (step.section === "module") return t("Set up now");
  return t("Continue");
}

function isStepLocked(step: LaunchpadStepSnapshot, overview: LaunchpadOverviewPayload): boolean {
  if (step.completed) return false;
  if (step.groupId === "operations") {
    const companySetup = overview.groups.find((g) => g.id === "company-setup");
    if (!companySetup) return false;
    const requiredIncomplete = flattenGroupSteps(companySetup).some((s) => s.required && !s.completed);
    return requiredIncomplete;
  }
  if (step.groupId === "go-live") {
    return overview.coreCompleted < overview.coreTotal;
  }
  return false;
}

function LaunchpadStepCard({
  step,
  locked,
}: {
  step: LaunchpadStepSnapshot;
  locked: boolean;
}) {
  const Icon = stepIcon(step);
  const label = actionLabel(step);

  return (
    <Card
      className={cn(
        "flex h-full flex-col border shadow-sm transition-shadow hover:shadow-md",
        step.completed && "border-primary/30 bg-primary/[0.04] dark:bg-primary/10",
        locked && "opacity-70",
      )}
    >
      <CardContent className="flex flex-1 flex-col gap-4 p-5">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-full",
            step.completed
              ? "bg-primary/10 text-primary dark:bg-primary/20"
              : locked
                ? "bg-muted text-muted-foreground"
                : "bg-primary/10 text-primary",
          )}
        >
          {step.completed ? (
            <Check className="h-5 w-5" aria-hidden />
          ) : locked ? (
            <Lock className="h-4 w-4" aria-hidden />
          ) : (
            <Icon className="h-5 w-5" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <h3 className="font-semibold leading-snug">{step.label}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
        </div>
        <div className="mt-auto">
          {locked ? (
            <Button variant="outline" size="sm" className="w-full cursor-not-allowed text-muted-foreground" disabled>
              <Lock className="mr-2 h-3.5 w-3.5" />
              {t("Locked")}
            </Button>
          ) : step.completed ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full border-primary/40 text-primary hover:bg-primary/5"
              asChild
            >
              <Link href={step.href}>
                <Check className="mr-2 h-3.5 w-3.5" />
                {label}
              </Link>
            </Button>
          ) : (
            <Button size="sm" className="w-full" asChild>
              <Link href={step.href}>
                {label}
                <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LaunchpadSection({
  index,
  group,
  overview,
  hideDone,
}: {
  index: number;
  group: LaunchpadGroupSnapshot;
  overview: LaunchpadOverviewPayload;
  hideDone: boolean;
}) {
  const allSteps = flattenGroupSteps(group);
  const steps = allSteps.filter((s) => !hideDone || !s.completed);
  const isComplete = group.total > 0 && group.completedCount === group.total;
  const [open, setOpen] = useState(() => !isComplete);
  const wasComplete = useRef(isComplete);

  useEffect(() => {
    if (!wasComplete.current && isComplete) {
      setOpen(false);
    } else if (wasComplete.current && !isComplete) {
      setOpen(true);
    }
    wasComplete.current = isComplete;
  }, [isComplete]);

  if (steps.length === 0 && hideDone && isComplete) {
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <section className="rounded-xl border bg-card">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/40"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
                  <Check className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">
                    {index}. {group.title}
                  </h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">{t("All steps complete")}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="secondary" className="tabular-nums font-medium">
                  {group.completedCount} / {group.total} {t("Complete")}
                </Badge>
                <ChevronDown
                  className={cn("h-5 w-5 text-muted-foreground transition-transform", open && "rotate-180")}
                  aria-hidden
                />
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t px-5 pb-5 pt-4">
              <p className="text-sm text-muted-foreground">{t("Completed steps are hidden. Turn off Hide done to review them.")}</p>
            </div>
          </CollapsibleContent>
        </section>
      </Collapsible>
    );
  }

  if (steps.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <section
        className={cn(
          "rounded-xl border bg-card transition-colors",
          isComplete && !open && "border-primary/25 bg-primary/[0.04] dark:bg-primary/10",
        )}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/40",
              open && "border-b",
            )}
          >
            <div className="flex min-w-0 items-start gap-3">
              {isComplete ? (
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
                  <Check className="h-4 w-4" aria-hidden />
                </span>
              ) : (
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted/50 text-sm font-semibold tabular-nums text-muted-foreground">
                  {index}
                </span>
              )}
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">
                  {index}. {group.title}
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">{group.description}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge
                variant={isComplete ? "outline" : "secondary"}
                className={cn(
                  "tabular-nums font-medium",
                  isComplete && "border-primary/40 bg-primary/5 text-primary",
                )}
              >
                {group.completedCount} / {group.total} {t("Complete")}
              </Badge>
              <ChevronDown
                className={cn("h-5 w-5 text-muted-foreground transition-transform", open && "rotate-180")}
                aria-hidden
              />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {steps.map((step) => (
              <LaunchpadStepCard key={step.id} step={step} locked={isStepLocked(step, overview)} />
            ))}
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

function SidebarWhatsNext({ overview }: { overview: LaunchpadOverviewPayload }) {
  const next = overview.nextStep;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-4 w-4 text-primary" />
          {t("What's next?")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {next ? (
          <>
            <p className="text-sm font-medium">{next.label}</p>
            <p className="text-sm text-muted-foreground">{next.description}</p>
            <Button className="w-full" asChild>
              <Link href={next.href}>
                {t("Continue setup")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t("All setup steps are complete.")}</p>
        )}
      </CardContent>
    </Card>
  );
}

function SidebarRecentActivity({ overview }: { overview: LaunchpadOverviewPayload }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4 text-muted-foreground" />
          {t("Recent activity")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {overview.recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("Activity will appear here as your team gets started.")}</p>
        ) : (
          <ul className="space-y-3">
            {overview.recentActivity.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-2 text-sm">
                <span className="leading-snug">{item.message}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{item.timeLabel}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function SidebarTips() {
  const tips = [
    { icon: BookOpen, label: t("Documentation"), href: "/helpdesk-tickets" },
    { icon: Lightbulb, label: t("Best practices"), href: "/settings" },
    { icon: Headphones, label: t("Contact support"), href: "/support-ticket" },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CircleHelp className="h-4 w-4 text-muted-foreground" />
          {t("Setup tips & resources")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1">
          {tips.map((tip) => (
            <li key={tip.label}>
              <Link
                href={tip.href}
                className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <tip.icon className="h-4 w-4 shrink-0" />
                {tip.label}
                <ChevronRight className="ml-auto h-4 w-4 opacity-50" />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function SidebarPlan({ overview }: { overview: LaunchpadOverviewPayload }) {
  const plan = overview.plan;
  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="h-4 w-4 text-primary" />
          {t("Your plan")}
        </CardTitle>
        {plan ? (
          <div className="flex items-center gap-2 pt-1">
            <span className="font-semibold">{plan.name}</span>
            <Badge variant={plan.status === "active" ? "default" : "secondary"}>
              {plan.status === "trial" ? t("Trial") : plan.status === "active" ? t("Active") : t("Inactive")}
            </Badge>
          </div>
        ) : (
          <CardDescription>{t("No active subscription plan")}</CardDescription>
        )}
      </CardHeader>
      {plan ? (
        <CardContent className="space-y-4">
          <ul className="space-y-2">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                {feature}
              </li>
            ))}
          </ul>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/settings?tab=subscription-plans">{t("Manage plan")}</Link>
          </Button>
        </CardContent>
      ) : (
        <CardContent>
          <Button className="w-full" asChild>
            <Link href="/settings?tab=subscription-plans">{t("View plans")}</Link>
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

function SidebarChecklist({ overview }: { overview: LaunchpadOverviewPayload }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4 text-muted-foreground" />
          {t("Go live checklist")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2.5">
          {overview.groups.map((group) => {
            const done = group.total > 0 && group.completedCount === group.total;
            const partial = group.completedCount > 0 && !done;
            return (
              <li key={group.id} className="flex items-center justify-between gap-2 text-sm">
                <span className={cn(done && "text-muted-foreground")}>{group.title}</span>
                <span
                  className={cn(
                    "tabular-nums font-medium",
                    done || partial ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {group.completedCount}/{group.total}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

export function LaunchpadClient({ initialOverview, brandPrimaryHex }: Props) {
  const overview = initialOverview;
  const appSettings = useAppSettingsOptional();
  const [hideDone, setHideDone] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [hideLaunchpadHome, setHideLaunchpadHome] = useState(false);

  const progressDonutColor = useMemo(() => {
    if (appSettings?.settings) {
      return resolveBrandPrimaryHex(
        appSettings.settings.themeColor ?? "green",
        appSettings.settings.customColor ?? "",
      );
    }
    return brandPrimaryHex;
  }, [appSettings?.settings, brandPrimaryHex]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const tid = await fetchDashboardSidebarTenantId();
      if (cancelled) return;
      setTenantId(tid);
      if (tid) setHideLaunchpadHome(isLaunchpadHomeSkipped(tid));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!tenantId) return;
    const onPref = (e: Event) => {
      const ce = e as CustomEvent<LaunchpadHomeSkippedEventDetail>;
      if (ce.detail?.tenantId !== tenantId) return;
      setHideLaunchpadHome(ce.detail.skipped);
    };
    window.addEventListener(LAUNCHPAD_HOME_SKIPPED_EVENT, onPref);
    return () => window.removeEventListener(LAUNCHPAD_HOME_SKIPPED_EVENT, onPref);
  }, [tenantId]);

  const onHideLaunchpadHomeChange = (checked: boolean) => {
    setHideLaunchpadHome(checked);
    if (tenantId) setLaunchpadHomeSkipped(tenantId, checked);
  };

  const onboardingStatus = useMemo(() => {
    if (overview.percent >= 100) return t("Complete");
    if (overview.percent >= 50) return t("In progress");
    return t("Getting started");
  }, [overview.percent]);

  const visibleGroups = overview.groups;

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Progress header row */}
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">{t("Overall progress")}</p>
            <p className="text-sm tabular-nums text-muted-foreground">
              {overview.completedCount} {t("of")} {overview.total} {t("complete")}
            </p>
          </div>
          <Progress value={overview.percent} className="h-2.5" />
        </div>
        {overview.goLiveTarget ? (
          <div className="flex shrink-0 items-center gap-2 rounded-lg border bg-muted/40 px-4 py-2.5">
            <Calendar className="h-4 w-4 text-primary" aria-hidden />
            <div>
              <p className="text-xs text-muted-foreground">{t("Go live target")}</p>
              <p className="text-sm font-semibold tabular-nums">{overview.goLiveTarget}</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Hero banner */}
      <Card className="overflow-hidden border-primary/25 bg-gradient-to-br from-primary/[0.07] via-background to-background">
        <CardContent className="p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="shrink-0" role="img" aria-label={`${overview.percent}% complete`}>
              <DonutWithLegend
                data={scoreDonutSlices(overview.percent, progressDonutColor)}
                centerLabel={`${overview.percent}%`}
                size={148}
                hideLegend
              />
            </div>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary">
                  {t("Company onboarding")} ({onboardingStatus})
                </Badge>
              </div>
              <h2 className="text-xl font-semibold tracking-tight">
                {overview.companyName} — {t("Launchpad")}
              </h2>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                {t(
                  "Your command center. Set up your company, invite your team, and go live with Paper Flight.",
                )}
              </p>
              {overview.nextStep ? (
                <Button asChild className="mt-1">
                  <Link href={overview.nextStep.href}>
                    {t("Continue setup")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-primary/5 text-primary">
            <Rocket className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-lg font-semibold">{t("Setup roadmap")}</h1>
            <p className="text-sm text-muted-foreground">{t("Complete each section to go live.")}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2">
            <Switch
              id="launchpad-hide-home"
              checked={hideLaunchpadHome}
              onCheckedChange={onHideLaunchpadHomeChange}
              disabled={!tenantId}
            />
            <Label htmlFor="launchpad-hide-home" className="cursor-pointer text-sm font-normal">
              {t("Hide Launchpad")}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="launchpad-hide-done" checked={hideDone} onCheckedChange={setHideDone} />
            <Label htmlFor="launchpad-hide-done" className="cursor-pointer text-sm font-normal">
              {t("Hide done")}
            </Label>
          </div>
        </div>
      </div>

      {/* Main two-column layout */}
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-10">
          {visibleGroups.map((group, idx) => (
            <LaunchpadSection
              key={group.id}
              index={idx + 1}
              group={group}
              overview={overview}
              hideDone={hideDone}
            />
          ))}

          {overview.percent < 100 ? (
            <Card className="border-primary/30 bg-primary/[0.04]">
              <CardContent className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-lg font-semibold">{t("Almost there!")}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("Complete the remaining steps to unlock your full workspace.")}
                  </p>
                </div>
                <Button size="lg" asChild>
                  <Link href={overview.nextStep?.href ?? "/settings"}>
                    {t("Continue setup")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <SidebarWhatsNext overview={overview} />
          <SidebarRecentActivity overview={overview} />
          <SidebarTips />
          <SidebarPlan overview={overview} />
          <SidebarChecklist overview={overview} />
        </aside>
      </div>
    </div>
  );
}
