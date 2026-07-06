"use client";

import * as React from "react";
import Link from "next/link";
import {
  Archive,
  ChevronRight,
  Download,
  ExternalLink,
  Filter,
  Loader2,
  Plus,
  ScrollText,
  Search,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { PolicyStatusBadge } from "@/components/compliance/compliance-status-badge";
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
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/lib/admin-t";
import { cn } from "@/lib/utils";

type PolicyRow = {
  id: number;
  title: string;
  version: string;
  status: string;
  category: string;
  frameworks: string[];
  ownerUserId: number | null;
  ownerName: string | null;
  reviewDueAt: string | null;
  lastReviewedAt: string | null;
  publishedAt: string | null;
  acknowledgementRequired: boolean;
  acknowledgementCount: number;
  content: string | null;
};

type PolicyDetail = {
  item: PolicyRow & { approvedByName: string | null; approvedAt: string | null };
  acknowledgements: Array<{ id: number; userId: number; version: string; acknowledgedAt: string }>;
  history: Array<{ id: number; action: string; actorName: string | null; createdAt: string }>;
  relatedCounts: { controls: number; evidence: number; documents: number; risks: number; monitors: number };
  acknowledgementTarget: number;
};

type StatusTab = "all" | "published" | "draft" | "in_review" | "archived";

const STATUS_TABS: { id: StatusTab; label: string; status?: string }[] = [
  { id: "all", label: "All Policies" },
  { id: "published", label: "Published", status: "published" },
  { id: "draft", label: "Draft", status: "draft" },
  { id: "in_review", label: "Pending Review", status: "in_review" },
  { id: "archived", label: "Archived", status: "archived" },
];

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

function daysUntil(value: string | null | undefined) {
  if (!value) return null;
  const days = Math.ceil((new Date(value).getTime() - Date.now()) / 86400000);
  if (days < 0) return t("Overdue");
  return `${days} ${t("days left")}`;
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

export function CompliancePoliciesClient() {
  const { fmtDate } = useComplianceFormat();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<PolicyRow[]>([]);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [owners, setOwners] = React.useState<Array<{ id: number; name: string }>>([]);
  const [search, setSearch] = React.useState("");
  const [statusTab, setStatusTab] = React.useState<StatusTab>("all");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [ownerFilter, setOwnerFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [detailId, setDetailId] = React.useState<number | null>(null);
  const [detail, setDetail] = React.useState<PolicyDetail | null>(null);
  const [detailTab, setDetailTab] = React.useState("overview");
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [form, setForm] = React.useState({ title: "", content: "", version: "1.0" });

  const statusFilter = STATUS_TABS.find((tab) => tab.id === statusTab)?.status;

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (ownerFilter !== "all") params.set("ownerId", ownerFilter);
      const qs = params.toString();
      const res = await fetch(`/api/compliance/policies${qs ? `?${qs}` : ""}`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        items?: PolicyRow[];
        categories?: string[];
        owners?: Array<{ id: number; name: string }>;
      };
      if (!res.ok || !data?.ok) {
        toast.error("Failed to load policies");
        setItems([]);
        return;
      }
      setItems(data.items ?? []);
      setCategories(data.categories ?? []);
      setOwners(data.owners ?? []);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, categoryFilter, ownerFilter]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setPage(1);
  }, [search, statusTab, categoryFilter, ownerFilter, perPage]);

  const total = items.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, lastPage);
  const from = total === 0 ? 0 : (safePage - 1) * perPage + 1;
  const to = Math.min(safePage * perPage, total);
  const slice = items.slice((safePage - 1) * perPage, safePage * perPage);

  const stats = React.useMemo(() => {
    const all = items.length;
    const published = items.filter((i) => i.status === "published").length;
    const draft = items.filter((i) => i.status === "draft").length;
    const pending = items.filter((i) => i.status === "in_review").length;
    const archived = items.filter((i) => i.status === "archived").length;
    return [
      { label: t("Total Policies"), value: all, pct: undefined, bar: 100, tone: "default" as const },
      { label: t("Published"), value: published, pct: pct(published, all), bar: all ? (published / all) * 100 : 0, tone: "success" as const },
      { label: t("Draft"), value: draft, pct: pct(draft, all), bar: all ? (draft / all) * 100 : 0, tone: "info" as const },
      { label: t("Pending Review"), value: pending, pct: pct(pending, all), bar: all ? (pending / all) * 100 : 0, tone: "warning" as const },
      { label: t("Archived"), value: archived, pct: pct(archived, all), bar: all ? (archived / all) * 100 : 0, tone: "muted" as const },
    ];
  }, [items]);

  const save = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/compliance/policies", {
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
      toast.success("Policy created");
      setDialogOpen(false);
      setForm({ title: "", content: "", version: "1.0" });
      void load();
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
      const res = await fetch(`/api/compliance/policies/${id}`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as PolicyDetail & { ok?: boolean; item?: PolicyDetail["item"] };
      if (res.ok && data?.ok && data.item) {
        setDetail({
          item: data.item,
          acknowledgements: data.acknowledgements ?? [],
          history: data.history ?? [],
          relatedCounts: data.relatedCounts ?? { controls: 0, evidence: 0, documents: 0, risks: 0, monitors: 0 },
          acknowledgementTarget: data.acknowledgementTarget ?? 0,
        });
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const policyAction = async (action: "publish" | "approve" | "acknowledge" | "new_version" | "archive", id = detailId) => {
    if (!id) return;
    const res = await fetch(`/api/compliance/policies/${id}`, {
      method: action === "acknowledge" ? "POST" : "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      const labels: Record<string, string> = {
        publish: "published",
        approve: "approved",
        acknowledge: "acknowledged",
        new_version: "version created",
        archive: "archived",
      };
      toast.success(`Policy ${labels[action] ?? "updated"}`);
      if (detailId === id) void openDetail(id);
      void load();
    }
  };

  const exportCsv = () => {
    const header = ["Policy", "Frameworks", "Category", "Status", "Version", "Last Reviewed", "Next Review", "Owner"];
    const rows = items.map((r) => [
      r.title,
      r.frameworks.join("; "),
      r.category,
      r.status,
      r.version,
      r.lastReviewedAt ? fmtDate(r.lastReviewedAt) : "",
      r.reviewDueAt ? fmtDate(r.reviewDueAt) : "",
      r.ownerName ?? "",
    ]);
    const csv = [header, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "compliance-policies.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <ComplianceSectionShell
        title={t("Policies")}
        description={t("Create, manage, and track compliance and security policies.")}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => setUploadOpen(true)}>
              <Upload className="mr-1.5 h-4 w-4" />
              {t("Upload Policy")}
            </Button>
            <CompliancePrimaryButton type="button" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("New Policy")}
            </CompliancePrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          {/* Status tabs */}
          <div className="flex flex-wrap gap-1 border-b">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusTab(tab.id)}
                className={cn(
                  "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                  statusTab === tab.id
                    ? "border-[#E31B23] text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t(tab.label)}
              </button>
            ))}
          </div>

          {/* Stat cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {stats.map((s) => (
              <Card key={s.label} className={complianceCardClass}>
                <CardContent className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
                  <p
                    className={cn(
                      "mt-1 text-2xl font-bold tabular-nums",
                      s.tone === "success" && "text-emerald-600",
                      s.tone === "warning" && "text-amber-600",
                      s.tone === "info" && "text-blue-600",
                    )}
                  >
                    {s.value}
                  </p>
                  {s.pct ? (
                    <div className="mt-2 space-y-1">
                      <Progress value={s.bar} className="h-1.5" />
                      <p className="text-xs text-muted-foreground">{s.pct}</p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className={cn(complianceCardClass, "p-4")}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
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
                <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                  <SelectTrigger className="h-9 w-[140px] bg-background">
                    <SelectValue placeholder={t("All Owners")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All Owners")}</SelectItem>
                    {owners.map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative min-w-[220px] flex-1 lg:max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-9 bg-background pl-8"
                    placeholder={t("Search policies...")}
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
                  <ScrollText className="mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="font-medium">{t("No policies")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("Manage policy library, versions, approvals, and employee acknowledgements.")}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={complianceTableHeadClass}>
                        <th className="px-4 py-3">{t("Policy Name")}</th>
                        <th className="px-4 py-3">{t("Frameworks")}</th>
                        <th className="px-4 py-3">{t("Category")}</th>
                        <th className="px-4 py-3">{t("Status")}</th>
                        <th className="px-4 py-3">{t("Version")}</th>
                        <th className="px-4 py-3">{t("Last Reviewed")}</th>
                        <th className="px-4 py-3">{t("Next Review")}</th>
                        <th className="px-4 py-3">{t("Owner")}</th>
                        <th className="px-4 py-3 w-16">{t("Actions")}</th>
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
                          <td className="px-4 py-3.5 font-medium">{row.title}</td>
                          <td className="px-4 py-3.5 text-muted-foreground">{row.frameworks.join(", ") || "—"}</td>
                          <td className="px-4 py-3.5 text-muted-foreground">{row.category}</td>
                          <td className="px-4 py-3.5">
                            <PolicyStatusBadge status={row.status} />
                          </td>
                          <td className="px-4 py-3.5 tabular-nums">v{row.version}</td>
                          <td className="px-4 py-3.5 text-muted-foreground">
                            <ComplianceDate value={row.lastReviewedAt} />
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground">
                            <ComplianceDate value={row.reviewDueAt} />
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
                                { label: "Publish", onSelect: () => void policyAction("publish", row.id) },
                                { label: "Archive", onSelect: () => void policyAction("archive", row.id) },
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
                  entityLabel={t("policies")}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("New Policy")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>{t("Title")}</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>{t("Version")}</Label>
              <Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
            </div>
            <div>
              <Label>{t("Content")}</Label>
              <Textarea rows={8} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
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

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Upload Policy")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("Upload an existing policy document to your library.")}</p>
          <div className="grid gap-3 py-2">
            <div>
              <Label>{t("Title")}</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>{t("Content")}</Label>
              <Textarea rows={6} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {t("Upload")}
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
                      <SheetTitle className="text-lg">{detail.item.title}</SheetTitle>
                      <PolicyStatusBadge status={detail.item.status} />
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <Tabs value={detailTab} onValueChange={setDetailTab} className="flex min-h-0 flex-1 flex-col">
                <TabsList className="mx-6 mt-3 h-auto w-auto justify-start gap-1 rounded-none border-b bg-transparent p-0">
                  {[
                    { id: "overview", label: t("Overview") },
                    { id: "versions", label: t("Versions") },
                    { id: "acknowledgements", label: t("Acknowledgements") },
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
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {detail.item.content?.slice(0, 280) ??
                        t("Organizational policy governing compliance requirements for this control area.")}
                      {detail.item.content && detail.item.content.length > 280 ? "…" : ""}
                    </p>

                    <div className="flex flex-wrap gap-1">
                      {detail.item.frameworks.map((fw) => (
                        <Badge key={fw} variant="secondary">
                          {fw}
                        </Badge>
                      ))}
                    </div>

                    <div className="rounded-lg border bg-muted/20 p-4">
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
                        <PolicyStatusBadge status={detail.item.status} />
                      </MetaRow>
                      <MetaRow label={t("Version")}>v{detail.item.version}</MetaRow>
                      <MetaRow label={t("Last Reviewed")}>
                        <ComplianceDate value={detail.item.lastReviewedAt} />
                      </MetaRow>
                      <MetaRow label={t("Next Review")}>
                        <span>
                          <ComplianceDate value={detail.item.reviewDueAt} />
                          {detail.item.reviewDueAt ? (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({daysUntil(detail.item.reviewDueAt)})
                            </span>
                          ) : null}
                        </span>
                      </MetaRow>
                      {detail.item.approvedByName ? (
                        <>
                          <MetaRow label={t("Approved By")}>
                            <span className="flex items-center justify-end gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className="bg-primary/10 text-xs text-primary">
                                  {ownerInitials(detail.item.approvedByName)}
                                </AvatarFallback>
                              </Avatar>
                              {detail.item.approvedByName}
                            </span>
                          </MetaRow>
                          <MetaRow label={t("Approved On")}>
                            <ComplianceDate value={detail.item.approvedAt} />
                          </MetaRow>
                        </>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <Link
                        href="/compliance/controls"
                        className="flex items-center justify-between rounded-md border px-3 py-2 text-sm text-primary hover:bg-muted/40"
                      >
                        <span>
                          {t("Related Controls")} ({detail.relatedCounts.controls} {t("controls")})
                        </span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                      <Link
                        href="/compliance/documents"
                        className="flex items-center justify-between rounded-md border px-3 py-2 text-sm text-primary hover:bg-muted/40"
                      >
                        <span>
                          {t("Linked Documents")} ({detail.relatedCounts.documents} {t("documents")})
                        </span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("Acknowledgements")}
                      </p>
                      <p className="text-sm font-medium">
                        {detail.item.acknowledgementCount} / {detail.acknowledgementTarget} {t("employees")}
                      </p>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("Related Items")}
                      </p>
                      <ul className="divide-y rounded-lg border">
                        {[
                          { label: t("Controls"), count: detail.relatedCounts.controls, href: "/compliance/controls" },
                          { label: t("Evidence"), count: detail.relatedCounts.evidence, href: "/compliance/evidence" },
                          { label: t("Documents"), count: detail.relatedCounts.documents, href: "/compliance/documents" },
                          { label: t("Risks"), count: detail.relatedCounts.risks, href: "/compliance/risks" },
                          { label: t("Monitors"), count: detail.relatedCounts.monitors, href: "/compliance/monitors" },
                        ].map((item) => (
                          <li key={item.label}>
                            <Link
                              href={item.href}
                              className="flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted/40"
                            >
                              <span>
                                {item.label} ({item.count})
                              </span>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </TabsContent>

                  <TabsContent value="versions" className="mt-0">
                    <div className="rounded-md border px-3 py-2 text-sm">
                      <span className="font-medium">v{detail.item.version}</span>
                      <span className="ml-2 text-muted-foreground">
                        — <PolicyStatusBadge status={detail.item.status} />
                      </span>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {t("Published")}: <ComplianceDate value={detail.item.publishedAt} />
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => void policyAction("new_version")}>
                      {t("Create new version")}
                    </Button>
                  </TabsContent>

                  <TabsContent value="acknowledgements" className="mt-0">
                    <p className="mb-3 text-sm text-muted-foreground">
                      {detail.item.acknowledgementCount} / {detail.acknowledgementTarget} {t("employees acknowledged")}
                    </p>
                    <ul className="space-y-2">
                      {detail.acknowledgements.map((a) => (
                        <li key={a.id} className="rounded-md border px-3 py-2 text-sm">
                          User {a.userId} · v{a.version} · {complianceRelativeTime(a.acknowledgedAt)}
                        </li>
                      ))}
                      {detail.acknowledgements.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("No acknowledgements yet.")}</p>
                      ) : null}
                    </ul>
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => void policyAction("acknowledge")}>
                      {t("Acknowledge policy")}
                    </Button>
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

              <div className="flex gap-2 border-t p-4">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => toast.message(t("Edit coming soon."))}>
                  {t("Edit Policy")}
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => void policyAction("archive")}>
                  <Archive className="mr-1.5 h-4 w-4" />
                  {t("Archive")}
                </Button>
                <CompliancePrimaryButton size="sm" className="flex-1" onClick={() => void policyAction("new_version")}>
                  {t("New Version")}
                </CompliancePrimaryButton>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
