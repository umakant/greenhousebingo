"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BarChart3, Filter, Loader2, Plug, RefreshCw, Search } from "lucide-react";

import { parseJsonResponse } from "@/lib/safe-fetch-json";

import {
  StorefrontAdminErrorAlert,
  StorefrontAdminMainCard,
  StorefrontAdminPageShell,
} from "@/components/storefront/storefront-admin-page-layout";
import NoRecordsFound from "@/components/no-records-found";
import type { WebsiteRow } from "@/components/storefront/storefront-websites-settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { t } from "@/lib/admin-t";

const ORG_STORAGE_KEY = "pf_sf_merchant_org_id";

type OrgContext = {
  isSuperadmin: boolean;
  organizations: { id: string; name: string }[];
  defaultOrganizationId: string | null;
};

type LogRow = {
  id: string;
  websiteId: string | null;
  eventType: string;
  message: string | null;
  severity: string;
  resourceType: string | null;
  resourceId: string | null;
  createdAt: string;
};

type ActivityTab = "all" | "content" | "theme" | "catalog" | "commerce";

/** Day 53 — integration-style streams (forms, customers, tickets, external integrations). */
const INTEGRATION_EVENT_PREFIXES = [
  "storefront.form",
  "storefront.customer",
  "storefront.order",
  "storefront.ticket",
  "integration.",
] as const;

const ACTIVITY_PREFIXES: Record<Exclude<ActivityTab, "all">, string[]> = {
  content: ["storefront.page", "storefront.navigation"],
  theme: ["storefront.theme"],
  catalog: ["storefront.product", "storefront.collection"],
  commerce: ["storefront.order", "storefront.discount"],
};

function severityVariant(s: string): "default" | "secondary" | "destructive" | "outline" {
  if (s === "error") return "destructive";
  if (s === "warning") return "secondary";
  return "outline";
}

type KpiPayload = {
  range: { from: string; to: string };
  revenue: number;
  orderCount: number;
  averageOrderValue: number;
  newCustomers: number;
  openSupportTickets: number;
  topProducts: Array<{ productId: string | null; name: string; slug: string | null; quantitySold: number }>;
};

type MerchantSearchGroup = { module: string; items: Array<{ label: string; href: string; meta?: string }> };

function formatWhen(iso: string) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return iso;
  }
}

export function StorefrontAnalyticsAdmin() {
  const [orgCtx, setOrgCtx] = useState<OrgContext | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [websites, setWebsites] = useState<WebsiteRow[]>([]);
  const [mainTab, setMainTab] = useState<"activity" | "kpi" | "integration">("activity");
  const [activityTab, setActivityTab] = useState<ActivityTab>("all");
  const [websiteFilter, setWebsiteFilter] = useState<string>("__all__");
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");

  const [kpiLoading, setKpiLoading] = useState(false);
  const [kpiError, setKpiError] = useState<string | null>(null);
  const [kpiData, setKpiData] = useState<KpiPayload | null>(null);
  const [kpiFrom, setKpiFrom] = useState("");
  const [kpiTo, setKpiTo] = useState("");

  const [msQuery, setMsQuery] = useState("");
  const [msLoading, setMsLoading] = useState(false);
  const [msGroups, setMsGroups] = useState<MerchantSearchGroup[]>([]);

  const buildApiUrl = useCallback(
    (pathname: string, extraSearch?: Record<string, string | undefined>) => {
      const u = new URL(pathname, typeof window !== "undefined" ? window.location.origin : "http://localhost");
      if (orgCtx?.isSuperadmin && selectedOrgId) {
        u.searchParams.set("organizationId", selectedOrgId);
      }
      if (extraSearch) {
        for (const [k, v] of Object.entries(extraSearch)) {
          if (v != null && v !== "") u.searchParams.set(k, v);
        }
      }
      return u.pathname + u.search;
    },
    [orgCtx?.isSuperadmin, selectedOrgId],
  );

  const orgReady = orgCtx != null && (!orgCtx.isSuperadmin || !!selectedOrgId);

  const handleSearch = () => {
    setQ(searchInput.trim());
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setOrgLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/storefront/organization-context", { credentials: "include" });
        const json = await parseJsonResponse<OrgContext & { ok?: boolean; message?: string }>(res);
        if (!res.ok || !json.ok) throw new Error(json.message ?? "Failed to load organization context");
        if (cancelled) return;
        const c: OrgContext = {
          isSuperadmin: json.isSuperadmin,
          organizations: json.organizations ?? [],
          defaultOrganizationId: json.defaultOrganizationId ?? null,
        };
        setOrgCtx(c);
        let orgId: string | null = null;
        if (c.isSuperadmin) {
          const stored = typeof window !== "undefined" ? window.localStorage.getItem(ORG_STORAGE_KEY) : null;
          const ids = new Set(c.organizations.map((o) => o.id));
          if (stored && ids.has(stored)) orgId = stored;
          else orgId = c.defaultOrganizationId;
          if (orgId) {
            try {
              window.localStorage.setItem(ORG_STORAGE_KEY, orgId);
            } catch {
              /* ignore */
            }
          }
        } else {
          orgId = c.defaultOrganizationId;
        }
        setSelectedOrgId(orgId);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setOrgLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadWebsites = useCallback(async () => {
    if (!orgReady) return;
    try {
      const res = await fetch(buildApiUrl("/api/storefront/websites"), { credentials: "same-origin" });
      const data = await parseJsonResponse<{ ok?: boolean; data?: WebsiteRow[] }>(res);
      if (res.ok && data.ok) setWebsites(data.data ?? []);
    } catch {
      setWebsites([]);
    }
  }, [buildApiUrl, orgReady]);

  const loadLogs = useCallback(async () => {
    if (!orgReady) return;
    setLoading(true);
    setError(null);
    try {
      const base = buildApiUrl("/api/storefront/event-logs");
      const u = new URL(base, typeof window !== "undefined" ? window.location.origin : "http://localhost");
      if (websiteFilter && websiteFilter !== "__all__") u.searchParams.set("websiteId", websiteFilter);
      if (mainTab === "integration") {
        u.searchParams.set("eventPrefixes", [...INTEGRATION_EVENT_PREFIXES].join(","));
      } else if (activityTab !== "all") {
        const pfx = ACTIVITY_PREFIXES[activityTab];
        if (pfx.length) u.searchParams.set("eventPrefixes", pfx.join(","));
      }
      if (q.trim()) u.searchParams.set("q", q.trim());
      const res = await fetch(u.pathname + u.search, { credentials: "same-origin" });
      const data = await parseJsonResponse<{ ok?: boolean; data?: LogRow[]; message?: string }>(res);
      if (!res.ok || !data.ok) throw new Error(data.message ?? t("Failed to load events"));
      setLogs(
        (data.data ?? []).map((r) => ({
          ...r,
          createdAt: String(r.createdAt),
        })),
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [activityTab, buildApiUrl, mainTab, orgReady, q, websiteFilter]);

  const loadKpi = useCallback(async () => {
    if (!orgReady) return;
    setKpiLoading(true);
    setKpiError(null);
    try {
      const base = buildApiUrl("/api/storefront/analytics-summary");
      const u = new URL(base, typeof window !== "undefined" ? window.location.origin : "http://localhost");
      if (kpiFrom.trim()) u.searchParams.set("from", kpiFrom.trim());
      if (kpiTo.trim()) u.searchParams.set("to", kpiTo.trim());
      const res = await fetch(u.pathname + u.search, { credentials: "same-origin" });
      const data = await parseJsonResponse<{ ok?: boolean; data?: KpiPayload; message?: string }>(res);
      if (!res.ok || !data.ok) throw new Error(data.message ?? t("Failed to load KPIs"));
      setKpiData(data.data ?? null);
    } catch (e: unknown) {
      setKpiError(e instanceof Error ? e.message : "Error");
      setKpiData(null);
    } finally {
      setKpiLoading(false);
    }
  }, [buildApiUrl, kpiFrom, kpiTo, orgReady]);

  const runMerchantSearch = useCallback(async () => {
    const qq = msQuery.trim();
    if (!orgReady || qq.length < 2) {
      setMsGroups([]);
      return;
    }
    setMsLoading(true);
    try {
      const base = buildApiUrl("/api/storefront/merchant-search");
      const u = new URL(base, typeof window !== "undefined" ? window.location.origin : "http://localhost");
      u.searchParams.set("q", qq);
      const res = await fetch(u.pathname + u.search, { credentials: "same-origin" });
      const data = await parseJsonResponse<{
        ok?: boolean;
        data?: { groups?: MerchantSearchGroup[] };
        message?: string;
      }>(res);
      if (!res.ok || !data.ok) throw new Error(data.message ?? t("Search failed"));
      setMsGroups(data.data?.groups ?? []);
    } catch {
      setMsGroups([]);
    } finally {
      setMsLoading(false);
    }
  }, [buildApiUrl, msQuery, orgReady]);

  useEffect(() => {
    void loadWebsites();
  }, [loadWebsites]);

  useEffect(() => {
    if (mainTab === "kpi") return;
    void loadLogs();
  }, [loadLogs, mainTab]);

  useEffect(() => {
    if (mainTab !== "kpi") return;
    void loadKpi();
  }, [loadKpi, mainTab]);

  const hasFilters =
    !!q.trim() || (mainTab === "activity" && activityTab !== "all") || websiteFilter !== "__all__";
  const activeFilterCount =
    (mainTab === "activity" && activityTab !== "all" ? 1 : 0) + (websiteFilter !== "__all__" ? 1 : 0);

  if (orgLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">{t("Loading…")}</span>
      </div>
    );
  }

  function formatUsd(n: number) {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
    } catch {
      return n.toFixed(2);
    }
  }

  return (
    <StorefrontAdminPageShell>
      <StorefrontAdminErrorAlert>{mainTab === "kpi" ? kpiError : error}</StorefrontAdminErrorAlert>

      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "activity" | "kpi" | "integration")} className="space-y-4">
        <TabsList className="grid h-auto w-full max-w-xl grid-cols-3 gap-1 sm:flex sm:h-10">
          <TabsTrigger value="activity" className="text-xs sm:text-sm">
            {t("Activity")}
          </TabsTrigger>
          <TabsTrigger value="kpi" className="text-xs sm:text-sm">
            {t("Commerce KPIs")}
          </TabsTrigger>
          <TabsTrigger value="integration" className="text-xs sm:text-sm">
            <Plug className="mr-1 hidden h-3.5 w-3.5 sm:inline" aria-hidden />
            {t("Integration")}
          </TabsTrigger>
        </TabsList>

        <Card className="border-border/80 shadow-sm">
          <CardContent className="space-y-3 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
              {t("Merchant search")}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("Quick jump to catalog, orders, customers, pages, themes, and websites (tenant-wide).")}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <SearchInput
                value={msQuery}
                onChange={setMsQuery}
                onSearch={() => void runMerchantSearch()}
                placeholder={t("Type at least 2 characters")}
                buttonLabel={t("Search")}
              />
            </div>
            {msLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("Searching…")}
              </div>
            ) : msGroups.length > 0 ? (
              <div className="space-y-3 rounded-md border border-border/60 bg-muted/20 p-3 text-sm">
                {msGroups.map((g) => (
                  <div key={g.module}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.module}</p>
                    <ul className="mt-1 space-y-1">
                      {g.items.map((it, idx) => (
                        <li key={`${g.module}-${idx}`}>
                          <Link href={it.href} className="text-primary underline-offset-4 hover:underline">
                            {it.label}
                          </Link>
                          {it.meta ? <span className="text-muted-foreground"> — {it.meta}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
          </div>
            ) : msQuery.trim().length >= 2 ? (
              <p className="text-xs text-muted-foreground">{t("No matches.")}</p>
            ) : null}
          </CardContent>
        </Card>

        <TabsContent value="activity" className="mt-0 space-y-4 outline-none">
          <ActivityIntegrationAnalyticsBody
            mode="activity"
            websites={websites}
            websitesLoading={loading}
            logs={logs}
            orgCtx={orgCtx}
            selectedOrgId={selectedOrgId}
            setSelectedOrgId={setSelectedOrgId}
            websiteFilter={websiteFilter}
            setWebsiteFilter={setWebsiteFilter}
            searchInput={searchInput}
            setSearchInput={setSearchInput}
            handleSearch={handleSearch}
            activityTab={activityTab}
            setActivityTab={setActivityTab}
            activeFilterCount={activeFilterCount}
            loadWebsites={loadWebsites}
            loadLogs={loadLogs}
            loadKpi={loadKpi}
            hasFilters={hasFilters}
            q={q}
            setQ={setQ}
            ORG_STORAGE_KEY={ORG_STORAGE_KEY}
          />
        </TabsContent>

        <TabsContent value="integration" className="mt-0 space-y-4 outline-none">
          <ActivityIntegrationAnalyticsBody
            mode="integration"
            websites={websites}
            websitesLoading={loading}
            logs={logs}
            orgCtx={orgCtx}
            selectedOrgId={selectedOrgId}
            setSelectedOrgId={setSelectedOrgId}
            websiteFilter={websiteFilter}
            setWebsiteFilter={setWebsiteFilter}
            searchInput={searchInput}
            setSearchInput={setSearchInput}
            handleSearch={handleSearch}
            activityTab={activityTab}
            setActivityTab={setActivityTab}
            activeFilterCount={activeFilterCount}
            loadWebsites={loadWebsites}
            loadLogs={loadLogs}
            loadKpi={loadKpi}
            hasFilters={hasFilters}
            q={q}
            setQ={setQ}
            ORG_STORAGE_KEY={ORG_STORAGE_KEY}
          />
        </TabsContent>

        <TabsContent value="kpi" className="mt-0 space-y-4 outline-none">
          {orgCtx?.isSuperadmin ? (
            <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border/80 bg-muted/30 p-4">
              <div className="min-w-[200px] max-w-xs space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">{t("Company")}</Label>
              <Select
                value={selectedOrgId ?? "__none__"}
                onValueChange={(v) => {
                  if (v === "__none__") return;
                  setSelectedOrgId(v);
                  try {
                    window.localStorage.setItem(ORG_STORAGE_KEY, v);
                  } catch {
                    /* ignore */
                  }
                  void loadWebsites();
                    void loadKpi();
                }}
              >
                <SelectTrigger className="h-11 bg-background">
                  <SelectValue placeholder={t("Select company")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" disabled>
                    {t("Select company…")}
                  </SelectItem>
                  {orgCtx.organizations.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t("From")}</Label>
              <Input type="date" value={kpiFrom} onChange={(e) => setKpiFrom(e.target.value)} className="h-9 w-[160px]" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t("To")}</Label>
              <Input type="date" value={kpiTo} onChange={(e) => setKpiTo(e.target.value)} className="h-9 w-[160px]" />
            </div>
            <Button type="button" size="sm" onClick={() => void loadKpi()} disabled={kpiLoading}>
              {kpiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Apply range")}
            </Button>
        </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="border-border/80 shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("Paid revenue")}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {kpiLoading && !kpiData ? "—" : formatUsd(kpiData?.revenue ?? 0)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{t("Storefront orders in range")}</p>
              </CardContent>
            </Card>
            <Card className="border-border/80 shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("Orders")}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{kpiLoading && !kpiData ? "—" : kpiData?.orderCount ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="border-border/80 shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("Average order value")}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {kpiLoading && !kpiData ? "—" : formatUsd(kpiData?.averageOrderValue ?? 0)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/80 shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("New customers")}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{kpiLoading && !kpiData ? "—" : kpiData?.newCustomers ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="border-border/80 shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("Open support tickets")}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{kpiLoading && !kpiData ? "—" : kpiData?.openSupportTickets ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="border-border/80 shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("Reporting window")}</p>
                <p className="mt-1 text-xs leading-snug text-muted-foreground">
                  {kpiData ? `${formatWhen(kpiData.range.from)} → ${formatWhen(kpiData.range.to)}` : t("Last 30 days (default)")}
                </p>
              </CardContent>
            </Card>
      </div>

          <StorefrontAdminMainCard contentClassName="p-0 sm:p-0">
            <div className="border-b px-4 py-4 sm:px-6">
              <h3 className="text-sm font-semibold">{t("Top products by quantity")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t("Paid storefront orders in the selected range.")}</p>
            </div>
            <div className="p-4 sm:p-6">
              {kpiLoading && !kpiData ? (
                <div className="flex justify-center py-12 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : !kpiData?.topProducts?.length ? (
                <p className="text-sm text-muted-foreground">{t("No product line data in this range.")}</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {kpiData.topProducts.map((p, i) => (
                    <li key={p.productId ?? `idx-${i}`} className="flex justify-between gap-2 border-b border-border/40 pb-2 last:border-0">
                      <span>{p.name}</span>
                      <span className="tabular-nums text-muted-foreground">{p.quantitySold}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </StorefrontAdminMainCard>
        </TabsContent>
      </Tabs>
    </StorefrontAdminPageShell>
  );
}

type ActivityBodyProps = {
  mode: "activity" | "integration";
  websites: WebsiteRow[];
  websitesLoading: boolean;
  logs: LogRow[];
  orgCtx: OrgContext | null;
  selectedOrgId: string | null;
  setSelectedOrgId: (id: string | null) => void;
  websiteFilter: string;
  setWebsiteFilter: (v: string) => void;
  searchInput: string;
  setSearchInput: (v: string) => void;
  handleSearch: () => void;
  activityTab: ActivityTab;
  setActivityTab: (v: ActivityTab) => void;
  activeFilterCount: number;
  loadWebsites: () => Promise<void>;
  loadLogs: () => Promise<void>;
  loadKpi: () => Promise<void>;
  hasFilters: boolean;
  q: string;
  setQ: (v: string) => void;
  ORG_STORAGE_KEY: string;
};

function ActivityIntegrationAnalyticsBody({
  mode,
  websites,
  websitesLoading: loading,
  logs,
  orgCtx,
  selectedOrgId,
  setSelectedOrgId,
  websiteFilter,
  setWebsiteFilter,
  searchInput,
  setSearchInput,
  handleSearch,
  activityTab,
  setActivityTab,
  activeFilterCount,
  loadWebsites,
  loadLogs,
  loadKpi,
  hasFilters,
  q,
  setQ,
  ORG_STORAGE_KEY,
}: ActivityBodyProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/80 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("Events in view")}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{loading && logs.length === 0 ? "—" : logs.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("Up to 200 most recent rows")}</p>
          </CardContent>
        </Card>
        <Card className="border-border/80 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("Websites")}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{websites.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("Filter the feed by store")}</p>
          </CardContent>
        </Card>
        <Card className="border-border/80 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("Data source")}</p>
            <p className="mt-1 text-sm font-medium leading-snug">{t("Tenant event log")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("Also mirrored in SaaS audit as storefront_event.")}</p>
          </CardContent>
        </Card>
      </div>

      <StorefrontAdminMainCard contentClassName="p-0 sm:p-0">
        <div className="space-y-0">
          <div className="border-b px-4 py-4 sm:px-6">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted/40 text-muted-foreground">
                {mode === "integration" ? (
                  <Plug className="h-4 w-4" aria-hidden />
                ) : (
                  <BarChart3 className="h-4 w-4" aria-hidden />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold tracking-tight">
                  {mode === "integration" ? t("Integration & CRM signals") : t("Store activity")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {mode === "integration"
                    ? t(
                        "Events tagged for storefront forms, customers, orders, tickets, and integration.* namespaces — useful when debugging connectors and buyer-facing flows.",
                      )
                    : t(
                        "Chronological trail of storefront changes and commerce signals. Use filters and search to narrow the list — similar to Shopify’s store timeline views.",
                      )}
                </p>
              </div>
            </div>
          </div>

          <div className="border-b bg-muted/30 p-4 sm:p-6">
            {orgCtx?.isSuperadmin ? (
              <div className="mb-4 flex flex-wrap items-end gap-4 border-b border-border/60 pb-4">
                <div className="min-w-[200px] max-w-xs space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">{t("Company")}</Label>
                  <Select
                    value={selectedOrgId ?? "__none__"}
                    onValueChange={(v) => {
                      if (v === "__none__") return;
                      setSelectedOrgId(v);
                      try {
                        window.localStorage.setItem(ORG_STORAGE_KEY, v);
                      } catch {
                        /* ignore */
                      }
                      setWebsiteFilter("__all__");
                      void loadWebsites();
                      void loadLogs();
                      void loadKpi();
                    }}
                  >
                    <SelectTrigger className="h-11 bg-background">
                      <SelectValue placeholder={t("Select company")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" disabled>
                        {t("Select company…")}
                      </SelectItem>
                      {orgCtx.organizations.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
              <div className="min-w-0 w-full max-w-full lg:max-w-md lg:flex-1">
                <SearchInput
                  value={searchInput}
                  onChange={setSearchInput}
                  onSearch={handleSearch}
                  placeholder={t("Search events and messages")}
                  buttonLabel={t("Search")}
                />
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
                <div className="w-full space-y-2 sm:w-auto sm:min-w-[200px]">
                  <Label className="text-xs font-medium text-muted-foreground sm:sr-only">{t("Website")}</Label>
                <Select value={websiteFilter} onValueChange={setWebsiteFilter} disabled={websites.length === 0}>
                    <SelectTrigger className="h-9 bg-background">
                    <SelectValue placeholder={t("All websites")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t("All websites")}</SelectItem>
                    {websites.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
                {mode === "activity" ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline" size="default" className="relative">
                        <Filter className="mr-2 h-4 w-4" />
                        {t("Filters")}
                        {activeFilterCount > 0 ? (
                          <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                            {activeFilterCount}
                          </span>
                        ) : null}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 p-2">
                      <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{t("Activity")}</DropdownMenuLabel>
                      <DropdownMenuRadioGroup value={activityTab} onValueChange={(v) => setActivityTab(v as ActivityTab)}>
                        <DropdownMenuRadioItem value="all">{t("All")}</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="content">{t("Online store pages")}</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="theme">{t("Themes")}</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="catalog">{t("Products")}</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="commerce">{t("Orders")}</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 shrink-0"
                  onClick={() => void loadLogs()}
                  disabled={loading}
                  aria-label={t("Refresh")}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-6">
            {loading && logs.length === 0 ? (
              <div className="flex justify-center py-16 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : logs.length === 0 && hasFilters ? (
              <NoRecordsFound
                icon={BarChart3}
                title={t("No events match your filters.")}
                description={t("Try different filters, website, or search text.")}
                hasFilters
                onClearFilters={() => {
                  setActivityTab("all");
                  setWebsiteFilter("__all__");
                  setSearchInput("");
                  setQ("");
                }}
              />
            ) : logs.length === 0 ? (
              <div className="overflow-x-auto rounded-md border border-border/60">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-left font-medium text-muted-foreground">{t("Time")}</th>
                      <th className="hidden p-3 text-left font-medium text-muted-foreground lg:table-cell">{t("Severity")}</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">{t("Event")}</th>
                      <th className="hidden p-3 text-left font-medium text-muted-foreground xl:table-cell">{t("Resource")}</th>
                      <th className="hidden p-3 text-left font-medium text-muted-foreground md:table-cell">{t("Details")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                        {t("No storefront events recorded yet.")}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border border-border/60">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="w-[180px] p-3 text-left font-medium text-muted-foreground">{t("Time")}</th>
                      <th className="hidden p-3 text-left font-medium text-muted-foreground lg:table-cell">{t("Severity")}</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">{t("Event")}</th>
                      <th className="hidden p-3 text-left font-medium text-muted-foreground xl:table-cell">{t("Resource")}</th>
                      <th className="hidden p-3 text-left font-medium text-muted-foreground md:table-cell">{t("Details")}</th>
                    </tr>
                  </thead>
                  <tbody>
                {logs.map((r) => (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="whitespace-nowrap p-3 align-top text-muted-foreground">{formatWhen(r.createdAt)}</td>
                        <td className="hidden p-3 align-top lg:table-cell">
                      <Badge variant={severityVariant(r.severity)} className="font-normal">
                        {r.severity}
                      </Badge>
                        </td>
                        <td className="p-3 align-top">
                      <div className="font-mono text-xs sm:text-sm">{r.eventType}</div>
                      <p className="mt-1 text-sm text-muted-foreground md:hidden">{r.message ?? "—"}</p>
                        </td>
                        <td className="hidden max-w-[200px] truncate p-3 align-top text-xs text-muted-foreground xl:table-cell">
                      {r.resourceType || r.resourceId
                        ? [r.resourceType, r.resourceId].filter(Boolean).join(" · ") || "—"
                        : "—"}
                        </td>
                        <td className="hidden max-w-md p-3 align-top text-muted-foreground md:table-cell">{r.message ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
            </div>
      </StorefrontAdminMainCard>
    </>
  );
}
