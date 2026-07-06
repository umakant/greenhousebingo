"use client";

import * as React from "react";
import {
  Building2,
  Calendar,
  ClipboardCheck,
  Download,
  FileText,
  Filter,
  Loader2,
  MessageSquarePlus,
  Plus,
  Search,
  Shield,
  Upload,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import {
  AuditDisplayStatusBadge,
  AuditTypeBadge,
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
  COMPLIANCE_DONUT_COLORS,
  DonutWithLegend,
  type DonutSlice,
} from "@/components/compliance/compliance-donut-chart";
import {
  ComplianceDate,
  ComplianceDateField,
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
import { COMPLIANCE_AUDIT_STATUSES, COMPLIANCE_AUDIT_TYPES } from "@/lib/compliance/compliance-day2";
import { progressBarColor, tabMatchesAudit, type AuditDisplayStatus } from "@/lib/compliance/compliance-audits";
import { cn } from "@/lib/utils";

type AuditRow = {
  id: number;
  name: string;
  subtitle: string;
  auditType: string;
  typeLabel: string;
  typeCategory: string;
  status: string;
  displayStatus: AuditDisplayStatus;
  auditorName: string | null;
  auditorPersonName: string;
  auditorCompanyName: string;
  startDate: string | null;
  endDate: string | null;
  scope: string;
  frameworkName: string | null;
  progressPct: number;
  findingsCount: number;
  findings: Array<{ id: string; title: string; severity: string; status: string }>;
  requests: Array<{ id: string; title: string; status: string }>;
  evidencePackages: Array<{ id: string; name: string }>;
  finalReportUrl: string | null;
};

type AuditDetail = {
  item: AuditRow & {
    endIn: string | null;
    milestones: Array<{ title: string; date: string; relative: string; tone: string }>;
    taskBreakdown: { completed: number; inProgress: number; notStarted: number; overdue: number; total: number };
    requestsCount: number;
    evidencePackagesCount: number;
  };
  auditorInvites: Array<{ id: number; auditorName: string; portalUrl?: string }>;
  history: Array<{ id: number; action: string; actorName: string | null; createdAt: string }>;
};

const AUDIT_TABS = [
  { id: "all", label: "All Audits" },
  { id: "internal", label: "Internal" },
  { id: "external", label: "External" },
  { id: "upcoming", label: "Upcoming" },
  { id: "in_progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
  { id: "overdue", label: "Overdue" },
] as const;

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

function statDotColor(tone: string) {
  if (tone === "danger") return "bg-red-500";
  if (tone === "warning") return "bg-amber-500";
  if (tone === "success") return "bg-emerald-500";
  if (tone === "info") return "bg-blue-500";
  if (tone === "purple") return "bg-violet-500";
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

function AuditIcon({ auditType, className }: { auditType: string; className?: string }) {
  if (auditType === "internal") return <Building2 className={cn("h-4 w-4 text-emerald-600", className)} />;
  if (auditType.includes("soc2") || auditType.includes("iso")) {
    return <Shield className={cn("h-4 w-4 text-violet-600", className)} />;
  }
  return <FileText className={cn("h-4 w-4 text-blue-600", className)} />;
}

function AuditProgressBar({ value, displayStatus }: { value: number; displayStatus: string }) {
  const pctVal = Math.max(0, Math.min(100, value));
  const color = progressBarColor(displayStatus as Parameters<typeof progressBarColor>[0]);
  return (
    <div className="flex min-w-[100px] items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full transition-all" style={{ width: `${pctVal}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{pctVal}%</span>
    </div>
  );
}

function taskDonutSlices(breakdown: AuditDetail["item"]["taskBreakdown"]): DonutSlice[] {
  return [
    { name: t("Completed"), value: breakdown.completed, color: COMPLIANCE_DONUT_COLORS.green },
    { name: t("In Progress"), value: breakdown.inProgress, color: COMPLIANCE_DONUT_COLORS.blue },
    { name: t("Not Started"), value: breakdown.notStarted, color: COMPLIANCE_DONUT_COLORS.gray },
    { name: t("Overdue"), value: breakdown.overdue, color: COMPLIANCE_DONUT_COLORS.red },
  ].filter((s) => s.value > 0);
}

export function ComplianceAuditsClient() {
  const { fmtDate } = useComplianceFormat();
  const [loading, setLoading] = React.useState(true);
  const [allItems, setAllItems] = React.useState<AuditRow[]>([]);
  const [auditorOptions, setAuditorOptions] = React.useState<string[]>([]);
  const [scopeOptions, setScopeOptions] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [auditorFilter, setAuditorFilter] = React.useState("all");
  const [scopeFilter, setScopeFilter] = React.useState("all");
  const [activeTab, setActiveTab] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [detailId, setDetailId] = React.useState<number | null>(null);
  const [detail, setDetail] = React.useState<AuditDetail | null>(null);
  const [detailTab, setDetailTab] = React.useState("overview");
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [inviteUrl, setInviteUrl] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    name: "",
    auditType: "soc2_type_ii",
    auditorName: "",
    startDate: "",
    endDate: "",
  });

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (typeFilter !== "all") params.set("auditType", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (auditorFilter !== "all") params.set("auditor", auditorFilter);
      if (scopeFilter !== "all") params.set("scope", scopeFilter);
      const res = await fetch(`/api/compliance/audits?${params}`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        items?: AuditRow[];
        auditors?: string[];
        scopes?: string[];
      };
      if (res.ok && data?.ok) {
        setAllItems(data.items ?? []);
        setAuditorOptions(data.auditors ?? []);
        setScopeOptions(data.scopes ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, statusFilter, auditorFilter, scopeFilter]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [search, typeFilter, statusFilter, auditorFilter, scopeFilter, activeTab, perPage]);

  const items = React.useMemo(
    () => allItems.filter((row) => tabMatchesAudit(row, activeTab)),
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
    const inProgress = allItems.filter((i) => i.displayStatus === "in_progress").length;
    const upcoming = allItems.filter((i) => i.displayStatus === "upcoming").length;
    const completed = allItems.filter((i) => i.displayStatus === "completed").length;
    const overdue = allItems.filter((i) => i.displayStatus === "overdue").length;
    return [
      { label: t("Total Audits"), value: base, hint: t("All time"), tone: "default" as const },
      { label: t("In Progress"), value: inProgress, hint: pct(inProgress, base), tone: "info" as const },
      { label: t("Upcoming"), value: upcoming, hint: pct(upcoming, base), tone: "purple" as const },
      { label: t("Completed"), value: completed, hint: pct(completed, base), tone: "success" as const },
      { label: t("Overdue"), value: overdue, hint: pct(overdue, base), tone: "danger" as const },
    ];
  }, [allItems]);

  const openDetail = async (id: number) => {
    setDetailId(id);
    setDetailTab("overview");
    setDetailLoading(true);
    setDetail(null);
    setInviteUrl(null);
    try {
      const res = await fetch(`/api/compliance/audits/${id}`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as AuditDetail & {
        ok?: boolean;
        item?: AuditDetail["item"];
        auditorInvite?: { portalUrl: string };
      };
      if (res.ok && data?.ok && data.item) {
        setDetail({
          item: data.item,
          auditorInvites: data.auditorInvites ?? [],
          history: data.history ?? [],
        });
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error(t("Audit name required"));
    setSaving(true);
    try {
      const res = await fetch("/api/compliance/audits", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success(t("Audit scheduled"));
        setDialogOpen(false);
        setForm({ name: "", auditType: "soc2_type_ii", auditorName: "", startDate: "", endDate: "" });
        void load();
      }
    } finally {
      setSaving(false);
    }
  };

  const patchAudit = async (id: number, payload: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/compliance/audits/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        auditorInvite?: { portalUrl: string };
      };
      if (res.ok) {
        toast.success(t("Audit updated"));
        if (data?.auditorInvite?.portalUrl) {
          setInviteUrl(data.auditorInvite.portalUrl);
          toast.success(t("Auditor invite created"));
        }
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
    const header = ["Audit", "Type", "Scope", "Auditor", "Status", "Start", "End", "Progress", "Findings"];
    const rows = items.map((r) => [
      r.name,
      r.typeLabel,
      r.scope,
      r.auditorPersonName,
      r.displayStatus,
      r.startDate ? fmtDate(r.startDate) : "",
      r.endDate ? fmtDate(r.endDate) : "",
      `${r.progressPct}%`,
      r.findingsCount,
    ]);
    const csv = [header, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "compliance-audits.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <ComplianceSectionShell
        title={t("Audits")}
        description={t("Plan, track, and report on internal and external audits.")}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => toast.message(t("Audit calendar coming soon."))}>
              <Calendar className="mr-1.5 h-4 w-4" />
              {t("Audit Calendar")}
            </Button>
            <CompliancePrimaryButton type="button" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("Schedule Audit")}
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
                      s.tone === "danger" && "text-red-600",
                      s.tone === "info" && "text-blue-600",
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

          <Card className={complianceCardClass}>
            <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-9 w-[140px] bg-background">
                    <SelectValue placeholder={t("All Types")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All Types")}</SelectItem>
                    {COMPLIANCE_AUDIT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
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
                    {COMPLIANCE_AUDIT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={auditorFilter} onValueChange={setAuditorFilter}>
                  <SelectTrigger className="h-9 w-[150px] bg-background">
                    <SelectValue placeholder={t("All Auditors")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All Auditors")}</SelectItem>
                    {auditorOptions.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={scopeFilter} onValueChange={setScopeFilter}>
                  <SelectTrigger className="h-9 w-[150px] bg-background">
                    <SelectValue placeholder={t("All Systems")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All Systems")}</SelectItem>
                    {scopeOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative min-w-[220px] flex-1 lg:max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-9 bg-background pl-8"
                    placeholder={t("Search audits...")}
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
              {AUDIT_TABS.map((tab) => (
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
                  <ClipboardCheck className="mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="font-medium">{t("No audits planned")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("Manage SOC 2, HIPAA, ISO 27001, GDPR, and NIST CSF audit windows.")}
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
                        <th className="px-4 py-3">{t("Audit Name")}</th>
                        <th className="px-4 py-3">{t("Type")}</th>
                        <th className="px-4 py-3">{t("System / Scope")}</th>
                        <th className="px-4 py-3">{t("Auditor")}</th>
                        <th className="px-4 py-3">{t("Status")}</th>
                        <th className="px-4 py-3">{t("Start Date")}</th>
                        <th className="px-4 py-3">{t("End Date")}</th>
                        <th className="px-4 py-3">{t("Progress")}</th>
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
                              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                                <AuditIcon auditType={row.auditType} />
                              </div>
                              <div>
                                <p className="font-medium">{row.name}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">{row.subtitle}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <AuditTypeBadge auditType={row.auditType} />
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground">{row.scope}</td>
                          <td className="px-4 py-3.5">
                            <span className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                                  {ownerInitials(row.auditorPersonName)}
                                </AvatarFallback>
                              </Avatar>
                              <span>
                                <span className="block font-medium">{row.auditorPersonName}</span>
                                <span className="text-xs text-muted-foreground">{row.auditorCompanyName}</span>
                              </span>
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <AuditDisplayStatusBadge displayStatus={row.displayStatus} />
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground">
                            <ComplianceDate value={row.startDate} />
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground">
                            <ComplianceDate value={row.endDate} />
                          </td>
                          <td className="px-4 py-3.5">
                            <AuditProgressBar value={row.progressPct} displayStatus={row.displayStatus} />
                          </td>
                          <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <ComplianceRowActions
                              label={t("View")}
                              onView={() => void openDetail(row.id)}
                              items={[
                                { label: "Complete", onSelect: () => void patchAudit(row.id, { status: "completed" }) },
                                {
                                  label: "Invite auditor",
                                  onSelect: () =>
                                    void patchAudit(row.id, {
                                      inviteAuditor: { auditorName: row.auditorPersonName },
                                    }),
                                },
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
                  entityLabel={t("audits")}
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
            <DialogTitle>{t("Schedule Audit")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t("Name")}</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>{t("Audit type")}</Label>
              <Select value={form.auditType} onValueChange={(v) => setForm((f) => ({ ...f, auditType: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPLIANCE_AUDIT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("Auditor")}</Label>
              <Input
                value={form.auditorName}
                onChange={(e) => setForm((f) => ({ ...f, auditorName: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ComplianceDateField
                label={t("Start")}
                value={form.startDate}
                onChange={(v) => setForm((f) => ({ ...f, startDate: v }))}
              />
              <ComplianceDateField
                label={t("End")}
                value={form.endDate}
                onChange={(v) => setForm((f) => ({ ...f, endDate: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button
              onClick={() => void save()}
              disabled={saving}
              style={{ backgroundColor: COMPLIANCE_BRAND }}
              className="text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Create")}
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
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                    <AuditIcon auditType={detail.item.auditType} className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <SheetTitle className="text-lg leading-tight">{detail.item.name}</SheetTitle>
                      <AuditDisplayStatusBadge displayStatus={detail.item.displayStatus} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{detail.item.subtitle}</p>
                  </div>
                </div>
              </SheetHeader>

              <Tabs value={detailTab} onValueChange={setDetailTab} className="flex min-h-0 flex-1 flex-col">
                <TabsList className="mx-6 mt-3 h-auto w-auto justify-start gap-1 rounded-none border-b bg-transparent p-0">
                  {[
                    { id: "overview", label: t("Overview") },
                    { id: "findings", label: t("Findings") },
                    { id: "evidence", label: t("Evidence") },
                    { id: "activity", label: t("Activity") },
                    { id: "reports", label: t("Reports") },
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
                      <MetaRow label={t("Type")}>
                        <AuditTypeBadge auditType={detail.item.auditType} />
                      </MetaRow>
                      <MetaRow label={t("Framework")}>
                        <span>{detail.item.frameworkName ?? detail.item.typeLabel}</span>
                      </MetaRow>
                      <MetaRow label={t("Auditor")}>
                        <span className="flex items-center justify-end gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="bg-primary/10 text-xs text-primary">
                              {ownerInitials(detail.item.auditorPersonName)}
                            </AvatarFallback>
                          </Avatar>
                          <span>
                            {detail.item.auditorPersonName}
                            <span className="block text-xs font-normal text-muted-foreground">
                              {detail.item.auditorCompanyName}
                            </span>
                          </span>
                        </span>
                      </MetaRow>
                      <MetaRow label={t("Scope")}>
                        <span>{detail.item.scope}</span>
                      </MetaRow>
                      <MetaRow label={t("Start Date")}>
                        <ComplianceDate value={detail.item.startDate} />
                      </MetaRow>
                      <MetaRow label={t("End Date")}>
                        <span className={cn(detail.item.endIn?.includes("overdue") && "text-amber-600")}>
                          <ComplianceDate value={detail.item.endDate} />
                          {detail.item.endIn ? (
                            <span className="ml-1 text-xs">({detail.item.endIn})</span>
                          ) : null}
                        </span>
                      </MetaRow>
                      <MetaRow label={t("Findings")}>
                        <span>{detail.item.findingsCount}</span>
                      </MetaRow>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("Overall Progress")}
                      </p>
                      <AuditProgressBar
                        value={detail.item.progressPct}
                        displayStatus={detail.item.displayStatus}
                      />
                    </div>

                    <div>
                      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("Progress Overview")}
                      </p>
                      <DonutWithLegend
                        data={taskDonutSlices(detail.item.taskBreakdown)}
                        centerLabel={String(detail.item.taskBreakdown.total)}
                        size={140}
                      />
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("Upcoming Milestones")}
                      </p>
                      <div className="space-y-0 border-l-2 border-muted pl-4">
                        {detail.item.milestones.map((m) => (
                          <div key={m.title} className="relative pb-4 last:pb-0">
                            <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-background ring-2 ring-muted" />
                            <p className="text-sm font-medium">{m.title}</p>
                            <p className="text-xs text-muted-foreground">
                              <ComplianceDate value={m.date} />
                              {m.relative ? (
                                <span
                                  className={cn(
                                    "ml-1",
                                    m.tone === "warning" && "text-amber-600",
                                    m.tone === "info" && "text-blue-600",
                                  )}
                                >
                                  · {m.relative}
                                </span>
                              ) : null}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="findings" className="mt-0 space-y-3">
                    {(detail.item.findings ?? []).length ? (
                      <ul className="divide-y rounded-lg border">
                        {detail.item.findings.map((f) => (
                          <li key={f.id} className="px-4 py-3 text-sm">
                            <p className="font-medium">{f.title}</p>
                            <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                              {f.severity} · {f.status.replace(/_/g, " ")}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("No findings recorded yet.")}</p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        void patchAudit(detail.item.id, {
                          addFinding: { title: "New audit finding", severity: "medium" },
                        })
                      }
                    >
                      {t("Add finding")}
                    </Button>
                  </TabsContent>

                  <TabsContent value="evidence" className="mt-0 space-y-4">
                    <div>
                      <p className="mb-2 text-sm font-medium">
                        {t("Evidence requests")} ({detail.item.requestsCount})
                      </p>
                      <ul className="space-y-1 text-sm">
                        {(detail.item.requests ?? []).map((r) => (
                          <li key={r.id} className="rounded border px-3 py-2">
                            {r.title}
                          </li>
                        ))}
                      </ul>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() =>
                          void patchAudit(detail.item.id, {
                            addRequest: { title: "Additional evidence needed" },
                          })
                        }
                      >
                        {t("Add request")}
                      </Button>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium">
                        {t("Evidence packages")} ({detail.item.evidencePackagesCount})
                      </p>
                      <ul className="space-y-1 text-sm">
                        {(detail.item.evidencePackages ?? []).map((p) => (
                          <li key={p.id} className="rounded border px-3 py-2">
                            {p.name}
                          </li>
                        ))}
                      </ul>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() =>
                          void patchAudit(detail.item.id, {
                            addEvidencePackage: { name: `Package ${Date.now()}` },
                          })
                        }
                      >
                        {t("Create evidence package")}
                      </Button>
                    </div>
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() =>
                        void patchAudit(detail.item.id, {
                          inviteAuditor: { auditorName: detail.item.auditorPersonName },
                        })
                      }
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      {t("Assign auditor portal access")}
                    </Button>
                    {inviteUrl ? (
                      <p className="break-all text-xs text-primary">
                        {t("Portal")}: {inviteUrl}
                      </p>
                    ) : null}
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

                  <TabsContent value="reports" className="mt-0 space-y-3">
                    <div>
                      <Label>{t("Final report URL")}</Label>
                      <Input
                        className="mt-1"
                        defaultValue={detail.item.finalReportUrl ?? ""}
                        onBlur={(e) => void patchAudit(detail.item.id, { finalReportUrl: e.target.value })}
                      />
                    </div>
                    <Select
                      value={detail.item.status}
                      onValueChange={(v) => void patchAudit(detail.item.id, { status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPLIANCE_AUDIT_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TabsContent>
                </div>
              </Tabs>

              <div className="flex shrink-0 gap-2 border-t px-6 py-4">
                <Button variant="outline" className="flex-1" onClick={() => toast.message(t("Audit plan coming soon."))}>
                  {t("View Plan")}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setDetailTab("evidence")}>
                  <Upload className="mr-1.5 h-4 w-4" />
                  {t("Upload Evidence")}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => toast.message(t("Notes coming soon."))}>
                  <MessageSquarePlus className="mr-1.5 h-4 w-4" />
                  {t("Add Note")}
                </Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
