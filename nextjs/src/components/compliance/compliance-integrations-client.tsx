"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Compass,
  Download,
  Filter,
  Loader2,
  Plug,
  RefreshCw,
  Search,
  Shield,
  Unplug,
} from "lucide-react";
import { toast } from "sonner";

import {
  IntegrationCategoryBadge,
  IntegrationStatusBadge,
} from "@/components/compliance/compliance-status-badge";
import {
  COMPLIANCE_DONUT_COLORS,
  DonutWithLegend,
  type DonutSlice,
} from "@/components/compliance/compliance-donut-chart";
import {
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
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/lib/admin-t";
import { categoryLabel, providerIconColor } from "@/lib/compliance/compliance-integrations";
import { cn } from "@/lib/utils";

type IntegrationRow = {
  id: number | null;
  provider: string;
  providerName: string;
  category: string;
  categoryLabel: string;
  accountSubtitle: string;
  systemUseCase: string;
  status: string;
  displayStatus: string;
  syncMode: string;
  lastSyncAt: string | null;
  lastSyncTone: string;
  nextSyncIn: string | null;
  ownerName: string;
  connectedAccount: string;
  controlsCount: number;
  monitorsCount: number;
  controlsSupported: string[];
  monitorsSupported: string[];
  scope: Record<string, unknown>;
  syncLogs: Array<{ at: string; status: string; message: string; recordsSynced?: number }>;
  credentialsConfigured: boolean;
};

type IntegrationDetail = {
  item: IntegrationRow & {
    connectedOn: string | null;
    accessRole: string;
    syncHealth: { resourcesSynced: number; successful: number; failed: number; skipped: number };
    coverage: {
      overallPct: number;
      inScope: { count: number; pct: number };
      partial: { count: number; pct: number };
      outOfScope: { count: number; pct: number };
    };
    tip: string | null;
  };
};

type IntegrationStats = {
  total: number;
  connected: number;
  needsAttention: number;
  disconnected: number;
  syncing: number;
  connectedPct: string;
  needsAttentionPct: string;
  disconnectedPct: string;
  syncingPct: string;
};

function ownerInitials(name: string | null | undefined) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function statDotColor(tone: string) {
  if (tone === "danger") return "bg-red-500";
  if (tone === "warning") return "bg-amber-500";
  if (tone === "success") return "bg-emerald-500";
  if (tone === "info") return "bg-blue-500";
  return "bg-muted-foreground";
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

function LastSyncCell({ row }: { row: IntegrationRow }) {
  const { fmtDateTime } = useComplianceFormat();
  if (row.displayStatus === "syncing") {
    return (
      <span className="flex items-center gap-1.5 text-blue-600">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {t("Syncing now")}
      </span>
    );
  }
  if (!row.lastSyncAt) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      {row.lastSyncTone === "success" ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
      ) : row.lastSyncTone === "warning" ? (
        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
      ) : null}
      <span>{fmtDateTime(row.lastSyncAt)}</span>
    </span>
  );
}

function coverageDonut(coverage: IntegrationDetail["item"]["coverage"]): DonutSlice[] {
  return [
    { name: t("In Scope"), value: coverage.inScope.count, color: COMPLIANCE_DONUT_COLORS.green },
    { name: t("Partial"), value: coverage.partial.count, color: COMPLIANCE_DONUT_COLORS.amber },
    { name: t("Out of Scope"), value: coverage.outOfScope.count, color: COMPLIANCE_DONUT_COLORS.red },
  ].filter((s) => s.value > 0);
}

export function ComplianceIntegrationsClient() {
  const { fmtDate } = useComplianceFormat();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<IntegrationRow[]>([]);
  const [stats, setStats] = React.useState<IntegrationStats | null>(null);
  const [categoryOptions, setCategoryOptions] = React.useState<string[]>([]);
  const [systemOptions, setSystemOptions] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [systemFilter, setSystemFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [detailProvider, setDetailProvider] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<IntegrationDetail | null>(null);
  const [detailTab, setDetailTab] = React.useState("overview");
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [scopeJson, setScopeJson] = React.useState("{}");
  const [syncing, setSyncing] = React.useState<string | null>(null);
  const [connecting, setConnecting] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (systemFilter !== "all") params.set("system", systemFilter);
      const res = await fetch(`/api/compliance/integrations?${params}`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        items?: IntegrationRow[];
        stats?: IntegrationStats;
        categories?: string[];
        systems?: string[];
      };
      if (!res.ok || !data?.ok) {
        toast.error(t("Failed to load integrations"));
        return;
      }
      setItems(data.items ?? []);
      setStats(data.stats ?? null);
      setCategoryOptions(data.categories ?? []);
      setSystemOptions(data.systems ?? []);
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter, systemFilter]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [search, categoryFilter, statusFilter, systemFilter, perPage]);

  const total = items.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, lastPage);
  const from = total === 0 ? 0 : (safePage - 1) * perPage + 1;
  const to = Math.min(safePage * perPage, total);
  const slice = items.slice((safePage - 1) * perPage, safePage * perPage);

  const openDetail = async (provider: string, row?: IntegrationRow) => {
    setDetailProvider(provider);
    setDetailTab("overview");
    setDetailLoading(true);
    setDetail(null);
    if (row) setScopeJson(JSON.stringify(row.scope ?? {}, null, 2));
    try {
      const res = await fetch(`/api/compliance/integrations/${provider}`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as IntegrationDetail & { ok?: boolean; item?: IntegrationDetail["item"] };
      if (res.ok && data?.ok && data.item) {
        setDetail({ item: data.item });
        setScopeJson(JSON.stringify(data.item.scope ?? {}, null, 2));
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const connect = async (provider: string) => {
    setConnecting(provider);
    try {
      let scope: Record<string, unknown> = {};
      try {
        scope = JSON.parse(scopeJson) as Record<string, unknown>;
      } catch {
        scope = detail?.item.scope ?? {};
      }
      const res = await fetch("/api/compliance/integrations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, scope, credentialsConfigured: true }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? t("Connect failed"));
        return;
      }
      toast.success(t("Integration connected"));
      void load();
      void openDetail(provider);
    } finally {
      setConnecting(null);
    }
  };

  const sync = async (provider: string) => {
    setSyncing(provider);
    try {
      const res = await fetch(`/api/compliance/integrations/${provider}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean };
      if (!res.ok || !data?.ok) {
        toast.error(t("Sync failed"));
        return;
      }
      toast.success(t("Sync completed"));
      void load();
      if (detailProvider === provider) void openDetail(provider);
    } finally {
      setSyncing(null);
    }
  };

  const disconnect = async (provider: string) => {
    const res = await fetch(`/api/compliance/integrations/${provider}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disconnect" }),
    });
    if (res.ok) {
      toast.success(t("Integration disconnected"));
      setDetailProvider(null);
      void load();
    }
  };

  const saveScope = async () => {
    if (!detailProvider) return;
    let scope: Record<string, unknown>;
    try {
      scope = JSON.parse(scopeJson) as Record<string, unknown>;
    } catch {
      toast.error(t("Invalid JSON scope"));
      return;
    }
    const res = await fetch(`/api/compliance/integrations/${detailProvider}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope }),
    });
    if (res.ok) {
      toast.success(t("Scope saved"));
      void load();
    }
  };

  const toggleSelect = (provider: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(provider)) next.delete(provider);
      else next.add(provider);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === slice.length) setSelected(new Set());
    else setSelected(new Set(slice.map((r) => r.provider)));
  };

  const exportCsv = () => {
    const header = ["Integration", "Category", "System", "Status", "Last Sync", "Owner", "Sync Mode"];
    const rows = items.map((r) => [
      r.providerName,
      r.categoryLabel,
      r.systemUseCase,
      r.displayStatus,
      r.lastSyncAt ? fmtDate(r.lastSyncAt) : "",
      r.ownerName,
      r.syncMode,
    ]);
    const csv = [header, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "compliance-integrations.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const statCards = stats
    ? [
        { label: t("Total Integrations"), value: stats.total, hint: t("All systems"), tone: "default" as const },
        { label: t("Connected"), value: stats.connected, hint: stats.connectedPct, tone: "success" as const },
        { label: t("Needs Attention"), value: stats.needsAttention, hint: stats.needsAttentionPct, tone: "warning" as const },
        { label: t("Disconnected"), value: stats.disconnected, hint: stats.disconnectedPct, tone: "danger" as const },
        { label: t("Sync in Progress"), value: stats.syncing, hint: stats.syncingPct, tone: "info" as const },
      ]
    : [];

  return (
    <>
      <ComplianceSectionShell
        title={t("Integrations")}
        description={t("Connect and manage your cloud, security, and productivity tools.")}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => toast.message(t("Integration catalog coming soon."))}>
              <Compass className="mr-1.5 h-4 w-4" />
              {t("Explore Integrations")}
            </Button>
            <Button
              size="sm"
              className="bg-violet-600 text-white hover:bg-violet-700"
              onClick={() => toast.message(t("Select an integration from the table to connect."))}
            >
              <Plug className="mr-1.5 h-4 w-4" />
              {t("Add Integration")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {statCards.map((s) => (
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
                      s.tone === "info" && "text-blue-600",
                    )}
                  >
                    {s.value}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.hint}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className={complianceCardClass}>
            <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <div className="relative min-w-[220px] flex-1 lg:max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-9 bg-background pl-8"
                    placeholder={t("Search integrations...")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-9 w-[150px] bg-background">
                    <SelectValue placeholder={t("All Categories")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All Categories")}</SelectItem>
                    {categoryOptions.map((c) => (
                      <SelectItem key={c} value={c}>
                        {categoryLabel(c)}
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
                    <SelectItem value="connected">{t("Connected")}</SelectItem>
                    <SelectItem value="needs_attention">{t("Needs Attention")}</SelectItem>
                    <SelectItem value="disconnected">{t("Disconnected")}</SelectItem>
                    <SelectItem value="syncing">{t("In Progress")}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={systemFilter} onValueChange={setSystemFilter}>
                  <SelectTrigger className="h-9 w-[170px] bg-background">
                    <SelectValue placeholder={t("All Systems")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All Systems")}</SelectItem>
                    {systemOptions.map((sys) => (
                      <SelectItem key={sys} value={sys}>
                        {sys}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Button size="sm" variant="outline" onClick={() => void load()}>
                  <RefreshCw className="mr-1.5 h-4 w-4" />
                  {t("Refresh")}
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
                  <Cloud className="mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="font-medium">{t("No integrations found")}</p>
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
                          />
                        </th>
                        <th className="px-4 py-3">{t("Integration")}</th>
                        <th className="px-4 py-3">{t("Category")}</th>
                        <th className="px-4 py-3">{t("System / Use Case")}</th>
                        <th className="px-4 py-3">{t("Status")}</th>
                        <th className="px-4 py-3">{t("Last Sync")}</th>
                        <th className="px-4 py-3">{t("Owner")}</th>
                        <th className="w-16 px-4 py-3">{t("Actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slice.map((row) => (
                        <tr
                          key={row.provider}
                          className={cn(
                            complianceTableRowClass,
                            "cursor-pointer",
                            detailProvider === row.provider && "bg-[#E31B23]/5",
                          )}
                          onClick={() => void openDetail(row.provider, row)}
                        >
                          <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selected.has(row.provider)}
                              onCheckedChange={() => toggleSelect(row.provider)}
                            />
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-start gap-2">
                              <div
                                className={cn(
                                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                  providerIconColor(row.provider),
                                )}
                              >
                                <Cloud className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-medium">{row.providerName}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">{row.accountSubtitle}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <IntegrationCategoryBadge category={row.category} />
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground">{row.systemUseCase}</td>
                          <td className="px-4 py-3.5">
                            <div className="space-y-0.5">
                              <IntegrationStatusBadge displayStatus={row.displayStatus} />
                              <p className="text-xs text-muted-foreground">{row.syncMode}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <LastSyncCell row={row} />
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                                  {ownerInitials(row.ownerName)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-muted-foreground">{row.ownerName}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <ComplianceRowActions
                              label={t("View")}
                              onView={() => void openDetail(row.provider, row)}
                              items={[
                                ...(row.displayStatus === "connected" || row.displayStatus === "needs_attention"
                                  ? [{ label: "Sync now", onSelect: () => void sync(row.provider) }]
                                  : [{ label: "Connect", onSelect: () => void openDetail(row.provider, row) }]),
                                ...(row.displayStatus !== "disconnected"
                                  ? [{ label: "Disconnect", onSelect: () => void disconnect(row.provider), destructive: true }]
                                  : []),
                              ]}
                            />
                          </td>
                        </tr>
                      ))}
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
                  entityLabel={t("integrations")}
                />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{t("Show")}</span>
                  <Select value={String(perPage)} onValueChange={(v) => setPerPage(Number(v))}>
                    <SelectTrigger className="h-8 w-[72px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 25, 50].map((n) => (
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

      <Sheet open={detailProvider != null} onOpenChange={(o) => !o && setDetailProvider(null)}>
        <SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-[520px]">
          {detailLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : detail ? (
            <>
              <SheetHeader className="border-b px-6 py-4 text-left">
                <div className="flex items-start gap-3 pr-8">
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", providerIconColor(detail.item.provider))}>
                    <Cloud className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <SheetTitle className="text-lg leading-tight">{detail.item.providerName}</SheetTitle>
                      <IntegrationStatusBadge displayStatus={detail.item.displayStatus} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{detail.item.accountSubtitle}</p>
                  </div>
                </div>
              </SheetHeader>

              <Tabs value={detailTab} onValueChange={setDetailTab} className="flex min-h-0 flex-1 flex-col">
                <TabsList className="mx-6 mt-3 h-auto w-auto justify-start gap-1 rounded-none border-b bg-transparent p-0">
                  {[
                    { id: "overview", label: t("Overview") },
                    { id: "resources", label: t("Resources") },
                    { id: "history", label: t("Sync History") },
                    { id: "settings", label: t("Settings") },
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
                    <div className="rounded-lg border bg-muted/20 p-4">
                      <MetaRow label={t("Name")}>
                        <span>{detail.item.providerName}</span>
                      </MetaRow>
                      <MetaRow label={t("Category")}>
                        <IntegrationCategoryBadge category={detail.item.category} />
                      </MetaRow>
                      <MetaRow label={t("Connected Account")}>
                        <span className="text-xs">{detail.item.connectedAccount}</span>
                      </MetaRow>
                      <MetaRow label={t("Role / Access")}>
                        <span>{detail.item.accessRole}</span>
                      </MetaRow>
                      <MetaRow label={t("Connected On")}>
                        <ComplianceDate value={detail.item.connectedOn} />
                      </MetaRow>
                      <MetaRow label={t("Last Sync")}>
                        {detail.item.lastSyncAt ? (
                          <ComplianceDate value={detail.item.lastSyncAt} />
                        ) : (
                          "—"
                        )}
                      </MetaRow>
                      <MetaRow label={t("Next Sync")}>
                        <span>{detail.item.nextSyncIn ?? "—"}</span>
                      </MetaRow>
                      <MetaRow label={t("Status")}>
                        <IntegrationStatusBadge displayStatus={detail.item.displayStatus} />
                      </MetaRow>
                      <MetaRow label={t("Owner")}>
                        <span className="flex items-center justify-end gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="bg-primary/10 text-xs text-primary">
                              {ownerInitials(detail.item.ownerName)}
                            </AvatarFallback>
                          </Avatar>
                          {detail.item.ownerName}
                        </span>
                      </MetaRow>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("Sync Health")}
                      </p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[
                          { label: t("Resources Synced"), value: detail.item.syncHealth.resourcesSynced },
                          { label: t("Successful"), value: detail.item.syncHealth.successful, tone: "text-emerald-600" },
                          { label: t("Failed"), value: detail.item.syncHealth.failed, tone: "text-red-600" },
                          { label: t("Skipped"), value: detail.item.syncHealth.skipped },
                        ].map((m) => (
                          <div key={m.label} className="rounded-lg border bg-muted/20 p-3 text-center">
                            <p className="text-xs text-muted-foreground">{m.label}</p>
                            <p className={cn("mt-1 text-lg font-semibold tabular-nums", m.tone)}>{m.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("Data Coverage")}
                      </p>
                      <div className="flex flex-col items-center gap-4 rounded-lg border p-4 sm:flex-row">
                        <DonutWithLegend
                          data={coverageDonut(detail.item.coverage)}
                          centerLabel={`${detail.item.coverage.overallPct}%`}
                          size={140}
                        />
                        <div className="flex-1 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t("In Scope")}</span>
                            <span>
                              {detail.item.coverage.inScope.count} ({detail.item.coverage.inScope.pct}%)
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t("Partial")}</span>
                            <span>
                              {detail.item.coverage.partial.count} ({detail.item.coverage.partial.pct}%)
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t("Out of Scope")}</span>
                            <span>
                              {detail.item.coverage.outOfScope.count} ({detail.item.coverage.outOfScope.pct}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {detail.item.tip ? (
                      <div className="flex gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
                        <Shield className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          <span className="font-medium">{t("Tip")}: </span>
                          {detail.item.tip}
                        </span>
                      </div>
                    ) : null}
                  </TabsContent>

                  <TabsContent value="resources" className="mt-0 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {detail.item.syncHealth.resourcesSynced} {t("resources synced from")} {detail.item.providerName}
                    </p>
                    <div className="rounded-lg border p-3 text-sm">
                      <p className="font-medium">{t("Controls supported")}</p>
                      <p className="mt-1 text-muted-foreground">{detail.item.controlsSupported.join(", ") || "—"}</p>
                    </div>
                    <div className="rounded-lg border p-3 text-sm">
                      <p className="font-medium">{t("Monitors supported")}</p>
                      <p className="mt-1 text-muted-foreground">{detail.item.monitorsSupported.join(", ") || "—"}</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="history" className="mt-0">
                    <div className="max-h-80 space-y-2 overflow-y-auto">
                      {(detail.item.syncLogs ?? []).length ? (
                        detail.item.syncLogs.map((log, i) => (
                          <div key={i} className="rounded border px-3 py-2 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium capitalize">{log.status}</span>
                              <span className="text-xs text-muted-foreground">{complianceRelativeTime(log.at)}</span>
                            </div>
                            <p className="mt-0.5 text-muted-foreground">{log.message}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">{t("No sync history yet.")}</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="settings" className="mt-0 space-y-4">
                    <div>
                      <Label htmlFor="scope">{t("Scope configuration (JSON)")}</Label>
                      <Textarea
                        id="scope"
                        className="mt-1 font-mono text-xs"
                        rows={8}
                        value={scopeJson}
                        onChange={(e) => setScopeJson(e.target.value)}
                      />
                    </div>
                    {detail.item.displayStatus !== "disconnected" ? (
                      <Button variant="outline" className="w-full" onClick={() => void saveScope()}>
                        {t("Save scope")}
                      </Button>
                    ) : null}
                  </TabsContent>
                </div>
              </Tabs>

              <div className="grid shrink-0 grid-cols-2 gap-2 border-t px-6 py-4 sm:grid-cols-4">
                {detail.item.displayStatus === "connected" || detail.item.displayStatus === "needs_attention" ? (
                  <>
                    <Button
                      variant="outline"
                      className="col-span-1"
                      disabled={syncing === detail.item.provider}
                      onClick={() => void sync(detail.item.provider)}
                    >
                      {syncing === detail.item.provider ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="mr-1 h-3.5 w-3.5" />
                          {t("Sync Now")}
                        </>
                      )}
                    </Button>
                    <Button variant="outline" className="col-span-1" onClick={() => setDetailTab("history")}>
                      {t("View Logs")}
                    </Button>
                    <Button variant="outline" className="col-span-1" onClick={() => void connect(detail.item.provider)}>
                      {t("Reconnect")}
                    </Button>
                    <Button
                      variant="outline"
                      className="col-span-1 text-red-600 hover:text-red-700"
                      onClick={() => void disconnect(detail.item.provider)}
                    >
                      <Unplug className="mr-1 h-3.5 w-3.5" />
                      {t("Disconnect")}
                    </Button>
                  </>
                ) : (
                  <Button
                    className="col-span-full bg-violet-600 text-white hover:bg-violet-700"
                    disabled={connecting === detail.item.provider}
                    onClick={() => void connect(detail.item.provider)}
                  >
                    {connecting === detail.item.provider ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Plug className="mr-1.5 h-4 w-4" />
                        {t("Connect")}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
