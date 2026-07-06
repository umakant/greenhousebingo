"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Download,
  ExternalLink,
  Eye,
  Filter,
  Layers,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

import { ControlStatusBadge } from "@/components/compliance/compliance-status-badge";
import {
  ComplianceOutlineLinkButton,
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
import { COMPLIANCE_CONTROL_CATEGORIES } from "@/lib/compliance/compliance-constants";
import { t } from "@/lib/admin-t";
import { cn } from "@/lib/utils";

type FrameworkOption = { id: number; code: string; name: string };

type ControlRow = {
  id: number;
  controlCode: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  frameworkCode: string | null;
  frameworks: Array<{ code: string; name: string }>;
  ownerUserId: number | null;
  ownerName: string | null;
  testSchedule: string | null;
  nextTestAt: string | null;
  lastReviewedAt: string | null;
  evidenceCount: number;
};

type ControlDetail = {
  item: ControlRow;
  frameworkMappings: Array<{ frameworkCode: string; frameworkName: string; mappedControlCode: string | null }>;
  evidence: Array<{ id: number; title: string; status: string }>;
  related: {
    policies: Array<{ id: number; title: string }>;
    risks: Array<{ id: number; title: string; severity?: string }>;
    vendors: Array<{ id: number; vendorName: string }>;
    monitors: Array<{ id: number; name: string }>;
  };
  remediations: Array<{ id: number; status: string; summary: string | null; createdAt: string }>;
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

function scoreImpactClass(status: string) {
  if (status === "failing") return "bg-red-100 text-red-800";
  if (status === "in_progress") return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-800";
}

function scoreImpactLabel(status: string) {
  if (status === "failing") return t("High Impact");
  if (status === "in_progress") return t("Medium Impact");
  return t("Low Impact");
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

function FrameworkBadges({ frameworks }: { frameworks: Array<{ code: string; name: string }> }) {
  if (!frameworks.length) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {frameworks.map((fw) => (
        <Badge key={fw.code} variant="secondary" className="font-normal">
          {fw.name}
        </Badge>
      ))}
    </div>
  );
}

export function ComplianceControlsClient() {
  const { fmtDate } = useComplianceFormat();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<ControlRow[]>([]);
  const [frameworkOptions, setFrameworkOptions] = React.useState<FrameworkOption[]>([]);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [frameworkFilter, setFrameworkFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [detailId, setDetailId] = React.useState<number | null>(null);
  const [detail, setDetail] = React.useState<ControlDetail | null>(null);
  const [detailTab, setDetailTab] = React.useState("overview");
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [ownerInput, setOwnerInput] = React.useState("");
  const [remediationSummary, setRemediationSummary] = React.useState("");
  const [savingDetail, setSavingDetail] = React.useState(false);
  const [form, setForm] = React.useState({
    controlCode: "",
    title: "",
    category: "",
    status: "not_started",
    testSchedule: "quarterly",
  });

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (frameworkFilter !== "all") params.set("frameworkId", frameworkFilter);
      const qs = params.toString();
      const res = await fetch(`/api/compliance/controls${qs ? `?${qs}` : ""}`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        items?: ControlRow[];
        categories?: string[];
        frameworks?: FrameworkOption[];
      };
      if (!res.ok || !data?.ok) {
        toast.error("Failed to load controls");
        setItems([]);
        return;
      }
      setItems(data.items ?? []);
      setCategories(data.categories ?? []);
      setFrameworkOptions(data.frameworks ?? []);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, categoryFilter, frameworkFilter]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setPage(1);
  }, [search, statusFilter, categoryFilter, frameworkFilter, perPage]);

  const total = items.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, lastPage);
  const from = total === 0 ? 0 : (safePage - 1) * perPage + 1;
  const to = Math.min(safePage * perPage, total);
  const slice = items.slice((safePage - 1) * perPage, safePage * perPage);

  const stats = React.useMemo(() => {
    const passing = items.filter((i) => i.status === "implemented").length;
    const needsReview = items.filter((i) => i.status === "in_progress").length;
    const failed = items.filter((i) => i.status === "failing").length;
    const notStarted = items.filter((i) => i.status === "not_started").length;
    return [
      { label: t("Total Controls"), value: total, hint: undefined },
      { label: t("Passing"), value: passing, hint: pct(passing, total), tone: "success" as const },
      { label: t("Needs Review"), value: needsReview, hint: pct(needsReview, total), tone: "warning" as const },
      { label: t("Failed"), value: failed, hint: pct(failed, total), tone: "danger" as const },
      { label: t("Not Started"), value: notStarted, hint: pct(notStarted, total) },
    ];
  }, [items, total]);

  const openDetail = async (id: number) => {
    setDetailId(id);
    setDetailTab("overview");
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetch(`/api/compliance/controls/${id}`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as ControlDetail & {
        ok?: boolean;
        item?: ControlRow;
        history?: ControlDetail["history"];
      };
      if (res.ok && data?.ok && data.item) {
        setDetail({
          item: data.item,
          frameworkMappings: data.frameworkMappings ?? [],
          evidence: data.evidence ?? [],
          related: data.related ?? { policies: [], risks: [], vendors: [], monitors: [] },
          remediations: data.remediations ?? [],
          history: data.history ?? [],
        });
        setOwnerInput(data.item.ownerUserId ? String(data.item.ownerUserId) : "");
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const saveDetail = async (payload: Record<string, unknown>) => {
    if (!detailId) return;
    setSavingDetail(true);
    try {
      const res = await fetch(`/api/compliance/controls/${detailId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success("Control updated");
        setRemediationSummary("");
        void openDetail(detailId);
        void load();
      }
    } finally {
      setSavingDetail(false);
    }
  };

  const save = async () => {
    if (!form.controlCode.trim() || !form.title.trim()) {
      toast.error("Control code and title are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/compliance/controls", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Save failed");
        return;
      }
      toast.success("Control created");
      setDialogOpen(false);
      void load();
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    const header = ["Control", "Frameworks", "Category", "Status", "Evidence", "Last Tested"];
    const rows = items.map((r) => [
      `${r.controlCode} ${r.title}`,
      r.frameworks.map((f) => f.name).join("; "),
      r.category ?? "",
      r.status,
      String(r.evidenceCount),
      r.lastReviewedAt ? fmtDate(r.lastReviewedAt) : "",
    ]);
    const csv = [header, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "compliance-controls.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const openRemediation = detail?.remediations.find((r) => r.status === "open") ?? detail?.remediations[0];

  return (
    <>
      <ComplianceSectionShell
        title={t("Controls")}
        description={t("Browse and manage compliance controls across all frameworks.")}
        stats={stats}
        actions={
          <>
            <ComplianceOutlineLinkButton href="/compliance/audits">
              <UserCheck className="mr-1.5 h-4 w-4" />
              {t("View as Auditor")}
            </ComplianceOutlineLinkButton>
            <CompliancePrimaryButton type="button" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("Add Control")}
            </CompliancePrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          <Card className={cn(complianceCardClass, "p-4")}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Select value={frameworkFilter} onValueChange={setFrameworkFilter}>
                  <SelectTrigger className="h-9 w-[150px] bg-background">
                    <SelectValue placeholder={t("All Frameworks")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All Frameworks")}</SelectItem>
                    {frameworkOptions.map((f) => (
                      <SelectItem key={f.id} value={String(f.id)}>
                        {f.name}
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
                    {[...COMPLIANCE_CONTROL_CATEGORIES, ...categories]
                      .filter((v, i, a) => a.indexOf(v) === i)
                      .map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
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
                    <SelectItem value="implemented">{t("Passing")}</SelectItem>
                    <SelectItem value="in_progress">{t("Needs Review")}</SelectItem>
                    <SelectItem value="failing">{t("Failed")}</SelectItem>
                    <SelectItem value="not_started">{t("Not Started")}</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative min-w-[220px] flex-1 lg:max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-9 bg-background pl-8"
                    placeholder={t("Search controls...")}
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
            </div>
          </Card>

          <Card className={cn(complianceCardClass, "overflow-hidden")}>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : slice.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <ShieldCheck className="mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="font-medium">{t("No controls")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("Build your control library and map controls to frameworks.")}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={complianceTableHeadClass}>
                        <th className="px-4 py-3">{t("Control")}</th>
                        <th className="px-4 py-3">{t("Framework(s)")}</th>
                        <th className="px-4 py-3">{t("Category")}</th>
                        <th className="px-4 py-3">{t("Status")}</th>
                        <th className="px-4 py-3">{t("Evidence")}</th>
                        <th className="px-4 py-3">{t("Last Tested")}</th>
                        <th className="px-4 py-3 w-24">{t("Actions")}</th>
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
                          <td className="px-4 py-3.5">
                            <div className="font-medium">
                              <span className="font-mono text-xs text-muted-foreground">{row.controlCode}</span>{" "}
                              {row.title.replace(new RegExp(`^${row.controlCode}\\s*[-—]?\\s*`, "i"), "")}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <FrameworkBadges frameworks={row.frameworks} />
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground">{row.category ?? "—"}</td>
                          <td className="px-4 py-3.5">
                            <ControlStatusBadge status={row.status} />
                          </td>
                          <td className="px-4 py-3.5 tabular-nums">{row.evidenceCount}</td>
                          <td className="px-4 py-3.5 text-muted-foreground">
                            <ComplianceDate value={row.lastReviewedAt ?? row.nextTestAt} />
                          </td>
                          <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <ComplianceRowActions
                              label={t("View")}
                              onView={() => void openDetail(row.id)}
                              items={[
                                { label: "View evidence", href: `/compliance/evidence?control=${row.id}` },
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
                  entityLabel={t("controls")}
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
            <DialogTitle>{t("Add Control")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>{t("Control code")}</Label>
              <Input value={form.controlCode} onChange={(e) => setForm({ ...form, controlCode: e.target.value })} />
            </div>
            <div>
              <Label>{t("Title")}</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>{t("Category")}</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("Select category")} />
                </SelectTrigger>
                <SelectContent>
                  {COMPLIANCE_CONTROL_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("Testing schedule")}</Label>
              <Select value={form.testSchedule} onValueChange={(v) => setForm({ ...form, testSchedule: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["monthly", "quarterly", "semi-annual", "annual"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
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
                        {detail.item.controlCode} — {detail.item.title}
                      </SheetTitle>
                      <ControlStatusBadge status={detail.item.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {detail.item.category ?? t("Uncategorized")}
                      {detail.item.lastReviewedAt ? (
                        <>
                          {" · "}
                          {t("Last tested:")} {fmtDate(detail.item.lastReviewedAt)}
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
                    { id: "evidence", label: `${t("Evidence")} (${detail.evidence.length})` },
                    { id: "risks", label: `${t("Risks")} (${detail.related.risks.length})` },
                    { id: "monitors", label: `${t("Monitors")} (${detail.related.monitors.length})` },
                    { id: "history", label: t("History") },
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
                    {detail.item.description ? (
                      <p className="text-sm leading-relaxed text-muted-foreground">{detail.item.description}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {t("Ensure this control is implemented, tested, and supported with evidence.")}
                      </p>
                    )}

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("Frameworks")}
                      </p>
                      <FrameworkBadges
                        frameworks={detail.frameworkMappings.map((m) => ({
                          code: m.frameworkCode,
                          name: m.frameworkName,
                        }))}
                      />
                    </div>

                    <div className="rounded-lg border bg-muted/20 p-4">
                      <MetaRow label={t("Control Owner")}>
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
                        <Select
                          value={detail.item.status}
                          onValueChange={(v) => void saveDetail({ status: v })}
                        >
                          <SelectTrigger className="h-8 w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="implemented">{t("Passing")}</SelectItem>
                            <SelectItem value="in_progress">{t("Needs Review")}</SelectItem>
                            <SelectItem value="failing">{t("Failed")}</SelectItem>
                            <SelectItem value="not_started">{t("Not Started")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </MetaRow>
                      <MetaRow label={t("Priority")}>
                        {detail.item.status === "failing" ? t("High") : detail.item.status === "in_progress" ? t("Medium") : t("Low")}
                      </MetaRow>
                      <MetaRow label={t("Control Type")}>{t("Preventive")}</MetaRow>
                      <MetaRow label={t("Frequency")}>
                        <span className="capitalize">{detail.item.testSchedule ?? "—"}</span>
                      </MetaRow>
                      <MetaRow label={t("Next Test Due")}>
                        <ComplianceDate value={detail.item.nextTestAt} />
                      </MetaRow>
                    </div>

                    {(detail.related.policies.length > 0 ||
                      detail.related.risks.length > 0 ||
                      detail.related.monitors.length > 0) && (
                      <div className="space-y-2">
                        {detail.related.policies.map((p) => (
                          <Link
                            key={p.id}
                            href={`/compliance/policies`}
                            className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted/40"
                          >
                            <span>{p.title}</span>
                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                          </Link>
                        ))}
                        {detail.related.risks.length > 0 ? (
                          <button
                            type="button"
                            className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted/40"
                            onClick={() => setDetailTab("risks")}
                          >
                            <span>
                              {detail.related.risks.length} {t("risks")}
                            </span>
                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        ) : null}
                        {detail.related.monitors.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted/40"
                            onClick={() => setDetailTab("monitors")}
                          >
                            <span>{m.name}</span>
                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        ))}
                      </div>
                    )}

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("Compliance Score Impact")}
                      </p>
                      <Badge className={cn("border-0 font-medium", scoreImpactClass(detail.item.status))}>
                        {scoreImpactLabel(detail.item.status)}
                      </Badge>
                    </div>

                    {(detail.item.status === "failing" || openRemediation) && (
                      <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 dark:border-red-900 dark:bg-red-950/20">
                        <h4 className="mb-3 text-sm font-semibold">{t("Remediation")}</h4>
                        <div className="space-y-3 text-sm">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              {t("Issue")}
                            </p>
                            <p className="mt-1">
                              {openRemediation?.summary ??
                                t("Control is failing — review implementation and collect evidence.")}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              {t("Remediation Plan")}
                            </p>
                            <Textarea
                              className="mt-1 bg-background"
                              placeholder={t("Add remediation plan...")}
                              value={remediationSummary}
                              onChange={(e) => setRemediationSummary(e.target.value)}
                              rows={2}
                            />
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <p className="text-xs text-muted-foreground">{t("Due Date")}</p>
                              <p className="font-medium">
                                <ComplianceDate value={detail.item.nextTestAt} />
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">{t("Assigned To")}</p>
                              <p className="flex items-center gap-2 font-medium">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                                    {ownerInitials(detail.item.ownerName)}
                                  </AvatarFallback>
                                </Avatar>
                                {detail.item.ownerName ?? t("Unassigned")}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={savingDetail || !remediationSummary.trim()}
                            onClick={() => void saveDetail({ remediationSummary, remediationStatus: "open" })}
                          >
                            {t("Log remediation")}
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>{t("Assign owner (user ID)")}</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder={t("Owner user ID")}
                          value={ownerInput}
                          onChange={(e) => setOwnerInput(e.target.value)}
                        />
                        <Button
                          size="sm"
                          disabled={savingDetail}
                          onClick={() => void saveDetail({ ownerUserId: ownerInput ? Number(ownerInput) : null })}
                        >
                          {t("Assign")}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="evidence" className="mt-0">
                    <ul className="space-y-2">
                      {detail.evidence.map((e) => (
                        <li key={e.id} className="flex justify-between rounded-md border px-3 py-2 text-sm">
                          <span>{e.title}</span>
                          <ControlStatusBadge status={e.status === "approved" ? "implemented" : e.status} />
                        </li>
                      ))}
                      {detail.evidence.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("No evidence linked yet.")}</p>
                      ) : null}
                    </ul>
                  </TabsContent>

                  <TabsContent value="risks" className="mt-0">
                    <ul className="space-y-2">
                      {detail.related.risks.map((r) => (
                        <li key={r.id} className="flex justify-between rounded-md border px-3 py-2 text-sm">
                          <span>{r.title}</span>
                          {r.severity ? <Badge variant="outline">{r.severity}</Badge> : null}
                        </li>
                      ))}
                      {detail.related.risks.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("No open risks.")}</p>
                      ) : null}
                    </ul>
                  </TabsContent>

                  <TabsContent value="monitors" className="mt-0">
                    <ul className="space-y-2">
                      {detail.related.monitors.map((m) => (
                        <li key={m.id} className="rounded-md border px-3 py-2 text-sm">
                          {m.name}
                        </li>
                      ))}
                      {detail.related.monitors.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("No monitors linked.")}</p>
                      ) : null}
                    </ul>
                  </TabsContent>

                  <TabsContent value="history" className="mt-0">
                    <ul className="space-y-2">
                      {detail.history.map((h) => (
                        <li key={h.id} className="flex justify-between gap-2 text-sm">
                          <span>
                            <span className="font-medium">{h.actorName ?? t("System")}</span>{" "}
                            <span className="text-muted-foreground">{h.action.replace(/_/g, " ")}</span>
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {complianceRelativeTime(h.createdAt)}
                          </span>
                        </li>
                      ))}
                      {detail.history.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("No activity yet.")}</p>
                      ) : null}
                    </ul>
                  </TabsContent>
                </div>
              </Tabs>

              <div className="border-t p-4">
                <CompliancePrimaryButton className="w-full" asChild>
                  <Link href={`/compliance/controls?highlight=${detail.item.id}`}>
                    {t("View Control Details")}
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
