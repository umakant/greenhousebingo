"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  Cloud,
  Download,
  Filter,
  History,
  Loader2,
  MonitorCheck,
  Play,
  RefreshCw,
  Search,
  Settings2,
  Shield,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  MonitorStatusBadge,
  type MonitorDisplayStatus,
} from "@/components/compliance/compliance-status-badge";
import {
  COMPLIANCE_BRAND,
  CompliancePrimaryButton,
  ComplianceRowActions,
  ComplianceSectionShell,
  complianceCardClass,
  complianceTableHeadClass,
  complianceTableRowClass,
} from "@/components/compliance/compliance-ui";
import {
  ComplianceDate,
  complianceRelativeTime,
  useComplianceFormat,
} from "@/components/compliance/compliance-shared";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { t } from "@/lib/admin-t";
import { monitorIconCategory } from "@/lib/compliance/compliance-monitors";
import { cn } from "@/lib/utils";

type MonitorRow = {
  id: number;
  name: string;
  category: string;
  categoryTab: string;
  status: string;
  displayStatus: MonitorDisplayStatus;
  schedule: string | null;
  frequency: string;
  integration: string;
  slaHours: number | null;
  description: string | null;
  ownerName: string | null;
  remediationStatus: string | null;
  lastRunAt: string | null;
  latestResult: { status: string; summary: string | null; ranAt: string | null } | null;
};

type MonitorDetail = {
  item: MonitorRow & {
    slaLabel: string;
    frameworks: string[];
    nextRunAt: string | null;
    riskLabel: string;
    riskTone: "success" | "warning" | "danger";
  };
  relatedCounts: { controls: number; evidence: number; policies: number; risks: number };
  results: Array<{ id: number; status: string; summary: string | null; ranAt: string }>;
  remediation: { status: string; summary: string } | null;
  history: Array<{ id: number; action: string; actorName: string | null; createdAt: string }>;
};

const CATEGORY_TABS = ["all", "Security", "Cloud", "HR", "Vendor", "Compliance", "Custom"] as const;

function pct(count: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((count / total) * 100)}%`;
}

function ownerInitials(name: string | null | undefined) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function monitorRowIcon(row: MonitorRow) {
  const kind = monitorIconCategory(row.category);
  if (kind === "cloud") return Cloud;
  if (kind === "hr") return Users;
  return Shield;
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

function statDotColor(tone: string) {
  if (tone === "success") return "bg-emerald-500";
  if (tone === "warning") return "bg-amber-500";
  if (tone === "danger") return "bg-red-500";
  if (tone === "purple") return "bg-violet-500";
  return "bg-muted-foreground";
}

export function ComplianceMonitorsClient() {
  const { fmtDate } = useComplianceFormat();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<MonitorRow[]>([]);
  const [integrationOptions, setIntegrationOptions] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState("");
  const [categoryTab, setCategoryTab] = React.useState<string>("all");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [integrationFilter, setIntegrationFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [refreshingId, setRefreshingId] = React.useState<number | null>(null);
  const [refreshingAll, setRefreshingAll] = React.useState(false);
  const [detailId, setDetailId] = React.useState<number | null>(null);
  const [detail, setDetail] = React.useState<MonitorDetail | null>(null);
  const [detailTab, setDetailTab] = React.useState("overview");
  const [detailLoading, setDetailLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (categoryTab !== "all") params.set("categoryTab", categoryTab);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (integrationFilter !== "all") params.set("integration", integrationFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const qs = params.toString();
      const res = await fetch(`/api/compliance/monitors${qs ? `?${qs}` : ""}`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        items?: MonitorRow[];
        integrations?: string[];
      };
      if (!res.ok || !data?.ok) {
        toast.error("Failed to load monitors");
        setItems([]);
        return;
      }
      setItems(data.items ?? []);
      setIntegrationOptions(data.integrations ?? []);
    } finally {
      setLoading(false);
    }
  }, [search, categoryTab, categoryFilter, integrationFilter, statusFilter]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [search, categoryTab, categoryFilter, integrationFilter, statusFilter, perPage]);

  const total = items.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, lastPage);
  const from = total === 0 ? 0 : (safePage - 1) * perPage + 1;
  const to = Math.min(safePage * perPage, total);
  const slice = items.slice((safePage - 1) * perPage, safePage * perPage);

  const stats = React.useMemo(() => {
    const passing = items.filter((i) => i.displayStatus === "passing").length;
    const needsAttention = items.filter((i) => i.displayStatus === "needs_attention").length;
    const failing = items.filter((i) => i.displayStatus === "failing").length;
    const overdue = items.filter((i) => i.displayStatus === "overdue").length;
    return [
      { label: t("Total Monitors"), value: total, hint: t("Across all integrations"), tone: "default" as const },
      { label: t("Passing"), value: passing, hint: pct(passing, total), tone: "success" as const },
      { label: t("Needs Attention"), value: needsAttention, hint: pct(needsAttention, total), tone: "warning" as const },
      { label: t("Failing"), value: failing, hint: pct(failing, total), tone: "danger" as const },
      { label: t("Overdue"), value: overdue, hint: pct(overdue, total), tone: "purple" as const },
    ];
  }, [items, total]);

  const refresh = async (id: number) => {
    setRefreshingId(id);
    try {
      const res = await fetch(`/api/compliance/monitors/${id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh" }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; result?: { status: string } };
      if (!res.ok || !data?.ok) {
        toast.error("Refresh failed");
        return;
      }
      toast.success(`Monitor ${data.result?.status === "pass" ? "passed" : "failed"}`);
      void load();
      if (detailId === id) void openDetail(id);
    } finally {
      setRefreshingId(null);
    }
  };

  const refreshAll = async () => {
    if (!items.length) return;
    setRefreshingAll(true);
    try {
      for (const row of items.slice(0, 20)) {
        await fetch(`/api/compliance/monitors/${row.id}`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "refresh" }),
        });
      }
      toast.success(t("All monitors refreshed"));
      void load();
      if (detailId) void openDetail(detailId);
    } finally {
      setRefreshingAll(false);
    }
  };

  const openDetail = async (id: number) => {
    setDetailId(id);
    setDetailTab("overview");
    setDetailLoading(true);
    setDetail(null);
    try {
    const res = await fetch(`/api/compliance/monitors/${id}`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as MonitorDetail & { ok?: boolean; item?: MonitorDetail["item"] };
      if (res.ok && data?.ok && data.item) {
        setDetail({
          item: data.item,
          relatedCounts: data.relatedCounts ?? { controls: 0, evidence: 0, policies: 0, risks: 0 },
          results: data.results ?? [],
          remediation: data.remediation ?? null,
          history: data.history ?? [],
        });
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === slice.length) setSelected(new Set());
    else setSelected(new Set(slice.map((r) => r.id)));
  };

  const exportCsv = () => {
    const header = ["Monitor", "Integration", "Category", "Status", "Last Run", "Frequency", "Owner"];
    const rows = items.map((r) => [
      r.name,
      r.integration,
      r.category,
      r.displayStatus,
      r.latestResult?.ranAt ? fmtDate(r.latestResult.ranAt) : "",
      r.frequency,
      r.ownerName ?? "",
    ]);
    const csv = [header, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "compliance-monitors.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const latestResultPassed = detail?.item.latestResult?.status === "pass";

  return (
    <>
      <ComplianceSectionShell
        title={t("Monitors")}
        description={t("Automatically monitor your systems, applications, and policies for compliance.")}
        actions={
          <>
            <Button size="sm" variant="outline" disabled={refreshingAll || !items.length} onClick={() => void refreshAll()}>
              {refreshingAll ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-4 w-4" />
              )}
              {t("Refresh All")}
            </Button>
            <CompliancePrimaryButton asChild>
              <Link href="/compliance/integrations">
                <Settings2 className="mr-1.5 h-4 w-4" />
                {t("Manage Integrations")}
              </Link>
            </CompliancePrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {stats.map((s) => (
              <Card key={s.label} className={complianceCardClass}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    {s.tone !== "default" ? (
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", statDotColor(s.tone))} />
                    ) : null}
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
                  </div>
                  <p
                    className={cn(
                      "mt-1 text-2xl font-semibold tabular-nums",
                      s.tone === "success" && "text-emerald-600",
                      s.tone === "warning" && "text-amber-600",
                      s.tone === "danger" && "text-red-600",
                      s.tone === "purple" && "text-violet-600",
                    )}
                  >
                    {s.value}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.hint}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="border-b">
            <div className="flex flex-wrap gap-1">
              {CATEGORY_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setCategoryTab(tab)}
                  className={cn(
                    "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                    categoryTab === tab
                      ? "border-[#E31B23] text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab === "all" ? t("All Monitors") : tab}
                </button>
              ))}
            </div>
          </div>

          <Card className={complianceCardClass}>
            <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-9 w-[150px] bg-background">
                    <SelectValue placeholder={t("All Categories")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All Categories")}</SelectItem>
                    {[...new Set(items.map((i) => i.category))].sort().map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={integrationFilter} onValueChange={setIntegrationFilter}>
                  <SelectTrigger className="h-9 w-[160px] bg-background">
                    <SelectValue placeholder={t("All Integrations")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All Integrations")}</SelectItem>
                    {integrationOptions.map((ig) => (
                      <SelectItem key={ig} value={ig}>
                        {ig}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-[140px] bg-background">
                    <SelectValue placeholder={t("All Statuses")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All Statuses")}</SelectItem>
                    <SelectItem value="passing">{t("Passing")}</SelectItem>
                    <SelectItem value="needs_attention">{t("Needs Attention")}</SelectItem>
                    <SelectItem value="failing">{t("Failing")}</SelectItem>
                    <SelectItem value="overdue">{t("Overdue")}</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative min-w-[220px] flex-1 lg:max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-9 bg-background pl-8"
                    placeholder={t("Search monitors...")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="outline" onClick={() => toast.message(t("Advanced filters coming soon."))}>
                  <Filter className="mr-1.5 h-4 w-4" />
                  {t("Filters")}
                </Button>
                <Button size="sm" variant="outline" onClick={exportCsv} disabled={!items.length}>
                  <Download className="mr-1.5 h-4 w-4" />
                  {t("Export")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className={cn(complianceCardClass, "overflow-hidden")}>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : slice.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <MonitorCheck className="mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="font-medium">{t("No monitors")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("Vanta-style monitors for security, cloud, HR, vendor, and compliance checks.")}
                  </p>
                </div>
              ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
                      <tr className={complianceTableHeadClass}>
                        <th className="w-10 px-4 py-3">
                          <Checkbox
                            checked={slice.length > 0 && selected.size === slice.length}
                            onCheckedChange={toggleSelectAll}
                            aria-label={t("Select all")}
                          />
                        </th>
                        <th className="px-4 py-3">{t("Monitor")}</th>
                        <th className="px-4 py-3">{t("Integration")}</th>
                        <th className="px-4 py-3">{t("Category")}</th>
                        <th className="px-4 py-3">{t("Status")}</th>
                        <th className="px-4 py-3">{t("Last Run")}</th>
                        <th className="px-4 py-3">{t("Frequency")}</th>
                        <th className="px-4 py-3 w-28">{t("Actions")}</th>
              </tr>
            </thead>
            <tbody>
                      {slice.map((row) => {
                        const Icon = monitorRowIcon(row);
                        return (
                          <tr
                            key={row.id}
                            className={cn(
                              complianceTableRowClass,
                              "cursor-pointer",
                              detailId === row.id && "bg-[#E31B23]/5",
                            )}
                            onClick={() => void openDetail(row.id)}
                          >
                            <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selected.has(row.id)}
                                onCheckedChange={() => toggleSelect(row.id)}
                                aria-label={t("Select row")}
                              />
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-start gap-2.5">
                                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">{row.name}</p>
                                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{row.description}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-muted-foreground">{row.integration}</td>
                            <td className="px-4 py-3.5 text-muted-foreground">{row.category}</td>
                            <td className="px-4 py-3.5">
                              <MonitorStatusBadge status={row.displayStatus} />
                            </td>
                            <td className="px-4 py-3.5 text-muted-foreground">
                              {row.latestResult?.ranAt ? (
                                <ComplianceDate value={row.latestResult.ranAt} withTime />
                    ) : (
                      "—"
                    )}
                  </td>
                            <td className="px-4 py-3.5 text-muted-foreground">{row.frequency}</td>
                            <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                              <ComplianceRowActions
                                label={t("View")}
                                onView={() => void openDetail(row.id)}
                                items={[
                                  { label: "Run now", onSelect: () => void refresh(row.id) },
                                  { label: "View history", onSelect: () => void openDetail(row.id) },
                                  { label: "Download", onSelect: exportCsv },
                                ]}
                              />
                  </td>
                </tr>
                        );
                      })}
            </tbody>
          </table>
                </div>
              )}
            </CardContent>

            {!loading && total > 0 ? (
              <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <Pagination
                  page={safePage}
                  lastPage={lastPage}
                  total={total}
                  from={from}
                  to={to}
                  onPageChange={setPage}
                  entityLabel={t("monitors")}
                />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{t("Show")}</span>
                  <Select value={String(perPage)} onValueChange={(v) => setPerPage(Number(v))}>
                    <SelectTrigger className="h-8 w-[72px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 25, 50, 100].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span>{t("per page")}</span>
                </div>
              </div>
            ) : null}
          </Card>
        </div>
      </ComplianceSectionShell>

      <Sheet open={detailId != null} onOpenChange={(o) => !o && setDetailId(null)}>
        <SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-[520px]">
          {detailLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : detail ? (
            <>
              <SheetHeader className="border-b px-6 py-4 text-left">
                <div className="flex items-start gap-2 pr-8">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <SheetTitle className="text-lg">{detail.item.name}</SheetTitle>
                      <MonitorStatusBadge status={detail.item.displayStatus} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {detail.item.category} {t("Monitor")}
                      {detail.item.latestResult?.ranAt ? (
                        <>
                          {" · "}
                          {t("Last run")}: <ComplianceDate value={detail.item.latestResult.ranAt} withTime />
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>
              </SheetHeader>

              <Tabs value={detailTab} onValueChange={setDetailTab} className="flex min-h-0 flex-1 flex-col">
                <TabsList className="mx-6 mt-3 h-auto w-auto justify-start gap-1 rounded-none border-b bg-transparent p-0">
                  {[
                    { id: "overview", label: t("Overview") },
                    { id: "results", label: t("Results") },
                    { id: "history", label: t("History") },
                    { id: "remediation", label: t("Remediation") },
                    { id: "related", label: t("Related") },
                  ].map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="rounded-none border-b-2 border-transparent px-3 pb-2 data-[state=active]:border-[#E31B23] data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                  <TabsContent value="overview" className="mt-0 space-y-5">
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("Description")}
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground">{detail.item.description}</p>
                    </div>

                    <div className="rounded-lg border bg-muted/20 p-4">
                      <MetaRow label={t("Integration")}>
                        <span>{detail.item.integration}</span>
                      </MetaRow>
                      <MetaRow label={t("Category")}>
                        <span>{detail.item.category}</span>
                      </MetaRow>
                      <MetaRow label={t("Frequency")}>
                        <span>{detail.item.frequency}</span>
                      </MetaRow>
                      <MetaRow label={t("Owner")}>
                        <span className="flex items-center justify-end gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="bg-primary/10 text-xs text-primary">
                              {ownerInitials(detail.item.ownerName)}
                            </AvatarFallback>
                          </Avatar>
                          {detail.item.ownerName ?? t("Unassigned")}
                        </span>
                      </MetaRow>
                      <MetaRow label={t("Status")}>
                        <MonitorStatusBadge status={detail.item.displayStatus} />
                      </MetaRow>
                      <MetaRow label={t("SLA")}>
                        <span>{detail.item.slaLabel}</span>
                      </MetaRow>
                      <MetaRow label={t("Next Run")}>
                        <ComplianceDate value={detail.item.nextRunAt} withTime />
                      </MetaRow>
                    </div>

                    <div className="rounded-lg border p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {t("Compliance Impact")}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "border-0 font-medium",
                            detail.item.riskTone === "success" && "bg-emerald-100 text-emerald-800",
                            detail.item.riskTone === "warning" && "bg-amber-100 text-amber-800",
                            detail.item.riskTone === "danger" && "bg-red-100 text-red-800",
                          )}
                        >
                          {detail.item.riskLabel}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex flex-wrap gap-x-2 gap-y-1">
                          {detail.item.frameworks.map((fw) => (
                            <Link key={fw} href="/compliance/frameworks" className="text-primary hover:underline">
                              {fw}
                            </Link>
                          ))}
                        </div>
                        <Link href="/compliance/controls" className="block text-primary hover:underline">
                          {detail.relatedCounts.controls} {t("controls")}
                        </Link>
                        <Link href="/compliance/evidence" className="block text-primary hover:underline">
                          {detail.relatedCounts.evidence} {t("evidence items")}
                        </Link>
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("Latest Result")}
                      </p>
                      <div
                        className={cn(
                          "rounded-lg border p-4",
                          latestResultPassed
                            ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/30"
                            : "border-red-200 bg-red-50/80 dark:border-red-900 dark:bg-red-950/30",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {latestResultPassed ? (
                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                          ) : (
                            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">
                              {detail.item.latestResult?.summary ??
                                (latestResultPassed ? t("Check passed") : t("Check failed"))}
                            </p>
                            {detail.item.latestResult?.ranAt ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {latestResultPassed ? t("Passed") : t("Failed")}{" "}
                                <ComplianceDate value={detail.item.latestResult.ranAt} withTime />
                              </p>
                            ) : null}
                            <button
                              type="button"
                              className="mt-2 text-xs font-medium text-primary hover:underline"
                              onClick={() => setDetailTab("results")}
                            >
                              {t("View full result")} →
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="results" className="mt-0">
                    <ul className="space-y-3">
                      {detail.results.map((r) => (
                        <li key={r.id} className="rounded-lg border p-4 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <MonitorStatusBadge
                              status={r.status === "pass" ? "passing" : r.status === "fail" ? "failing" : "needs_attention"}
                            />
                            <span className="text-xs text-muted-foreground">
                              <ComplianceDate value={r.ranAt} withTime />
                            </span>
                  </div>
                          {r.summary ? <p className="mt-2 text-muted-foreground">{r.summary}</p> : null}
                        </li>
                      ))}
                    </ul>
                  </TabsContent>

                  <TabsContent value="history" className="mt-0">
                    <ul className="space-y-2">
                      {detail.history.length ? (
                        detail.history.map((h) => (
                          <li key={h.id} className="flex justify-between gap-2 text-sm">
                            <span>
                              <span className="font-medium">{h.actorName ?? t("System")}</span>{" "}
                              <span className="text-muted-foreground">{h.action.replace(/_/g, " ")}</span>
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {complianceRelativeTime(h.createdAt)}
                            </span>
                          </li>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">{t("No activity yet.")}</p>
                      )}
                    </ul>
                  </TabsContent>

                  <TabsContent value="remediation" className="mt-0">
                    {detail.remediation ? (
                      <div className="rounded-lg border p-4 text-sm">
                        <p className="font-medium capitalize">{detail.remediation.status.replace(/_/g, " ")}</p>
                        <p className="mt-2 text-muted-foreground">{detail.remediation.summary}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("No open remediation items.")}</p>
                    )}
                  </TabsContent>

                  <TabsContent value="related" className="mt-0">
                    <div className="divide-y rounded-lg border">
                      {[
                        { label: t("Controls"), count: `${detail.relatedCounts.controls} ${t("controls")}`, href: "/compliance/controls" },
                        { label: t("Evidence"), count: `${detail.relatedCounts.evidence} ${t("evidence items")}`, href: "/compliance/evidence" },
                        { label: t("Policies"), count: `${detail.relatedCounts.policies} ${t("policies")}`, href: "/compliance/policies" },
                        {
                          label: t("Risks"),
                          count: detail.relatedCounts.risks ? `${detail.relatedCounts.risks} ${t("risk")}` : "—",
                          href: "/compliance/risks",
                        },
                      ].map((item) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/40"
                        >
                          <span>
                            <span className="font-medium">{item.label}</span>
                            <span className="ml-2 text-muted-foreground">({item.count})</span>
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </Link>
                      ))}
                    </div>
                  </TabsContent>
                </div>
              </Tabs>

              <div className="flex shrink-0 gap-2 border-t px-6 py-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={refreshingId === detailId}
                  onClick={() => detailId && void refresh(detailId)}
                >
                  <Play className="mr-1.5 h-4 w-4" />
                  {t("Run Now")}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setDetailTab("history")}>
                  <History className="mr-1.5 h-4 w-4" />
                  {t("View History")}
                </Button>
                <Button
                  className="flex-1 text-white"
                  style={{ backgroundColor: COMPLIANCE_BRAND }}
                  onClick={() => toast.message(t("Task creation coming soon."))}
                >
                  + {t("Create Task")}
                </Button>
            </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
