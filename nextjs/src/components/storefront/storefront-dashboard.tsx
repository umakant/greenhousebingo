"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart } from "@/components/charts";
import { BookOpen, Globe, FileText, LayoutTemplate, Palette, ShoppingBag, Activity, GitMerge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DASHBOARD_STAT_CARD_CLASS } from "@/components/dashboard/dashboard-stat-styles";
import { cn } from "@/lib/utils";
import { t } from "@/lib/admin-t";


type Payload = {
  counts: {
    websites: number;
    domains: number;
    pages: number;
    pagesPublished: number;
    themes: number;
    blogPosts: number;
    blogPostsPublished: number;
  };
  monthlyActivity: { month: string; events: number }[];
  recentEvents: Array<{
    id: string;
    eventType: string;
    message: string | null;
    createdAt: string;
    websiteId: string | null;
  }>;
};

type UnifiedTimelineRow = {
  at: string;
  kind: string;
  title: string;
  detail: string | null;
  href: string | null;
};

export function StorefrontDashboard() {
  const [data, setData] = React.useState<Payload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [timeline, setTimeline] = React.useState<UnifiedTimelineRow[]>([]);
  const [timelineLoading, setTimelineLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/storefront/dashboard", { credentials: "include" })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg =
            typeof (json as { message?: string })?.message === "string"
              ? (json as { message: string }).message
              : res.status === 403
                ? "You don’t have access to Storefront, or the add-on isn’t active for this company."
                : "Failed to load";
          throw new Error(msg);
        }
        return json;
      })
      .then((json) => {
        if (!json.ok) throw new Error(json.message ?? "Error");
        const raw = json.data as Partial<Payload> | undefined;
        const defaultCounts: Payload["counts"] = {
          websites: 0,
          domains: 0,
          pages: 0,
          pagesPublished: 0,
          themes: 0,
          blogPosts: 0,
          blogPostsPublished: 0,
        };
        setData({
          counts: { ...defaultCounts, ...raw?.counts },
          monthlyActivity: raw?.monthlyActivity ?? [],
          recentEvents: raw?.recentEvents ?? [],
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    setTimelineLoading(true);
    fetch("/api/storefront/unified-timeline?take=22", { credentials: "include" })
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as { ok?: boolean; data?: UnifiedTimelineRow[] };
        if (!res.ok || !json.ok) return;
        setTimeline(json.data ?? []);
      })
      .catch(() => setTimeline([]))
      .finally(() => setTimelineLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">{t("Loading...")}</div>
    );
  }
  if (error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
    );
  }

  const defaultCounts: Payload["counts"] = {
    websites: 0,
    domains: 0,
    pages: 0,
    pagesPublished: 0,
    themes: 0,
    blogPosts: 0,
    blogPostsPublished: 0,
  };
  const c = { ...defaultCounts, ...data?.counts };
  const monthly = data?.monthlyActivity ?? [];
  const recent = data?.recentEvents ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {t("Overview of your storefront tenant — websites, content, and recent activity.")}
        </p>
        <Button asChild variant="secondary" size="sm">
          <Link href="/storefront/overview">{t("Open Storefront setup")}</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Link href="/storefront/websites" className="block min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <Card className={cn(DASHBOARD_STAT_CARD_CLASS, "h-full cursor-pointer transition-shadow hover:shadow-md hover:opacity-95")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("Websites")}</CardTitle>
            <Globe className="h-8 w-8 text-muted-foreground opacity-80 dark:text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{c.websites}</div>
            <p className="mt-1 text-xs text-muted-foreground">{t("Storefront sites")}</p>
          </CardContent>
        </Card>
        </Link>
        <Link href="/storefront/websites" className="block min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <Card className={cn(DASHBOARD_STAT_CARD_CLASS, "h-full cursor-pointer transition-shadow hover:shadow-md hover:opacity-95")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("Domains")}</CardTitle>
            <ShoppingBag className="h-8 w-8 text-muted-foreground opacity-80 dark:text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{c.domains}</div>
            <p className="mt-1 text-xs text-muted-foreground">{t("Attached hostnames")}</p>
          </CardContent>
        </Card>
        </Link>
        <Link href="/storefront/pages" className="block min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <Card className={cn(DASHBOARD_STAT_CARD_CLASS, "h-full cursor-pointer transition-shadow hover:shadow-md hover:opacity-95")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("Pages")}</CardTitle>
            <FileText className="h-8 w-8 text-muted-foreground opacity-80 dark:text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{c.pages}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("Published")}: {c.pagesPublished}
            </p>
          </CardContent>
        </Card>
        </Link>
        <Link href="/storefront/blog" className="block min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <Card className={cn(DASHBOARD_STAT_CARD_CLASS, "h-full cursor-pointer transition-shadow hover:shadow-md hover:opacity-95")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("Blog posts")}</CardTitle>
            <BookOpen className="h-8 w-8 text-muted-foreground opacity-80 dark:text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{c.blogPosts}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("Published")}: {c.blogPostsPublished}
            </p>
          </CardContent>
        </Card>
        </Link>
        <Link href="/storefront/themes" className="block min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <Card className={cn(DASHBOARD_STAT_CARD_CLASS, "h-full cursor-pointer transition-shadow hover:shadow-md hover:opacity-95")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("Themes")}</CardTitle>
            <Palette className="h-8 w-8 text-muted-foreground opacity-80 dark:text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{c.themes}</div>
            <p className="mt-1 text-xs text-muted-foreground">{t("Tenant themes")}</p>
          </CardContent>
        </Card>
        </Link>
        <Card >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("Quick link")}</CardTitle>
            <LayoutTemplate className="h-8 w-8 text-muted-foreground opacity-80 dark:text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/storefront/pages">{t("Manage pages")}</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/storefront/blog">{t("Manage blog")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="min-h-[320px]">
          <CardHeader>
            <CardTitle className="text-base">{t("Storefront activity (6 months)")}</CardTitle>
          </CardHeader>
          <CardContent>
            {monthly.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("No audit events in range.")}</p>
            ) : (
              <LineChart
                data={monthly.map((m) => ({ month: m.month, events: m.events }))}
                height={260}
                showTooltip
                showGrid
                lines={[{ dataKey: "events", color: "#8b5cf6", name: t("Events") }]}
                xAxisKey="month"
                showLegend
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">{t("Recent audit events")}</CardTitle>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-80 divide-y overflow-y-auto">
              {recent.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">{t("No events yet.")}</p>
              ) : (
                recent.map((ev) => (
                  <div key={ev.id} className="flex flex-col gap-0.5 px-4 py-3 hover:bg-muted/30">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-xs text-primary">{ev.eventType}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {new Date(ev.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {ev.message ? <p className="text-sm text-muted-foreground line-clamp-2">{ev.message}</p> : null}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold">{t("Unified timeline")}</CardTitle>
          <GitMerge className="h-5 w-5 text-muted-foreground" aria-hidden />
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 divide-y overflow-y-auto">
            {timelineLoading ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">{t("Loading…")}</p>
            ) : timeline.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">{t("No merged activity yet.")}</p>
            ) : (
              timeline.map((row, i) => (
                <div key={`${row.at}-${row.kind}-${i}`} className="flex flex-col gap-1 px-4 py-3 hover:bg-muted/30">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{row.kind}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{new Date(row.at).toLocaleString()}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {row.href ? (
                      <Button asChild variant="link" className="h-auto p-0 text-base font-semibold leading-snug">
                        <Link href={row.href}>{row.title}</Link>
                      </Button>
                    ) : (
                      <span className="font-medium leading-snug">{row.title}</span>
                    )}
                  </div>
                  {row.detail ? <p className="text-sm text-muted-foreground line-clamp-2">{row.detail}</p> : null}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
