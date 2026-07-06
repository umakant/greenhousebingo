"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronRight,
  Download,
  Filter,
  Grid3X3,
  Loader2,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { RiskLevelBadge, RiskStatusBadge } from "@/components/compliance/compliance-status-badge";
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
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/lib/admin-t";
import { COMPLIANCE_RISK_STATUSES } from "@/lib/compliance/compliance-day2";
import {
  COMPLIANCE_IMPACT_LEVELS,
  COMPLIANCE_LIKELIHOOD_LEVELS,
  matrixCellScore,
  matrixCellTone,
} from "@/lib/compliance/compliance-risks";
import { cn } from "@/lib/utils";

type OwnerOption = { id: number; name: string };

type RiskRow = {
  id: number;
  riskCode: string;
  title: string;
  description: string | null;
  category: string;
  impact: string;
  impactValue: number;
  impactLabel: string;
  likelihood: string;
  likelihoodValue: number;
  likelihoodLabel: string;
  riskScore: number;
  riskLevel: string;
  levelBucket: string;
  status: string;
  ownerName: string | null;
  dueDate: string | null;
  mitigationPlan: string | null;
  residualScore: number;
  residualLevel: string;
  lastReviewedAt: string | null;
};

type RiskDetail = {
  item: RiskRow & {
    riskAppetite: string;
    dateIdentified: string | null;
    nextReviewAt: string | null;
    nextReviewIn: string | null;
    residualImpact: string;
    residualLikelihood: string;
    reviewNotes: string | null;
  };
  relatedCounts: { controls: number; policies: number; incidents: number; vendors: number; evidence: number };
  history: Array<{ id: number; action: string; actorName: string | null; createdAt: string }>;
};

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

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

function statDotColor(tone: string) {
  if (tone === "danger") return "bg-red-500";
  if (tone === "warning") return "bg-amber-500";
  if (tone === "success") return "bg-emerald-500";
  if (tone === "info") return "bg-blue-500";
  return "bg-muted-foreground";
}

function likelihoodTone(value: number) {
  if (value >= 4) return "text-red-600";
  if (value >= 3) return "text-amber-600";
  return "text-muted-foreground";
}

function impactTone(value: number) {
  if (value >= 5) return "text-red-600";
  if (value >= 4) return "text-amber-600";
  return "text-muted-foreground";
}

function matrixBg(tone: ReturnType<typeof matrixCellTone>) {
  switch (tone) {
    case "critical":
      return "bg-red-500/30";
    case "high":
      return "bg-red-400/20";
    case "medium":
      return "bg-amber-400/20";
    case "low":
      return "bg-yellow-400/15";
    default:
      return "bg-muted/40";
  }
}

function RiskMatrixTable({
  matrix,
  highlight,
}: {
  matrix: Record<string, number>;
  highlight?: { impact: string; likelihood: string };
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse text-xs">
        <thead>
          <tr>
            <th className="p-2 text-left text-muted-foreground">{t("Impact")} ↓ / {t("Likelihood")} →</th>
            {COMPLIANCE_LIKELIHOOD_LEVELS.map((l) => (
              <th key={l.value} className="p-2 text-center font-medium">
                {l.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...COMPLIANCE_IMPACT_LEVELS].reverse().map((impact) => (
            <tr key={impact.value}>
              <td className="p-2 font-medium">{impact.label}</td>
              {COMPLIANCE_LIKELIHOOD_LEVELS.map((likelihood) => {
                const count = matrix[`${impact.value}:${likelihood.value}`] ?? 0;
                const score = matrixCellScore(impact.value, likelihood.value);
                const tone = matrixCellTone(score);
                const isHighlight =
                  highlight?.impact === impact.value && highlight?.likelihood === likelihood.value;
                return (
                  <td
                    key={likelihood.value}
                    className={cn(
                      "relative p-2 text-center",
                      matrixBg(tone),
                      isHighlight && "ring-2 ring-[#E31B23] ring-inset",
                    )}
                  >
                    {isHighlight ? (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#E31B23] text-[10px] font-bold text-white">
                        ●
                      </span>
                    ) : count ? (
                      count
                    ) : (
                      "—"
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ComplianceRisksClient() {
  const { fmtDate } = useComplianceFormat();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<RiskRow[]>([]);
  const [matrix, setMatrix] = React.useState<Record<string, number>>({});
  const [categoryOptions, setCategoryOptions] = React.useState<string[]>([]);
  const [ownerOptions, setOwnerOptions] = React.useState<OwnerOption[]>([]);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [levelFilter, setLevelFilter] = React.useState("all");
  const [ownerFilter, setOwnerFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [matrixOpen, setMatrixOpen] = React.useState(false);
  const [heatmapOpen, setHeatmapOpen] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [detailId, setDetailId] = React.useState<number | null>(null);
  const [detail, setDetail] = React.useState<RiskDetail | null>(null);
  const [detailTab, setDetailTab] = React.useState("overview");
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    title: "",
    impact: "medium",
    likelihood: "possible",
    status: "open",
  });

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (levelFilter !== "all") params.set("level", levelFilter);
      if (ownerFilter !== "all") params.set("ownerId", ownerFilter);
      const res = await fetch(`/api/compliance/risks?${params}`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        items?: RiskRow[];
        matrix?: Record<string, number>;
        categories?: string[];
        owners?: OwnerOption[];
      };
      if (!res.ok || !data?.ok) {
        toast.error("Failed to load risks");
        setItems([]);
        return;
      }
      setItems(data.items ?? []);
      setMatrix(data.matrix ?? {});
      setCategoryOptions(data.categories ?? []);
      setOwnerOptions(data.owners ?? []);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, categoryFilter, levelFilter, ownerFilter]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [search, statusFilter, categoryFilter, levelFilter, ownerFilter, perPage]);

  const total = items.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, lastPage);
  const from = total === 0 ? 0 : (safePage - 1) * perPage + 1;
  const to = Math.min(safePage * perPage, total);
  const slice = items.slice((safePage - 1) * perPage, safePage * perPage);

  const stats = React.useMemo(() => {
    const high = items.filter((i) => i.levelBucket === "high").length;
    const medium = items.filter((i) => i.levelBucket === "medium").length;
    const low = items.filter((i) => i.levelBucket === "low").length;
    const accepted = items.filter((i) => i.status === "accepted").length;
    return [
      { label: t("Total Risks"), value: total, hint: t("All time"), tone: "default" as const },
      { label: t("High Risk"), value: high, hint: pct(high, total), tone: "danger" as const },
      { label: t("Medium Risk"), value: medium, hint: pct(medium, total), tone: "warning" as const },
      { label: t("Low Risk"), value: low, hint: pct(low, total), tone: "success" as const },
      { label: t("Accepted Risk"), value: accepted, hint: pct(accepted, total), tone: "info" as const },
    ];
  }, [items, total]);

  const openDetail = async (id: number) => {
    setDetailId(id);
    setDetailTab("overview");
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetch(`/api/compliance/risks/${id}`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as RiskDetail & { ok?: boolean; item?: RiskDetail["item"] };
      if (res.ok && data?.ok && data.item) {
        setDetail({
          item: data.item,
          relatedCounts: data.relatedCounts ?? { controls: 0, policies: 0, incidents: 0, vendors: 0, evidence: 0 },
          history: data.history ?? [],
        });
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error("Title is required");
    setSaving(true);
    try {
      const res = await fetch("/api/compliance/risks", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success("Risk created");
        setDialogOpen(false);
        setForm({ title: "", impact: "medium", likelihood: "possible", status: "open" });
        void load();
      }
    } finally {
      setSaving(false);
    }
  };

  const patchRisk = async (id: number, payload: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/compliance/risks/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success(t("Risk updated"));
        if (detailId === id) void openDetail(id);
        void load();
      }
    } finally {
      setSaving(false);
    }
  };

  const patchDetail = async (payload: Record<string, unknown>) => {
    if (!detailId) return;
    await patchRisk(detailId, payload);
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
    const header = ["Risk", "Category", "Likelihood", "Impact", "Score", "Level", "Owner", "Status", "Last Review"];
    const rows = items.map((r) => [
      r.title,
      r.category,
      r.likelihoodLabel,
      r.impactLabel,
      r.riskScore,
      r.riskLevel,
      r.ownerName ?? "",
      r.status,
      r.lastReviewedAt ? fmtDate(r.lastReviewedAt) : "",
    ]);
    const csv = [header, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "compliance-risks.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <ComplianceSectionShell
        title={t("Risks")}
        description={t("Identify, assess, and manage risks to your organization.")}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => setMatrixOpen(true)}>
              <Grid3X3 className="mr-1.5 h-4 w-4" />
              {t("Risk Matrix")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setHeatmapOpen(true)}>
              <Grid3X3 className="mr-1.5 h-4 w-4" />
              {t("Risk Heatmap")}
            </Button>
            <CompliancePrimaryButton type="button" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("New Risk")}
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
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-[140px] bg-background">
                    <SelectValue placeholder={t("All Statuses")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All Statuses")}</SelectItem>
                    {COMPLIANCE_RISK_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace(/_/g, " ")}
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
                      <SelectItem key={o.id} value={String(o.id)}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-9 w-[150px] bg-background">
                    <SelectValue placeholder={t("All Categories")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All Categories")}</SelectItem>
                    {categoryOptions.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger className="h-9 w-[150px] bg-background">
                    <SelectValue placeholder={t("All Risk Scores")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All Risk Scores")}</SelectItem>
                    <SelectItem value="high">{t("High")}</SelectItem>
                    <SelectItem value="medium">{t("Medium")}</SelectItem>
                    <SelectItem value="low">{t("Low")}</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative min-w-[220px] flex-1 lg:max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-9 bg-background pl-8"
                    placeholder={t("Search risks...")}
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
                  <AlertTriangle className="mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="font-medium">{t("No risks in register")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("Track impact, likelihood, mitigation plans, and residual risk.")}
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
                        <th className="px-4 py-3">{t("Risk")}</th>
                        <th className="px-4 py-3">{t("Category")}</th>
                        <th className="px-4 py-3">{t("Likelihood")}</th>
                        <th className="px-4 py-3">{t("Impact")}</th>
                        <th className="px-4 py-3">{t("Score")}</th>
                        <th className="px-4 py-3">{t("Level")}</th>
                        <th className="px-4 py-3">{t("Owner")}</th>
                        <th className="px-4 py-3">{t("Status")}</th>
                        <th className="px-4 py-3">{t("Last Review")}</th>
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
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                              <div>
                                <p className="font-medium">{row.title}</p>
                                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{row.description}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground">{row.category}</td>
                          <td className="px-4 py-3.5">
                            <span className={cn("font-medium", likelihoodTone(row.likelihoodValue))}>
                              {row.likelihoodValue} {row.likelihoodLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={cn("font-medium", impactTone(row.impactValue))}>
                              {row.impactValue} {row.impactLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 tabular-nums font-semibold">{row.riskScore}</td>
                          <td className="px-4 py-3.5">
                            <RiskLevelBadge level={row.riskLevel} />
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
                          <td className="px-4 py-3.5">
                            <RiskStatusBadge status={row.status} />
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground">
                            <ComplianceDate value={row.lastReviewedAt} />
                          </td>
                          <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <ComplianceRowActions
                              label={t("View")}
                              onView={() => void openDetail(row.id)}
                              items={[
                                { label: "Mark in progress", onSelect: () => void patchRisk(row.id, { status: "mitigating" }) },
                                { label: "Record review", onSelect: () => void patchRisk(row.id, { recordReview: true }) },
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
                  entityLabel={t("risks")}
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

      <Dialog open={matrixOpen} onOpenChange={setMatrixOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("Risk Matrix")}</DialogTitle>
          </DialogHeader>
          <RiskMatrixTable matrix={matrix} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setMatrixOpen(false)}>
              {t("Close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={heatmapOpen} onOpenChange={setHeatmapOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("Risk Heatmap")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("Distribution of risks by impact and likelihood.")}</p>
          <RiskMatrixTable matrix={matrix} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setHeatmapOpen(false)}>
              {t("Close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("New Risk")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t("Title")}</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("Impact")}</Label>
                <Select value={form.impact} onValueChange={(v) => setForm((f) => ({ ...f, impact: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPLIANCE_IMPACT_LEVELS.map((x) => (
                      <SelectItem key={x.value} value={x.value}>
                        {x.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("Likelihood")}</Label>
                <Select value={form.likelihood} onValueChange={(v) => setForm((f) => ({ ...f, likelihood: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPLIANCE_LIKELIHOOD_LEVELS.map((x) => (
                      <SelectItem key={x.value} value={x.value}>
                        {x.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                <div className="flex items-start gap-2 pr-8">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <SheetTitle className="text-lg">
                        {detail.item.riskCode} — {detail.item.title}
                      </SheetTitle>
                      <RiskLevelBadge level={detail.item.riskLevel} />
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <Tabs value={detailTab} onValueChange={setDetailTab} className="flex min-h-0 flex-1 flex-col">
                <TabsList className="mx-6 mt-3 h-auto w-auto justify-start gap-1 rounded-none border-b bg-transparent p-0">
                  {[
                    { id: "overview", label: t("Overview") },
                    { id: "mitigation", label: t("Mitigation") },
                    { id: "history", label: t("History") },
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
                      <MetaRow label={t("Category")}>
                        <span>{detail.item.category}</span>
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
                      <MetaRow label={t("Risk Score")}>
                        <span>
                          {detail.item.riskScore} <RiskLevelBadge level={detail.item.riskLevel} />
                        </span>
                      </MetaRow>
                      <MetaRow label={t("Likelihood")}>
                        <span className={likelihoodTone(detail.item.likelihoodValue)}>
                          {detail.item.likelihoodValue} — {detail.item.likelihoodLabel}
                        </span>
                      </MetaRow>
                      <MetaRow label={t("Impact")}>
                        <span className={impactTone(detail.item.impactValue)}>
                          {detail.item.impactValue} — {detail.item.impactLabel}
                        </span>
                      </MetaRow>
                      <MetaRow label={t("Status")}>
                        <RiskStatusBadge status={detail.item.status} />
                      </MetaRow>
                      <MetaRow label={t("Risk Appetite")}>
                        <span>{detail.item.riskAppetite}</span>
                      </MetaRow>
                      <MetaRow label={t("Date Identified")}>
                        <ComplianceDate value={detail.item.dateIdentified} />
                      </MetaRow>
                      <MetaRow label={t("Last Review")}>
                        <ComplianceDate value={detail.item.lastReviewedAt} />
                      </MetaRow>
                      <MetaRow label={t("Next Review")}>
                        <span>
                          <ComplianceDate value={detail.item.nextReviewAt} />
                          {detail.item.nextReviewIn ? (
                            <span className="ml-1 text-xs text-muted-foreground">({detail.item.nextReviewIn})</span>
                          ) : null}
                        </span>
                      </MetaRow>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("Risk Matrix")}
                      </p>
                      <div className="flex flex-col gap-3 lg:flex-row">
                        <div className="flex-1 rounded-lg border p-3">
                          <RiskMatrixTable
                            matrix={matrix}
                            highlight={{ impact: detail.item.impact, likelihood: detail.item.likelihood }}
                          />
                        </div>
                        <div className="w-full shrink-0 rounded-lg border bg-muted/20 p-4 lg:w-36">
                          <p className="text-xs text-muted-foreground">{t("Score")}</p>
                          <p className="text-2xl font-bold tabular-nums">{detail.item.riskScore}</p>
                          <p className="mt-2 text-xs text-muted-foreground">{t("Level")}</p>
                          <RiskLevelBadge level={detail.item.riskLevel} />
                          <p className="mt-3 text-xs text-muted-foreground">{t("Likelihood")}</p>
                          <p className="text-sm font-medium">{detail.item.likelihoodValue}</p>
                          <p className="mt-2 text-xs text-muted-foreground">{t("Impact")}</p>
                          <p className="text-sm font-medium">{detail.item.impactValue}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("Linked Items")}
                      </p>
                      <div className="divide-y rounded-lg border">
                        {[
                          { label: t("Associated Controls"), count: `${detail.relatedCounts.controls} ${t("controls")}`, href: "/compliance/controls" },
                          { label: t("Related Policies"), count: `${detail.relatedCounts.policies} ${t("policies")}`, href: "/compliance/policies" },
                          { label: t("Related Incidents"), count: detail.relatedCounts.incidents ? `${detail.relatedCounts.incidents}` : "—", href: "/compliance/risks" },
                          { label: t("Related Vendors"), count: detail.relatedCounts.vendors ? `${detail.relatedCounts.vendors}` : "—", href: "/compliance/vendors" },
                          { label: t("Related Evidence"), count: `${detail.relatedCounts.evidence} ${t("evidence items")}`, href: "/compliance/evidence" },
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
                    </div>
                  </TabsContent>

                  <TabsContent value="mitigation" className="mt-0 space-y-4">
                    <div>
                      <Label>{t("Mitigation plan")}</Label>
                      <Textarea
                        className="mt-1"
                        defaultValue={detail.item.mitigationPlan ?? ""}
                        rows={5}
                        onBlur={(e) => void patchDetail({ mitigationPlan: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>{t("Residual impact")}</Label>
                        <Select
                          defaultValue={detail.item.residualImpact}
                          onValueChange={(v) => void patchDetail({ residualImpact: v })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COMPLIANCE_IMPACT_LEVELS.map((x) => (
                              <SelectItem key={x.value} value={x.value}>
                                {x.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{t("Residual likelihood")}</Label>
                        <Select
                          defaultValue={detail.item.residualLikelihood}
                          onValueChange={(v) => void patchDetail({ residualLikelihood: v })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COMPLIANCE_LIKELIHOOD_LEVELS.map((x) => (
                              <SelectItem key={x.value} value={x.value}>
                                {x.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-4 text-sm">
                      <p className="text-muted-foreground">{t("Residual risk")}</p>
                      <p className="mt-1 font-medium">
                        {detail.item.residualLevel} ({detail.item.residualScore})
                      </p>
                    </div>
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

                  <TabsContent value="related" className="mt-0">
                    <div className="divide-y rounded-lg border">
                      {[
                        { label: t("Controls"), href: "/compliance/controls" },
                        { label: t("Policies"), href: "/compliance/policies" },
                        { label: t("Evidence"), href: "/compliance/evidence" },
                        { label: t("Vendors"), href: "/compliance/vendors" },
                      ].map((item) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/40"
                        >
                          <span className="font-medium">{item.label}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </Link>
                      ))}
                    </div>
                  </TabsContent>
                </div>
              </Tabs>

              <div className="flex shrink-0 gap-2 border-t px-6 py-4">
                <Button variant="outline" className="flex-1" disabled={saving}>
                  {t("Edit Risk")}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setDetailTab("mitigation")}>
                  {t("Add Mitigation")}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="flex-1 text-white" style={{ backgroundColor: COMPLIANCE_BRAND }} disabled={saving}>
                      {t("Update Status")}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {COMPLIANCE_RISK_STATUSES.map((s) => (
                      <DropdownMenuItem key={s} onClick={() => void patchDetail({ status: s })}>
                        {s.replace(/_/g, " ")}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem onClick={() => void patchDetail({ recordReview: true })}>
                      {t("Record review")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
