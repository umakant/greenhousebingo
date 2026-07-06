"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bug,
  Check,
  ChevronRight,
  Download,
  ExternalLink,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Ticket,
} from "lucide-react";
import { toast } from "sonner";

import {
  VulnerabilitySeverityBadge,
  VulnerabilityStatusBadge,
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { t } from "@/lib/admin-t";
import { COMPLIANCE_VULN_SEVERITIES, COMPLIANCE_VULN_STATUSES } from "@/lib/compliance/compliance-day2";
import { cvssGaugeColor } from "@/lib/compliance/compliance-vulnerabilities";
import { cn } from "@/lib/utils";

type VulnRow = {
  id: number;
  title: string;
  cveId: string | null;
  severity: string;
  status: string;
  displayStatus: string;
  assetName: string | null;
  systemName: string;
  environment: string;
  cvssScore: number;
  discoveredAt: string | null;
  ownerName: string | null;
  dueDate: string | null;
  frameworkIds: number[];
  remediationSteps: Array<{ step: string; status: string }>;
};

type VulnDetail = {
  item: VulnRow & {
    description: string;
    likelihood: string;
    impact: string;
    riskScore: number;
    dueIn: string | null;
    firstDetectedAt: string | null;
    lastSeenAt: string | null;
    remediatedAt: string | null;
  };
  relatedAssets: Array<{ hostname: string; type: string }>;
  linkedCounts: { risks: number; controls: number };
  linkedItems: {
    risks: Array<{ id: number; title: string }>;
    controls: Array<{ id: number; title: string }>;
  };
  history: Array<{ id: number; action: string; actorName: string | null; createdAt: string }>;
};

const SEVERITY_TABS = [
  { id: "all", label: "All Vulnerabilities" },
  { id: "critical", label: "Critical" },
  { id: "high", label: "High" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" },
  { id: "resolved", label: "Resolved" },
  { id: "ignored", label: "Ignored" },
] as const;

function pct(count: number, total: number) {
  if (!total) return "0% of total";
  return `${Math.round((count / total) * 100)}% of total`;
}

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
  if (tone === "info") return "bg-yellow-400";
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

function CvssGauge({ score, size = 40 }: { score: number; size?: number }) {
  const pctFill = Math.min(100, (score / 10) * 100);
  const color = cvssGaugeColor(score);
  const r = (size - 6) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pctFill / 100) * circumference;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={3} className="text-muted/30" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[10px] font-semibold tabular-nums">{score.toFixed(1)}</span>
    </div>
  );
}

function tabFilter(row: VulnRow, tab: string): boolean {
  if (tab === "all") return true;
  if (tab === "resolved") return row.displayStatus === "resolved";
  if (tab === "ignored") return row.displayStatus === "ignored";
  return row.severity.toLowerCase() === tab;
}

export function ComplianceVulnerabilitiesClient() {
  const { fmtDate, fmtDateTime } = useComplianceFormat();
  const [loading, setLoading] = React.useState(true);
  const [allItems, setAllItems] = React.useState<VulnRow[]>([]);
  const [systemOptions, setSystemOptions] = React.useState<string[]>([]);
  const [ownerOptions, setOwnerOptions] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState("");
  const [severityFilter, setSeverityFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [systemFilter, setSystemFilter] = React.useState("all");
  const [ownerFilter, setOwnerFilter] = React.useState("all");
  const [activeTab, setActiveTab] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [detailId, setDetailId] = React.useState<number | null>(null);
  const [detail, setDetail] = React.useState<VulnDetail | null>(null);
  const [detailTab, setDetailTab] = React.useState("overview");
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    title: "",
    cveId: "",
    severity: "medium",
    assetName: "",
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  });

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (severityFilter !== "all") params.set("severity", severityFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (systemFilter !== "all") params.set("system", systemFilter);
      if (ownerFilter !== "all") params.set("owner", ownerFilter);
      const res = await fetch(`/api/compliance/vulnerabilities?${params}`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        items?: VulnRow[];
        systems?: string[];
        owners?: string[];
      };
      if (res.ok && data?.ok) {
        setAllItems(data.items ?? []);
        setSystemOptions(data.systems ?? []);
        setOwnerOptions(data.owners ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [search, severityFilter, statusFilter, systemFilter, ownerFilter]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [search, severityFilter, statusFilter, systemFilter, ownerFilter, activeTab, perPage]);

  const items = React.useMemo(
    () => allItems.filter((row) => tabFilter(row, activeTab)),
    [allItems, activeTab],
  );

  const total = items.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, lastPage);
  const from = total === 0 ? 0 : (safePage - 1) * perPage + 1;
  const to = Math.min(safePage * perPage, total);
  const slice = items.slice((safePage - 1) * perPage, safePage * perPage);

  const stats = React.useMemo(() => {
    const base = allItems.length;
    const critical = allItems.filter((i) => i.severity === "critical").length;
    const high = allItems.filter((i) => i.severity === "high").length;
    const medium = allItems.filter((i) => i.severity === "medium").length;
    const low = allItems.filter((i) => i.severity === "low" || i.severity === "informational").length;
    return [
      { label: t("Total Vulnerabilities"), value: base, hint: t("All time"), tone: "default" as const },
      { label: t("Critical"), value: critical, hint: pct(critical, base), tone: "danger" as const },
      { label: t("High"), value: high, hint: pct(high, base), tone: "warning" as const },
      { label: t("Medium"), value: medium, hint: pct(medium, base), tone: "info" as const },
      { label: t("Low"), value: low, hint: pct(low, base), tone: "success" as const },
    ];
  }, [allItems]);

  const save = async () => {
    if (!form.title.trim()) return toast.error(t("Title required"));
    setSaving(true);
    try {
      const res = await fetch("/api/compliance/vulnerabilities", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success(t("Vulnerability added"));
        setDialogOpen(false);
        setForm({
          title: "",
          cveId: "",
          severity: "medium",
          assetName: "",
          dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        });
        void load();
      }
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (id: number) => {
    setDetailId(id);
    setDetailTab("overview");
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetch(`/api/compliance/vulnerabilities/${id}`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as VulnDetail & { ok?: boolean; item?: VulnDetail["item"] };
      if (res.ok && data?.ok && data.item) {
        setDetail({
          item: data.item,
          relatedAssets: data.relatedAssets ?? [],
          linkedCounts: data.linkedCounts ?? { risks: 0, controls: 0 },
          linkedItems: data.linkedItems ?? { risks: [], controls: [] },
          history: data.history ?? [],
        });
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const patchVuln = async (id: number, payload: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/compliance/vulnerabilities/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success(t("Vulnerability updated"));
        if (detailId === id) void openDetail(id);
        void load();
      }
    } finally {
      setSaving(false);
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
    const header = ["Vulnerability", "CVE", "Severity", "Status", "System", "Environment", "CVSS", "Discovered", "Owner"];
    const rows = items.map((r) => [
      r.title,
      r.cveId ?? "",
      r.severity,
      r.status,
      r.systemName,
      r.environment,
      r.cvssScore,
      r.discoveredAt ? fmtDate(r.discoveredAt) : "",
      r.ownerName ?? "",
    ]);
    const csv = [header, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "compliance-vulnerabilities.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <ComplianceSectionShell
        title={t("Vulnerabilities")}
        description={t("Discover, prioritize, and remediate security vulnerabilities.")}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => toast.message(t("Scan queued."))}>
              <RefreshCw className="mr-1.5 h-4 w-4" />
              {t("Scan Now")}
            </Button>
            <CompliancePrimaryButton type="button" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("Add Vulnerability")}
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
                      s.tone === "info" && "text-yellow-600",
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
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="h-9 w-[150px] bg-background">
                    <SelectValue placeholder={t("All Severities")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All Severities")}</SelectItem>
                    {COMPLIANCE_VULN_SEVERITIES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
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
                    {COMPLIANCE_VULN_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={systemFilter} onValueChange={setSystemFilter}>
                  <SelectTrigger className="h-9 w-[150px] bg-background">
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
                <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                  <SelectTrigger className="h-9 w-[140px] bg-background">
                    <SelectValue placeholder={t("All Owners")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All Owners")}</SelectItem>
                    {ownerOptions.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative min-w-[220px] flex-1 lg:max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-9 bg-background pl-8"
                    placeholder={t("Search vulnerabilities...")}
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
            <div className="flex gap-1 overflow-x-auto border-b px-4 pt-2">
              {SEVERITY_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "shrink-0 border-b-2 px-3 pb-2 text-sm font-medium transition-colors",
                    activeTab === tab.id
                      ? "border-[#E31B23] text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t(tab.label)}
                </button>
              ))}
            </div>

            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : slice.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Bug className="mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="font-medium">{t("No vulnerabilities")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("Track severity, affected systems, CVSS scores, and remediation workflow.")}
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
                        <th className="px-4 py-3">{t("Vulnerability")}</th>
                        <th className="px-4 py-3">{t("Severity")}</th>
                        <th className="px-4 py-3">{t("Status")}</th>
                        <th className="px-4 py-3">{t("Affected System")}</th>
                        <th className="px-4 py-3">{t("CVSS Score")}</th>
                        <th className="px-4 py-3">{t("Discovered")}</th>
                        <th className="px-4 py-3">{t("Owner")}</th>
                        <th className="w-16 px-4 py-3">{t("Actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slice.map((row) => (
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
                            <div className="flex items-start gap-2">
                              <Bug className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                              <div>
                                <p className="font-medium">{row.title}</p>
                                {row.cveId ? (
                                  <p className="mt-0.5 text-xs text-muted-foreground">{row.cveId}</p>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <VulnerabilitySeverityBadge severity={row.severity} />
                          </td>
                          <td className="px-4 py-3.5">
                            <VulnerabilityStatusBadge status={row.status} />
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-medium">{row.systemName}</p>
                            <p className="text-xs text-muted-foreground">({row.environment})</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <CvssGauge score={row.cvssScore} />
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground">
                            {row.discoveredAt ? (
                              <>
                                <ComplianceDate value={row.discoveredAt} />
                                <p className="text-xs">{fmtDateTime(row.discoveredAt).split(",")[1]?.trim()}</p>
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            {row.ownerName ? (
                              <span className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                                    {ownerInitials(row.ownerName)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-muted-foreground">{row.ownerName}</span>
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <ComplianceRowActions
                              label={t("View")}
                              onView={() => void openDetail(row.id)}
                              items={[
                                { label: "Complete", onSelect: () => void patchVuln(row.id, { status: "remediated" }) },
                                { label: "Mark in progress", onSelect: () => void patchVuln(row.id, { status: "in_progress" }) },
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
                  entityLabel={t("vulnerabilities")}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Add Vulnerability")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t("Title")}</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <Label>{t("CVE ID")}</Label>
              <Input value={form.cveId} onChange={(e) => setForm((f) => ({ ...f, cveId: e.target.value }))} />
            </div>
            <div>
              <Label>{t("Asset / System")}</Label>
              <Input value={form.assetName} onChange={(e) => setForm((f) => ({ ...f, assetName: e.target.value }))} />
            </div>
            <div>
              <Label>{t("Severity")}</Label>
              <Select value={form.severity} onValueChange={(v) => setForm((f) => ({ ...f, severity: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPLIANCE_VULN_SEVERITIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("Due date")}</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button onClick={() => void save()} disabled={saving} style={{ backgroundColor: COMPLIANCE_BRAND }} className="text-white">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={detailId != null} onOpenChange={(o) => !o && setDetailId(null)}>
        <SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-[520px]">
          {detailLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : detail ? (
            <>
              <SheetHeader className="border-b px-6 py-4 text-left">
                <div className="flex items-start gap-3 pr-8">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100">
                    <Bug className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <SheetTitle className="text-lg leading-tight">{detail.item.title}</SheetTitle>
                      <VulnerabilitySeverityBadge severity={detail.item.severity} />
                    </div>
                    {detail.item.cveId ? (
                      <p className="mt-1 text-sm text-muted-foreground">{detail.item.cveId}</p>
                    ) : null}
                  </div>
                </div>
              </SheetHeader>

              <Tabs value={detailTab} onValueChange={setDetailTab} className="flex min-h-0 flex-1 flex-col">
                <TabsList className="mx-6 mt-3 h-auto w-auto justify-start gap-1 rounded-none border-b bg-transparent p-0">
                  {[
                    { id: "overview", label: t("Overview") },
                    { id: "remediation", label: t("Remediation") },
                    { id: "activity", label: t("Activity") },
                    { id: "references", label: t("References") },
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
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("Description")}
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground">{detail.item.description}</p>
                    </div>

                    <div className="rounded-lg border bg-muted/20 p-4">
                      <MetaRow label={t("Affected System")}>
                        <Link href="/compliance/monitors" className="text-primary hover:underline">
                          {detail.item.systemName} ({detail.item.environment})
                        </Link>
                      </MetaRow>
                      <MetaRow label={t("Severity")}>
                        <VulnerabilitySeverityBadge severity={detail.item.severity} />
                      </MetaRow>
                      <MetaRow label={t("CVSS Score")}>
                        <span className="tabular-nums">{detail.item.cvssScore}</span>
                      </MetaRow>
                      <MetaRow label={t("Status")}>
                        <VulnerabilityStatusBadge status={detail.item.status} />
                      </MetaRow>
                      <MetaRow label={t("Discovered")}>
                        <ComplianceDate value={detail.item.discoveredAt} />
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
                      <MetaRow label={t("Due Date")}>
                        <span className={cn(detail.item.dueIn?.includes("overdue") && "text-red-600")}>
                          {detail.item.dueDate ? (
                            <>
                              <ComplianceDate value={detail.item.dueDate} />
                              {detail.item.dueIn ? (
                                <span className="ml-1 text-xs">({detail.item.dueIn})</span>
                              ) : null}
                            </>
                          ) : (
                            "—"
                          )}
                        </span>
                      </MetaRow>
                      <MetaRow label={t("First Detected")}>
                        <ComplianceDate value={detail.item.firstDetectedAt} />
                      </MetaRow>
                      <MetaRow label={t("Last Seen")}>
                        <ComplianceDate value={detail.item.lastSeenAt} />
                      </MetaRow>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("Risk Impact")}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-lg border bg-muted/20 p-3 text-center">
                          <p className="text-xs text-muted-foreground">{t("Likelihood")}</p>
                          <p className="mt-1 text-sm font-semibold text-amber-600">{detail.item.likelihood}</p>
                        </div>
                        <div className="rounded-lg border bg-muted/20 p-3 text-center">
                          <p className="text-xs text-muted-foreground">{t("Impact")}</p>
                          <p className="mt-1 text-sm font-semibold text-red-600">{detail.item.impact}</p>
                        </div>
                        <div className="rounded-lg border bg-red-50 p-3 text-center dark:bg-red-950/30">
                          <p className="text-xs text-muted-foreground">{t("Risk Score")}</p>
                          <p className="mt-1 text-xl font-bold tabular-nums text-red-600">{detail.item.riskScore}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("Related Assets")}
                      </p>
                      <div className="divide-y rounded-lg border">
                        {detail.relatedAssets.map((asset) => (
                          <div key={asset.hostname} className="flex items-center justify-between px-4 py-3 text-sm">
                            <span className="font-mono text-xs">{asset.hostname}</span>
                            <span className="text-muted-foreground">{asset.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("Linked Items")}
                      </p>
                      <div className="divide-y rounded-lg border">
                        <Link
                          href="/compliance/risks"
                          className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/40"
                        >
                          <span>
                            <span className="font-medium">{t("Related Risks")}</span>
                            <span className="ml-2 text-muted-foreground">({detail.linkedCounts.risks})</span>
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </Link>
                        <Link
                          href="/compliance/controls"
                          className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/40"
                        >
                          <span>
                            <span className="font-medium">{t("Related Controls")}</span>
                            <span className="ml-2 text-muted-foreground">({detail.linkedCounts.controls})</span>
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </Link>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="remediation" className="mt-0 space-y-4">
                    <div>
                      <Label>{t("Remediation workflow")}</Label>
                      <ul className="mt-2 space-y-2">
                        {(detail.item.remediationSteps ?? []).map((step, i) => (
                          <li key={i} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                            <span>{step.step}</span>
                            <VulnerabilityStatusBadge status={step.status === "complete" ? "remediated" : step.status} />
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() =>
                        void patchVuln(detail.item.id, {
                          remediationSteps: [
                            ...(detail.item.remediationSteps ?? []),
                            { step: "Verify patch deployment", status: "open" },
                          ],
                        })
                      }
                    >
                      {t("Add remediation step")}
                    </Button>
                    <Select
                      value={detail.item.status}
                      onValueChange={(v) => void patchVuln(detail.item.id, { status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPLIANCE_VULN_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TabsContent>

                  <TabsContent value="activity" className="mt-0">
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

                  <TabsContent value="references" className="mt-0 space-y-3">
                    {detail.item.cveId ? (
                      <a
                        href={`https://nvd.nist.gov/vuln/detail/${detail.item.cveId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm hover:bg-muted/40"
                      >
                        <span className="font-medium">NVD — {detail.item.cveId}</span>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </a>
                    ) : null}
                    <a
                      href="https://www.cisa.gov/known-exploited-vulnerabilities-catalog"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm hover:bg-muted/40"
                    >
                      <span className="font-medium">{t("CISA Known Exploited Vulnerabilities")}</span>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </a>
                  </TabsContent>
                </div>
              </Tabs>

              <div className="flex shrink-0 gap-2 border-t px-6 py-4">
                <Button variant="outline" className="flex-1" onClick={() => toast.message(t("Ticket creation coming soon."))}>
                  <Ticket className="mr-1.5 h-4 w-4" />
                  {t("Create Ticket")}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={saving || detail.item.status === "remediated"}
                  onClick={() => void patchVuln(detail.item.id, { status: "remediated" })}
                >
                  <Check className="mr-1.5 h-4 w-4" />
                  {t("Mark as Resolved")}
                </Button>
                <Button
                  className="flex-1 text-white"
                  style={{ backgroundColor: COMPLIANCE_BRAND }}
                  onClick={() => setDetailTab("remediation")}
                >
                  {t("View Remediation")}
                </Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
