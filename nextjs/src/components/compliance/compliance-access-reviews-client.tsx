"use client";

import * as React from "react";
import {
  BarChart3,
  Cloud,
  Download,
  Filter,
  KeyRound,
  Loader2,
  Plus,
  Search,
  Send,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

import { AccessReviewStatusBadge } from "@/components/compliance/compliance-status-badge";
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
import { Progress } from "@/components/ui/progress";
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
import { COMPLIANCE_ACCESS_REVIEW_STATUSES } from "@/lib/compliance/compliance-day2";
import { daysUntilDue, dueDateTone } from "@/lib/compliance/compliance-access-reviews";
import { cn } from "@/lib/utils";

type CampaignRow = {
  id: number;
  name: string;
  scope: string | null;
  status: string;
  displayStatus: string;
  dueDate: string | null;
  system: string;
  reviewType: string;
  description: string;
  ownerName: string | null;
  approvedCount: number;
  revokedCount: number;
  exceptionCount: number;
  progressPct: number;
  usersInScope: number;
  reviewedCount: number;
  pendingCount: number;
  reviewers: string[];
  reviewerCount: number;
  userReviews: Array<{ name: string; role?: string; decision: string; notes?: string }>;
  createdAt: string | null;
};

type CampaignDetail = {
  item: CampaignRow & {
    startDate: string | null;
    progress: {
      usersInScope: number;
      reviewed: number;
      pending: number;
      modified: number;
      removed: number;
      approved: number;
      progressPct: number;
    };
    systemInfo: {
      system: string;
      connected: boolean;
      lastSync: string;
      totalUsers: number;
      groups: number;
      ssoEnabled: boolean;
    };
  };
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

function statDotColor(tone: string) {
  if (tone === "info") return "bg-blue-500";
  if (tone === "warning") return "bg-amber-500";
  if (tone === "success") return "bg-emerald-500";
  if (tone === "danger") return "bg-red-500";
  return "bg-muted-foreground";
}

function systemIcon(system: string) {
  if (system === "AWS") return Cloud;
  if (system === "Okta" || system === "GitHub") return Shield;
  return KeyRound;
}

function systemLogoColor(system: string) {
  if (system === "Okta") return "bg-indigo-100 text-indigo-700";
  if (system === "AWS") return "bg-orange-100 text-orange-700";
  if (system === "GitHub") return "bg-slate-100 text-slate-700";
  if (system === "Microsoft 365") return "bg-sky-100 text-sky-700";
  return "bg-muted text-muted-foreground";
}

function progressBarColor(displayStatus: string) {
  if (displayStatus === "overdue") return "[&>div]:bg-red-500";
  if (displayStatus === "completed") return "[&>div]:bg-emerald-500";
  if (displayStatus === "pending_review" || displayStatus === "scheduled") return "[&>div]:bg-amber-500";
  return "[&>div]:bg-blue-500";
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

export function ComplianceAccessReviewsClient() {
  const { fmtDate } = useComplianceFormat();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<CampaignRow[]>([]);
  const [systemOptions, setSystemOptions] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [systemFilter, setSystemFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [detailId, setDetailId] = React.useState<number | null>(null);
  const [detail, setDetail] = React.useState<CampaignDetail | null>(null);
  const [detailTab, setDetailTab] = React.useState("overview");
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", scope: "", dueDate: "" });

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (systemFilter !== "all") params.set("system", systemFilter);
      const res = await fetch(`/api/compliance/access-reviews?${params}`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        items?: CampaignRow[];
        systems?: string[];
      };
      if (res.ok && data?.ok) {
        setItems(data.items ?? []);
        setSystemOptions(data.systems ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, systemFilter]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [search, statusFilter, systemFilter, perPage]);

  const total = items.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, lastPage);
  const from = total === 0 ? 0 : (safePage - 1) * perPage + 1;
  const to = Math.min(safePage * perPage, total);
  const slice = items.slice((safePage - 1) * perPage, safePage * perPage);

  const stats = React.useMemo(() => {
    const inProgress = items.filter((i) => i.displayStatus === "in_progress").length;
    const pending = items.filter((i) => i.displayStatus === "pending_review" || i.displayStatus === "scheduled").length;
    const completed = items.filter((i) => i.displayStatus === "completed").length;
    const overdue = items.filter((i) => i.displayStatus === "overdue").length;
    return [
      { label: t("Total Campaigns"), value: total, hint: t("All time"), tone: "default" as const },
      { label: t("In Progress"), value: inProgress, hint: pct(inProgress, total), tone: "info" as const },
      { label: t("Pending Review"), value: pending, hint: pct(pending, total), tone: "warning" as const },
      { label: t("Completed"), value: completed, hint: pct(completed, total), tone: "success" as const },
      { label: t("Overdue"), value: overdue, hint: pct(overdue, total), tone: "danger" as const },
    ];
  }, [items, total]);

  const save = async () => {
    if (!form.name.trim()) return toast.error("Campaign name required");
    setSaving(true);
    try {
      const res = await fetch("/api/compliance/access-reviews", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success("Campaign created");
        setDialogOpen(false);
        setForm({ name: "", scope: "", dueDate: "" });
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
      const res = await fetch(`/api/compliance/access-reviews/${id}`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as CampaignDetail & { ok?: boolean; item?: CampaignDetail["item"] };
      if (res.ok && data?.ok && data.item) {
        setDetail({ item: data.item, history: data.history ?? [] });
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const patchCampaign = async (id: number, payload: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/compliance/access-reviews/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success(t("Campaign updated"));
        if (detailId === id) void openDetail(id);
        void load();
      }
    } finally {
      setSaving(false);
    }
  };

  const exportEvidence = (campaign: CampaignRow) => {
    void patchCampaign(campaign.id, { exportEvidence: true });
    const blob = new Blob([JSON.stringify(campaign.userReviews, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `access-review-${campaign.id}.json`;
    a.click();
    toast.success("Report exported");
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
    const header = ["Campaign", "System", "Type", "Status", "Due Date", "Progress", "Owner"];
    const rows = items.map((r) => [
      r.name,
      r.system,
      r.reviewType,
      r.displayStatus,
      r.dueDate ? fmtDate(r.dueDate) : "",
      `${r.progressPct}%`,
      r.ownerName ?? "",
    ]);
    const csv = [header, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "access-reviews.csv";
    a.click();
  };

  return (
    <>
      <ComplianceSectionShell
        title={t("Access Reviews")}
        description={t("Review and certify user access to systems and data.")}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => toast.message(t("Analytics coming soon."))}>
              <BarChart3 className="mr-1.5 h-4 w-4" />
              {t("View Analytics")}
            </Button>
            <CompliancePrimaryButton type="button" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("New Review")}
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
                      s.tone === "info" && "text-blue-600",
                      s.tone === "warning" && "text-amber-600",
                      s.tone === "success" && "text-emerald-600",
                      s.tone === "danger" && "text-red-600",
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
                    <SelectItem value="in_progress">{t("In Progress")}</SelectItem>
                    <SelectItem value="scheduled">{t("Scheduled")}</SelectItem>
                    <SelectItem value="pending_review">{t("Pending Review")}</SelectItem>
                    <SelectItem value="completed">{t("Completed")}</SelectItem>
                    <SelectItem value="overdue">{t("Overdue")}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={systemFilter} onValueChange={setSystemFilter}>
                  <SelectTrigger className="h-9 w-[150px] bg-background">
                    <SelectValue placeholder={t("All Systems")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All Systems")}</SelectItem>
                    {systemOptions.map((s) => (
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
                    placeholder={t("Search campaigns...")}
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
                  <KeyRound className="mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="font-medium">{t("No access review campaigns")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("Run periodic certifications with approvals, revocations, and exceptions.")}
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
                        <th className="px-4 py-3">{t("Campaign Name")}</th>
                        <th className="px-4 py-3">{t("System / Application")}</th>
                        <th className="px-4 py-3">{t("Type")}</th>
                        <th className="px-4 py-3">{t("Status")}</th>
                        <th className="px-4 py-3">{t("Reviewers")}</th>
                        <th className="px-4 py-3">{t("Due Date")}</th>
                        <th className="px-4 py-3">{t("Progress")}</th>
                        <th className="w-16 px-4 py-3">{t("Actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slice.map((row) => {
                        const Icon = systemIcon(row.system);
                        const dueHint = daysUntilDue(row.dueDate);
                        const tone = dueDateTone(row.displayStatus as "in_progress" | "pending_review" | "completed" | "overdue" | "scheduled");
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
                              <div className="flex items-center gap-3">
                                <div
                                  className={cn(
                                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                                    systemLogoColor(row.system),
                                  )}
                                >
                                  <Icon className="h-4 w-4" />
                                </div>
                                <span className="font-medium">{row.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-muted-foreground">{row.system}</td>
                            <td className="px-4 py-3.5 text-muted-foreground">{row.reviewType}</td>
                            <td className="px-4 py-3.5">
                              <AccessReviewStatusBadge status={row.displayStatus} />
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center">
                                {row.reviewers.slice(0, 3).map((name, i) => (
                                  <Avatar key={name} className={cn("h-7 w-7 border-2 border-background", i > 0 && "-ml-2")}>
                                    <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                                      {ownerInitials(name)}
                                    </AvatarFallback>
                                  </Avatar>
                                ))}
                                {row.reviewerCount > 3 ? (
                                  <span className="ml-1 text-xs text-muted-foreground">+{row.reviewerCount - 3}</span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              {row.dueDate ? (
                                <span
                                  className={cn(
                                    tone === "danger" && "text-red-600",
                                    tone === "warning" && "text-amber-600",
                                    tone === "info" && "text-blue-600",
                                    tone === "success" && "text-emerald-600",
                                  )}
                                >
                                  <ComplianceDate value={row.dueDate} />
                                  {dueHint ? <span className="ml-1 block text-xs">({dueHint})</span> : null}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-4 py-3.5 min-w-[120px]">
                              <div className="flex items-center gap-2">
                                <span className="text-xs tabular-nums text-muted-foreground">{row.progressPct}%</span>
                                <Progress
                                  value={row.progressPct}
                                  className={cn("h-1.5 flex-1", progressBarColor(row.displayStatus))}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                              <ComplianceRowActions
                                label={t("View")}
                                onView={() => void openDetail(row.id)}
                                items={[
                                  { label: "Start review", onSelect: () => void patchCampaign(row.id, { action: "start_review" }) },
                                  { label: "Download", onSelect: () => exportEvidence(row) },
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
                  entityLabel={t("campaigns")}
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
            <DialogTitle>{t("New Review")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t("Name")}</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>{t("Scope")}</Label>
              <Input
                value={form.scope}
                onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))}
                placeholder={t("All admin roles")}
              />
            </div>
            <ComplianceDateField
              label={t("Due date")}
              value={form.dueDate}
              onChange={(v) => setForm((f) => ({ ...f, dueDate: v }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button onClick={() => void save()} disabled={saving} style={{ backgroundColor: COMPLIANCE_BRAND }} className="text-white">
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
                <div className="flex items-start gap-2 pr-8">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <SheetTitle className="text-lg">{detail.item.name}</SheetTitle>
                      <AccessReviewStatusBadge status={detail.item.displayStatus} />
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <Tabs value={detailTab} onValueChange={setDetailTab} className="flex min-h-0 flex-1 flex-col">
                <TabsList className="mx-6 mt-3 h-auto w-auto justify-start gap-1 rounded-none border-b bg-transparent p-0">
                  {[
                    { id: "overview", label: t("Overview") },
                    { id: "reviewers", label: t("Reviewers") },
                    { id: "access", label: t("Access") },
                    { id: "activity", label: t("Activity") },
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
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("Description")}
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground">{detail.item.description}</p>
                    </div>

                    <div className="rounded-lg border bg-muted/20 p-4">
                      <MetaRow label={t("System")}>
                        <span>{detail.item.system}</span>
                      </MetaRow>
                      <MetaRow label={t("Type")}>
                        <span>{detail.item.reviewType}</span>
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
                        <AccessReviewStatusBadge status={detail.item.displayStatus} />
                      </MetaRow>
                      <MetaRow label={t("Start Date")}>
                        <ComplianceDate value={detail.item.startDate} />
                      </MetaRow>
                      <MetaRow label={t("Due Date")}>
                        <span className={cn(detail.item.displayStatus === "overdue" && "text-red-600")}>
                          <ComplianceDate value={detail.item.dueDate} />
                          {detail.item.dueDate ? (
                            <span className="ml-1 text-xs">({daysUntilDue(detail.item.dueDate)})</span>
                          ) : null}
                        </span>
                      </MetaRow>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("Review Progress")}
                      </p>
                      <div className="rounded-lg border p-4 space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("Reviewers")}</span>
                          <button type="button" className="text-primary" onClick={() => setDetailTab("reviewers")}>
                            {detail.item.reviewerCount} {t("View all")}
                          </button>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("Users in Scope")}</span>
                          <span className="font-medium">{detail.item.progress.usersInScope}</span>
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-muted-foreground">
                              {t("Reviewed")}: {detail.item.progress.reviewed} ({detail.item.progress.progressPct}%)
                            </span>
                          </div>
                          <Progress
                            value={detail.item.progress.progressPct}
                            className={cn("h-2", progressBarColor(detail.item.displayStatus))}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("Decision Metrics")}
                      </p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[
                          { label: t("Approved"), value: detail.item.progress.approved, tone: "text-emerald-600" },
                          { label: t("Removed"), value: detail.item.progress.removed, tone: "text-red-600" },
                          { label: t("Modified"), value: detail.item.progress.modified, tone: "text-amber-600" },
                          { label: t("Pending"), value: detail.item.progress.pending, tone: "text-muted-foreground" },
                        ].map((m) => (
                          <div key={m.label} className="rounded-lg border p-3 text-center">
                            <p className={cn("text-xl font-bold tabular-nums", m.tone)}>{m.value}</p>
                            <p className="text-xs text-muted-foreground">{m.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("System Information")}
                      </p>
                      <div className="rounded-lg border bg-muted/20 p-4 text-sm">
                        <MetaRow label={t("Connection Status")}>
                          <span className="flex items-center justify-end gap-1.5 text-emerald-600">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            {t("Connected")}
                          </span>
                        </MetaRow>
                        <MetaRow label={t("Last Sync")}>
                          {complianceRelativeTime(detail.item.systemInfo.lastSync)}
                        </MetaRow>
                        <MetaRow label={t("Total Users")}>{detail.item.systemInfo.totalUsers}</MetaRow>
                        <MetaRow label={t("Groups")}>{detail.item.systemInfo.groups}</MetaRow>
                        <MetaRow label={t("SSO Enabled")}>{detail.item.systemInfo.ssoEnabled ? t("Yes") : t("No")}</MetaRow>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="reviewers" className="mt-0">
                    <ul className="divide-y rounded-lg border">
                      {detail.item.reviewers.map((name) => (
                        <li key={name} className="flex items-center gap-3 px-4 py-3 text-sm">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-xs text-primary">
                              {ownerInitials(name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{name}</span>
                        </li>
                      ))}
                    </ul>
                  </TabsContent>

                  <TabsContent value="access" className="mt-0">
                    {(detail.item.userReviews ?? []).length ? (
                      <ul className="space-y-2">
                        {detail.item.userReviews.map((u, i) => (
                          <li key={i} className="rounded-lg border px-4 py-3 text-sm">
                            <p className="font-medium">
                              {u.name}
                              {u.role ? ` · ${u.role}` : ""}
                            </p>
                            <AccessReviewStatusBadge status={u.decision === "approved" ? "completed" : u.decision === "revoked" ? "overdue" : "pending_review"} />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("No user access records yet.")}</p>
                    )}
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

                  <TabsContent value="settings" className="mt-0">
                    <div className="space-y-3">
                      <Label>{t("Status")}</Label>
                      <Select
                        value={detail.item.status}
                        onValueChange={(v) => void patchCampaign(detail.item.id, { status: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COMPLIANCE_ACCESS_REVIEW_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s.replace(/_/g, " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>

              <div className="flex shrink-0 gap-2 border-t px-6 py-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => void patchCampaign(detail.item.id, { action: "start_review" })}
                  disabled={saving}
                >
                  {t("Review Access")}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => toast.message(t("Reminder sent."))}
                  disabled={saving}
                >
                  <Send className="mr-1.5 h-4 w-4" />
                  {t("Send Reminder")}
                </Button>
                <Button
                  className="flex-1 text-white"
                  style={{ backgroundColor: COMPLIANCE_BRAND }}
                  onClick={() => exportEvidence(detail.item)}
                  disabled={saving}
                >
                  <Download className="mr-1.5 h-4 w-4" />
                  {t("Export Report")}
                </Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
