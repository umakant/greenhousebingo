"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Download,
  Filter,
  ImagePlus,
  Layers,
  Loader2,
  Plus,
  Search,
  Shield,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { ComplianceStatusBadge } from "@/components/compliance/compliance-status-badge";
import { ComplianceFrameworkIcon } from "@/components/compliance/compliance-framework-icon";
import {
  COMPLIANCE_BRAND,
  CompliancePrimaryButton,
  ComplianceRowActions,
  ComplianceSectionShell,
  complianceCardClass,
  complianceTableHeadClass,
  complianceTableRowClass,
} from "@/components/compliance/compliance-ui";
import { ComplianceDate, complianceRelativeTime, useComplianceFormat } from "@/components/compliance/compliance-shared";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  COMPLIANCE_FRAMEWORK_RECOMMENDATIONS,
  COMPLIANCE_SOC2_TRUST_CRITERIA,
} from "@/lib/compliance/compliance-frameworks";
import { cn } from "@/lib/utils";

type FrameworkRow = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  category: string;
  tags: string[];
  status: string;
  progressPct: number;
  auditReadyPct: number;
  readinessScore: number;
  ownerUserId: number | null;
  ownerName: string | null;
  iconUrl: string | null;
  controlCount: number;
  controlsImplemented: number;
  evidenceCount: number;
  riskCount: number;
  updatedAt: string | null;
};

type FrameworkDetail = {
  item: FrameworkRow;
  controls: Array<{ id: number; controlCode: string; title: string; status: string; evidenceCount: number }>;
  evidence: Array<{ id: number; title: string; status: string }>;
  risks: Array<{ id: number; title: string; severity: string }>;
  history: Array<{ id: number; action: string; actorName: string | null; createdAt: string }>;
  nextAudit: {
    id: number;
    name: string;
    auditType: string;
    startDate: string | null;
    endDate: string | null;
    daysRemaining: number | null;
  } | null;
};

function scoreBarColor(pct: number) {
  if (pct >= 80) return "#22c55e";
  if (pct >= 60) return "#f59e0b";
  return "#f97316";
}

function frameworkLastUpdated(value: string | null | undefined): string {
  if (!value) return "—";
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  if (days <= 0) return t("Today");
  if (days === 1) return t("1 day ago");
  if (days < 7) return `${days} ${t("days ago")}`;
  if (days < 14) return t("1 week ago");
  if (days < 30) return `${Math.floor(days / 7)} ${t("weeks ago")}`;
  return complianceRelativeTime(value);
}

function ownerInitials(name: string | null | undefined) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function activityLabel(action: string) {
  const labels: Record<string, string> = {
    framework_updated: t("Framework updated"),
    framework_owner_assigned: t("Owner assigned"),
    framework_icon_updated: t("Icon updated"),
    framework_created: t("Framework created"),
    evidence_approved: t("Evidence approved"),
    control_tested: t("Control tested"),
  };
  return labels[action] ?? action.replace(/_/g, " ");
}

function FrameworkScoreBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex min-w-[120px] items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: scoreBarColor(pct) }}
        />
      </div>
      <span className="w-9 shrink-0 text-right text-xs font-medium tabular-nums">{pct}%</span>
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

export function ComplianceFrameworksClient() {
  const { fmtDate } = useComplianceFormat();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<FrameworkRow[]>([]);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [detailId, setDetailId] = React.useState<number | null>(null);
  const [detail, setDetail] = React.useState<FrameworkDetail | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailTab, setDetailTab] = React.useState("overview");
  const [ownerInput, setOwnerInput] = React.useState("");
  const [iconUrlInput, setIconUrlInput] = React.useState("");
  const [savingOwner, setSavingOwner] = React.useState(false);
  const [savingIcon, setSavingIcon] = React.useState(false);
  const iconFileRef = React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/compliance/frameworks", { credentials: "include" });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; items?: FrameworkRow[]; message?: string };
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? t("Failed to load frameworks"));
        setItems([]);
        return;
      }
      setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const categories = React.useMemo(
    () => [...new Set(items.map((i) => i.category).filter(Boolean))].sort(),
    [items],
  );

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (categoryFilter !== "all" && i.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        i.name.toLowerCase().includes(q) ||
        i.code.toLowerCase().includes(q) ||
        (i.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, search, statusFilter, categoryFilter]);

  const stats = React.useMemo(() => {
    const avg =
      items.length > 0
        ? Math.round(items.reduce((s, i) => s + i.auditReadyPct, 0) / items.length)
        : 0;
    return [
      {
        label: t("Total Frameworks"),
        value: items.length,
        hint: t("Active frameworks"),
      },
      {
        label: t("Average Score"),
        value: `${avg}%`,
        hint: t("Across all frameworks"),
      },
      {
        label: t("Ready for Audit"),
        value: items.filter((i) => i.auditReadyPct >= 80).length,
        hint: t("Frameworks"),
        tone: "success" as const,
      },
      {
        label: t("At Risk"),
        value: items.filter((i) => i.status === "active" && i.auditReadyPct < 60).length,
        hint: t("Frameworks"),
        tone: "warning" as const,
      },
      {
        label: t("Not Started"),
        value: items.filter((i) => i.status === "not_started" || i.progressPct === 0).length,
        hint: t("Frameworks"),
      },
    ];
  }, [items]);

  const openDetail = async (id: number) => {
    setDetailId(id);
    setDetailTab("overview");
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetch(`/api/compliance/frameworks/${id}`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as FrameworkDetail & { ok?: boolean };
      if (res.ok && data?.ok) {
        setDetail(data);
        setOwnerInput(data.item.ownerUserId ? String(data.item.ownerUserId) : "");
        setIconUrlInput(data.item.iconUrl ?? "");
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const assignOwner = async () => {
    if (!detailId) return;
    setSavingOwner(true);
    try {
      const res = await fetch(`/api/compliance/frameworks/${detailId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerUserId: ownerInput ? Number(ownerInput) : null }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Failed to assign owner");
        return;
      }
      toast.success("Owner assigned");
      void openDetail(detailId);
      void load();
    } finally {
      setSavingOwner(false);
    }
  };

  const saveIconUrl = async (url: string | null) => {
    if (!detailId) return;
    setSavingIcon(true);
    try {
      const res = await fetch(`/api/compliance/frameworks/${detailId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iconUrl: url }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? t("Failed to update icon"));
        return;
      }
      toast.success(url ? t("Framework icon updated") : t("Framework icon removed"));
      setIconUrlInput(url ?? "");
      void openDetail(detailId);
      void load();
    } finally {
      setSavingIcon(false);
    }
  };

  const uploadIconFile = async (file: File) => {
    setSavingIcon(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/compliance/frameworks/icon-upload", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; url?: string; message?: string };
      if (!res.ok || !data?.ok || !data.url) {
        toast.error(data?.message ?? t("Upload failed"));
        return;
      }
      await saveIconUrl(data.url);
    } finally {
      setSavingIcon(false);
    }
  };

  const exportCsv = () => {
    const header = ["Framework", "Status", "Score", "Controls", "Evidence", "Last Updated"];
    const rows = filtered.map((r) => [
      r.name,
      r.status,
      `${r.auditReadyPct}%`,
      `${r.controlsImplemented}/${r.controlCount}`,
      String(r.evidenceCount),
      r.updatedAt ? fmtDate(r.updatedAt) : "",
    ]);
    const csv = [header, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "compliance-frameworks.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <ComplianceSectionShell
        title={t("Frameworks")}
        description={t("Manage and track compliance frameworks your organization is working toward.")}
        stats={stats}
        actions={
          <CompliancePrimaryButton type="button" onClick={() => toast.message(t("Use framework details to enable programs."))}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t("Add Framework")}
          </CompliancePrimaryButton>
        }
      >
        <div className="space-y-6">
          {/* Toolbar */}
          <Card className={cn(complianceCardClass, "p-4")}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-[140px] bg-background">
                    <SelectValue placeholder={t("All Statuses")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All Statuses")}</SelectItem>
                    <SelectItem value="active">{t("Active")}</SelectItem>
                    <SelectItem value="not_started">{t("Not Started")}</SelectItem>
                    <SelectItem value="draft">{t("Draft")}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-9 w-[150px] bg-background">
                    <SelectValue placeholder={t("All Categories")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All Categories")}</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative min-w-[220px] flex-1 lg:max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-9 bg-background pl-8"
                    placeholder={t("Search frameworks...")}
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
                <Button size="sm" variant="outline" onClick={exportCsv} disabled={!filtered.length}>
                  <Download className="mr-1.5 h-4 w-4" />
                  {t("Export")}
                </Button>
              </div>
            </div>
          </Card>

          {/* Table */}
          <Card className={cn(complianceCardClass, "overflow-hidden")}>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Layers className="mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="font-medium">{t("No frameworks")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("Enable compliance frameworks to track readiness and control mappings.")}
                  </p>
                </div>
              ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
                      <tr className={complianceTableHeadClass}>
                        <th className="px-4 py-3">{t("Framework")}</th>
                        <th className="px-4 py-3">{t("Status")}</th>
                        <th className="px-4 py-3">{t("Score")}</th>
                        <th className="px-4 py-3">{t("Controls")}</th>
                        <th className="px-4 py-3">{t("Evidence")}</th>
                        <th className="px-4 py-3">{t("Last Updated")}</th>
                        <th className="px-4 py-3 w-12" />
              </tr>
            </thead>
            <tbody>
                      {filtered.map((row) => (
                        <tr
                          key={row.id}
                          className={cn(
                            complianceTableRowClass,
                            "cursor-pointer",
                            detailId === row.id && "bg-[#E31B23]/5",
                          )}
                          onClick={() => void openDetail(row.id)}
                        >
                  <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <ComplianceFrameworkIcon code={row.code} iconUrl={row.iconUrl} />
                              <div className="min-w-0">
                                <div className="font-semibold">{row.name}</div>
                                <div className="line-clamp-1 text-xs text-muted-foreground">{row.description}</div>
                              </div>
                            </div>
                  </td>
                  <td className="px-4 py-3">
                    <ComplianceStatusBadge status={row.status} />
                  </td>
                          <td className="px-4 py-3.5">
                            <FrameworkScoreBar value={row.auditReadyPct} />
                          </td>
                          <td className="px-4 py-3.5 tabular-nums text-muted-foreground">
                            {row.controlsImplemented} {t("of")} {row.controlCount}
                          </td>
                          <td className="px-4 py-3.5 tabular-nums">{row.evidenceCount}</td>
                          <td className="px-4 py-3.5 text-muted-foreground">
                            {frameworkLastUpdated(row.updatedAt)}
                  </td>
                          <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <ComplianceRowActions
                              label={t("View")}
                              onView={() => void openDetail(row.id)}
                              items={[
                                { label: "View controls", href: `/compliance/controls?framework=${row.id}` },
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
          </Card>

          {/* Recommendations */}
          <section className="space-y-4">
            <h3 className="text-base font-semibold">{t("Framework Recommendations")}</h3>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {COMPLIANCE_FRAMEWORK_RECOMMENDATIONS.map((rec) => (
                <Card key={rec.code} className={cn(complianceCardClass, "overflow-hidden")}>
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="mb-3 flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
                        style={{ backgroundColor: COMPLIANCE_BRAND }}
                      >
                        <Shield className="h-5 w-5" />
                      </div>
                      <span className="font-semibold leading-tight">{rec.name}</span>
                    </div>
                    <p className="mb-5 flex-1 text-sm leading-relaxed text-muted-foreground">{rec.description}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => toast.message(`${rec.name} — ${t("contact your admin to enable.")}`)}
                    >
                      {t("Explore")}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </ComplianceSectionShell>

      {/* Detail drawer */}
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
                  <ComplianceFrameworkIcon code={detail.item.code} iconUrl={detail.item.iconUrl} />
                  <div>
                    <SheetTitle className="text-lg">{detail.item.name}</SheetTitle>
                    <p className="mt-0.5 text-sm text-muted-foreground">{detail.item.description}</p>
                    <div className="mt-2">
                      <ComplianceStatusBadge status={detail.item.status} />
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <Tabs value={detailTab} onValueChange={setDetailTab} className="flex min-h-0 flex-1 flex-col">
                <TabsList className="mx-6 mt-3 h-auto w-auto justify-start gap-1 rounded-none border-b bg-transparent p-0">
                  {["overview", "controls", "evidence", "risks", "settings"].map((tab) => (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="rounded-none border-b-2 border-transparent px-3 pb-2 capitalize data-[state=active]:border-[#E31B23] data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >
                      {t(tab)}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                  <TabsContent value="overview" className="mt-0 space-y-5">
                    <div className="rounded-lg border bg-muted/20 p-4">
                      <MetaRow label={t("Description")}>
                        <span className="max-w-[240px] text-right text-sm font-normal leading-relaxed text-muted-foreground">
                          {detail.item.description ?? "—"}
                        </span>
                      </MetaRow>
                      <MetaRow label={t("Category")}>{detail.item.category}</MetaRow>
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
                        <ComplianceStatusBadge status={detail.item.status} />
                      </MetaRow>
                      <MetaRow label={t("Score")}>
                        <FrameworkScoreBar value={detail.item.auditReadyPct} />
                      </MetaRow>
                      <MetaRow label={t("Controls")}>
                        {detail.item.controlsImplemented} {t("of")} {detail.item.controlCount}
                      </MetaRow>
                      <MetaRow label={t("Evidence Items")}>{detail.item.evidenceCount}</MetaRow>
                      <MetaRow label={t("Last Updated")}>{frameworkLastUpdated(detail.item.updatedAt)}</MetaRow>
                      {detail.nextAudit ? (
                        <>
                          <MetaRow label={t("Audit Window")}>
                            <ComplianceDate value={detail.nextAudit.startDate} /> –{" "}
                            <ComplianceDate value={detail.nextAudit.endDate} />
                          </MetaRow>
                          <MetaRow label={t("Next Audit")}>
                            {detail.nextAudit.daysRemaining != null
                              ? `${detail.nextAudit.daysRemaining} ${t("days")}`
                              : fmtDate(detail.nextAudit.startDate)}
                          </MetaRow>
                        </>
                      ) : null}
                      {detail.item.tags.length > 0 ? (
                        <MetaRow label={t("Tags")}>
                          <span className="flex flex-wrap justify-end gap-1">
                            {detail.item.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal"
                              >
                                {tag}
                              </span>
                            ))}
                          </span>
                        </MetaRow>
                      ) : null}
                    </div>

                    {detail.item.code === "SOC2" ? (
                      <div>
                        <h4 className="mb-2 text-sm font-semibold">{t("Trust Service Criteria")}</h4>
                        <ul className="space-y-2">
                          {COMPLIANCE_SOC2_TRUST_CRITERIA.map((c) => (
                            <li
                              key={c.name}
                              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                            >
                              <span>{c.name}</span>
                              <ComplianceStatusBadge
                                status={c.status === "complete" ? "complete" : "in_progress"}
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <div>
                      <h4 className="mb-2 text-sm font-semibold">{t("Recent Activity")}</h4>
                      <ul className="space-y-2">
                        {detail.history.slice(0, 5).map((h) => (
                          <li key={h.id} className="flex gap-2 text-sm">
                            <Star className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: COMPLIANCE_BRAND }} />
                            <div className="min-w-0 flex-1">
                              <span className="font-medium">{activityLabel(h.action)}</span>
                              {h.actorName ? (
                                <span className="text-muted-foreground"> — {h.actorName}</span>
                              ) : null}
                            </div>
                            <span className="shrink-0 text-[11px] text-muted-foreground">
                              {complianceRelativeTime(h.createdAt)}
                            </span>
                          </li>
                        ))}
                        {detail.history.length === 0 ? (
                          <p className="text-sm text-muted-foreground">{t("No activity yet.")}</p>
                        ) : null}
                      </ul>
                    </div>
                  </TabsContent>

                  <TabsContent value="controls" className="mt-0">
                    <ul className="space-y-2">
                      {detail.controls.map((c) => (
                        <li key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                          <span>
                            <span className="font-mono text-xs text-muted-foreground">{c.controlCode}</span>{" "}
                            {c.title}
                          </span>
                          <ComplianceStatusBadge status={c.status} />
                        </li>
                      ))}
                      {detail.controls.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("No controls mapped yet.")}</p>
                      ) : null}
                    </ul>
                  </TabsContent>

                  <TabsContent value="evidence" className="mt-0">
                    <ul className="space-y-2">
                      {detail.evidence.map((e) => (
                        <li key={e.id} className="flex justify-between rounded-md border px-3 py-2 text-sm">
                          <span>{e.title}</span>
                          <ComplianceStatusBadge status={e.status} />
                        </li>
                      ))}
                      {detail.evidence.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("No evidence linked yet.")}</p>
                      ) : null}
                    </ul>
                  </TabsContent>

                  <TabsContent value="risks" className="mt-0">
                    <ul className="space-y-2">
                      {detail.risks.map((r) => (
                        <li key={r.id} className="flex justify-between rounded-md border px-3 py-2 text-sm">
                          <span>{r.title}</span>
                          <ComplianceStatusBadge status={r.severity} />
                        </li>
                      ))}
                      {detail.risks.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("No open risks.")}</p>
                      ) : null}
                    </ul>
                  </TabsContent>

                  <TabsContent value="settings" className="mt-0 space-y-4">
                    <div>
                      <Label>{t("Framework icon")}</Label>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t("Upload an image or paste a URL. PNG, JPG, WEBP, GIF, or SVG up to 2MB.")}
                      </p>
                      <div className="mt-3 flex items-center gap-3">
                        <ComplianceFrameworkIcon
                          code={detail.item.code}
                          iconUrl={iconUrlInput || detail.item.iconUrl}
                        />
                        <div className="flex flex-wrap gap-2">
                          <input
                            ref={iconFileRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void uploadIconFile(file);
                              e.target.value = "";
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={savingIcon}
                            onClick={() => iconFileRef.current?.click()}
                          >
                            {savingIcon ? (
                              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                            ) : (
                              <ImagePlus className="mr-1.5 h-4 w-4" />
                            )}
                            {t("Upload icon")}
                          </Button>
                          {(iconUrlInput || detail.item.iconUrl) ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={savingIcon}
                              onClick={() => void saveIconUrl(null)}
                            >
                              <Trash2 className="mr-1.5 h-4 w-4" />
                              {t("Remove")}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Input
                          placeholder={t("Or paste icon URL")}
                          value={iconUrlInput}
                          onChange={(e) => setIconUrlInput(e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={savingIcon}
                          onClick={() => void saveIconUrl(iconUrlInput.trim() || null)}
                        >
                          {t("Save")}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>{t("Owner user ID")}</Label>
                      <div className="mt-1 flex gap-2">
                  <Input
                    placeholder={t("Owner user ID")}
                    value={ownerInput}
                    onChange={(e) => setOwnerInput(e.target.value)}
                  />
                  <Button onClick={() => void assignOwner()} disabled={savingOwner}>
                    {savingOwner ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Assign")}
                  </Button>
                </div>
                    </div>
                    <div>
                      <Label>{t("Status")}</Label>
                      <Select
                        value={detail.item.status}
                        onValueChange={async (v) => {
                          const res = await fetch(`/api/compliance/frameworks/${detailId}`, {
                            method: "PATCH",
                            credentials: "include",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: v }),
                          });
                          if (res.ok) {
                            toast.success(t("Status updated"));
                            void openDetail(detailId!);
                            void load();
                          }
                        }}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">{t("Active")}</SelectItem>
                          <SelectItem value="not_started">{t("Not Started")}</SelectItem>
                          <SelectItem value="draft">{t("Draft")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>

              <div className="border-t p-4">
                <CompliancePrimaryButton className="w-full" asChild>
                  <Link href={`/compliance/controls?framework=${detail.item.id}`}>
                    {t("View All Controls")}
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </CompliancePrimaryButton>
            </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
