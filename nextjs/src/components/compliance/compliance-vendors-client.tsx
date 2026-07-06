"use client";

import * as React from "react";
import {
  Building2,
  Calendar,
  Download,
  ExternalLink,
  Eye,
  Filter,
  Loader2,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import {
  VendorReviewStatusBadge,
  VendorRiskTierBadge,
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
import { COMPLIANCE_VENDOR_TIERS } from "@/lib/compliance/compliance-day2";
import { daysUntilDate, reviewDueTone } from "@/lib/compliance/compliance-vendors";
import { cn } from "@/lib/utils";

type VendorRow = {
  id: number;
  vendorId: number | null;
  vendorName: string;
  displayName: string;
  category: string;
  categoryShort: string;
  reviewStatus: string;
  displayStatus: string;
  riskTier: string;
  dueDate: string | null;
  frameworks: string[];
  ownerName: string | null;
  website: string;
  soc2Status: string | null;
  isoStatus: string | null;
  hipaaBaa: string | null;
  gdprDpa: string | null;
  completedAt: string | null;
};

type CrmVendor = { id: number; name: string; email: string | null };

type VendorDetail = {
  item: VendorRow & {
    businessOwnerName: string | null;
    contractStart: string;
    contractEnd: string;
    riskScore: number;
    inherentRisk: string;
    residualRisk: string;
    residualScore: number;
    soc2Label: { label: string; tone: string };
    isoLabel: { label: string; tone: string };
    pciLabel: { label: string; tone: string };
    hipaaLabel: { label: string; tone: string };
    gdprLabel: { label: string; tone: string };
    notes: string | null;
    reviewSchedule: string | null;
  };
  relatedCounts: { documents: number; reviews: number; risks: number };
  documents: Array<{ id: number; name: string; type: string }>;
  reviews: Array<{ id: number; name: string; status: string; dueDate: string | null }>;
  risks: Array<{ id: number; title: string; severity: string }>;
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

function vendorLogoColor(name: string) {
  const n = name.toLowerCase();
  if (n.includes("aws") || n.includes("amazon")) return "bg-orange-100 text-orange-700";
  if (n.includes("google")) return "bg-blue-100 text-blue-700";
  if (n.includes("microsoft")) return "bg-sky-100 text-sky-700";
  if (n.includes("okta")) return "bg-indigo-100 text-indigo-700";
  if (n.includes("datadog")) return "bg-violet-100 text-violet-700";
  return "bg-muted text-muted-foreground";
}

export function ComplianceVendorsClient() {
  const { fmtDate } = useComplianceFormat();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<VendorRow[]>([]);
  const [crmVendors, setCrmVendors] = React.useState<CrmVendor[]>([]);
  const [categoryOptions, setCategoryOptions] = React.useState<string[]>([]);
  const [frameworkOptions, setFrameworkOptions] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState("");
  const [tierFilter, setTierFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [frameworkFilter, setFrameworkFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [detailId, setDetailId] = React.useState<number | null>(null);
  const [detail, setDetail] = React.useState<VendorDetail | null>(null);
  const [detailTab, setDetailTab] = React.useState("overview");
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({ vendorId: "", vendorName: "", riskTier: "medium" });

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (tierFilter !== "all") params.set("tier", tierFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (frameworkFilter !== "all") params.set("framework", frameworkFilter);
      const res = await fetch(`/api/compliance/vendor-reviews?${params}`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        items?: VendorRow[];
        crmVendors?: CrmVendor[];
        categories?: string[];
        frameworks?: string[];
      };
      if (res.ok && data?.ok) {
        setItems(data.items ?? []);
        setCrmVendors(data.crmVendors ?? []);
        setCategoryOptions(data.categories ?? []);
        setFrameworkOptions(data.frameworks ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [search, tierFilter, statusFilter, categoryFilter, frameworkFilter]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [search, tierFilter, statusFilter, categoryFilter, frameworkFilter, perPage]);

  const total = items.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, lastPage);
  const from = total === 0 ? 0 : (safePage - 1) * perPage + 1;
  const to = Math.min(safePage * perPage, total);
  const slice = items.slice((safePage - 1) * perPage, safePage * perPage);

  const stats = React.useMemo(() => {
    const high = items.filter((i) => i.riskTier === "high" || i.riskTier === "critical").length;
    const medium = items.filter((i) => i.riskTier === "medium").length;
    const low = items.filter((i) => i.riskTier === "low").length;
    const underReview = items.filter((i) => i.reviewStatus === "pending").length;
    return [
      { label: t("Total Vendors"), value: total, hint: t("All vendors"), tone: "default" as const },
      { label: t("High Risk"), value: high, hint: pct(high, total), tone: "danger" as const },
      { label: t("Medium Risk"), value: medium, hint: pct(medium, total), tone: "warning" as const },
      { label: t("Low Risk"), value: low, hint: pct(low, total), tone: "success" as const },
      { label: t("Under Review"), value: underReview, hint: pct(underReview, total), tone: "info" as const },
    ];
  }, [items, total]);

  const save = async () => {
    const crm = crmVendors.find((v) => String(v.id) === form.vendorId);
    const vendorName = form.vendorName.trim() || crm?.name || "";
    if (!vendorName) return toast.error("Select or enter a vendor");
    setSaving(true);
    try {
      const res = await fetch("/api/compliance/vendor-reviews", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: form.vendorId ? Number(form.vendorId) : null,
          vendorName,
          riskTier: form.riskTier,
        }),
      });
      if (res.ok) {
        toast.success("Vendor added");
        setDialogOpen(false);
        setForm({ vendorId: "", vendorName: "", riskTier: "medium" });
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
      const res = await fetch(`/api/compliance/vendor-reviews/${id}`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as VendorDetail & { ok?: boolean; item?: VendorDetail["item"] };
      if (res.ok && data?.ok && data.item) {
        setDetail({
          item: data.item,
          relatedCounts: data.relatedCounts ?? { documents: 0, reviews: 0, risks: 0 },
          documents: data.documents ?? [],
          reviews: data.reviews ?? [],
          risks: data.risks ?? [],
          history: data.history ?? [],
        });
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const patchVendor = async (id: number, payload: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/compliance/vendor-reviews/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success(t("Vendor updated"));
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
    const header = ["Vendor", "Category", "Risk Tier", "Status", "Frameworks", "Review Due", "Owner"];
    const rows = items.map((r) => [
      r.displayName,
      r.categoryShort,
      r.riskTier,
      r.reviewStatus,
      r.frameworks.join("; "),
      r.dueDate ? fmtDate(r.dueDate) : "",
      r.ownerName ?? "",
    ]);
    const csv = [header, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "compliance-vendors.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <ComplianceSectionShell
        title={t("Vendors")}
        description={t("Manage your third-party vendors and their compliance status.")}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => toast.message(t("Import coming soon."))}>
              <Upload className="mr-1.5 h-4 w-4" />
              {t("Import Vendors")}
            </Button>
            <CompliancePrimaryButton type="button" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("Add Vendor")}
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
                <Select value={tierFilter} onValueChange={setTierFilter}>
                  <SelectTrigger className="h-9 w-[150px] bg-background">
                    <SelectValue placeholder={t("All Risk Tiers")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All Risk Tiers")}</SelectItem>
                    {COMPLIANCE_VENDOR_TIERS.map((tier) => (
                      <SelectItem key={tier} value={tier}>
                        {tier.charAt(0).toUpperCase() + tier.slice(1)}
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
                    <SelectItem value="completed">{t("Active")}</SelectItem>
                    <SelectItem value="pending">{t("Under Review")}</SelectItem>
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
                <Select value={frameworkFilter} onValueChange={setFrameworkFilter}>
                  <SelectTrigger className="h-9 w-[150px] bg-background">
                    <SelectValue placeholder={t("All Frameworks")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All Frameworks")}</SelectItem>
                    {frameworkOptions.map((fw) => (
                      <SelectItem key={fw} value={fw}>
                        {fw}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative min-w-[220px] flex-1 lg:max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-9 bg-background pl-8"
                    placeholder={t("Search vendors...")}
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
                  <Building2 className="mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="font-medium">{t("No vendor reviews")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("Link CRM vendors and track SOC 2, ISO, HIPAA BAA, and GDPR DPA compliance.")}
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
                        <th className="px-4 py-3">{t("Vendor")}</th>
                        <th className="px-4 py-3">{t("Category")}</th>
                        <th className="px-4 py-3">{t("Risk Tier")}</th>
                        <th className="px-4 py-3">{t("Status")}</th>
                        <th className="px-4 py-3">{t("Frameworks")}</th>
                        <th className="px-4 py-3">{t("Review Due")}</th>
                        <th className="px-4 py-3">{t("Owner")}</th>
                        <th className="w-16 px-4 py-3">{t("Actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slice.map((row) => {
                        const dueTone = reviewDueTone(row.dueDate, row.reviewStatus);
                        const daysLeft = daysUntilDate(row.dueDate);
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
                                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                                    vendorLogoColor(row.vendorName),
                                  )}
                                >
                                  {row.displayName.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium">{row.displayName}</p>
                                  <p className="text-xs text-muted-foreground">{row.category}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-muted-foreground">{row.categoryShort}</td>
                            <td className="px-4 py-3.5">
                              <VendorRiskTierBadge tier={row.riskTier} />
                            </td>
                            <td className="px-4 py-3.5">
                              <VendorReviewStatusBadge status={row.reviewStatus} />
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex flex-wrap gap-1">
                                {row.frameworks.slice(0, 2).map((fw) => (
                                  <Badge key={fw} variant="outline" className="font-normal text-xs">
                                    {fw}
                                  </Badge>
                                ))}
                                {row.frameworks.length > 2 ? (
                                  <Badge variant="outline" className="font-normal text-xs">
                                    +{row.frameworks.length - 2}
                                  </Badge>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              {row.dueDate ? (
                                <span
                                  className={cn(
                                    dueTone === "warning" && "text-amber-600",
                                    dueTone === "info" && "text-blue-600",
                                    dueTone === "success" && "text-emerald-600",
                                  )}
                                >
                                  <ComplianceDate value={row.dueDate} />
                                  {daysLeft ? (
                                    <span className="ml-1 text-xs">({daysLeft})</span>
                                  ) : null}
                                </span>
                              ) : row.reviewStatus === "pending" ? (
                                <span className="text-blue-600">{t("Under Review")}</span>
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
                                  { label: "Start review", onSelect: () => void patchVendor(row.id, { action: "start_review" }) },
                                  { label: "Mark active", onSelect: () => void patchVendor(row.id, { reviewStatus: "completed" }) },
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
                  entityLabel={t("vendors")}
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
            <DialogTitle>{t("Add Vendor")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t("CRM vendor")}</Label>
              <Select
                value={form.vendorId || "none"}
                onValueChange={(v) => {
                  const id = v === "none" ? "" : v;
                  const crm = crmVendors.find((x) => String(x.id) === id);
                  setForm((f) => ({ ...f, vendorId: id, vendorName: crm?.name ?? f.vendorName }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("Link CRM vendor")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("Manual entry")}</SelectItem>
                  {crmVendors.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("Vendor name")}</Label>
              <Input value={form.vendorName} onChange={(e) => setForm((f) => ({ ...f, vendorName: e.target.value }))} />
            </div>
            <div>
              <Label>{t("Risk tier")}</Label>
              <Select value={form.riskTier} onValueChange={(v) => setForm((f) => ({ ...f, riskTier: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPLIANCE_VENDOR_TIERS.map((tier) => (
                    <SelectItem key={tier} value={tier}>
                      {tier}
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
                      <SheetTitle className="text-lg">{detail.item.displayName}</SheetTitle>
                      <VendorRiskTierBadge tier={detail.item.riskTier} />
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <Tabs value={detailTab} onValueChange={setDetailTab} className="flex min-h-0 flex-1 flex-col">
                <TabsList className="mx-6 mt-3 h-auto w-auto justify-start gap-1 rounded-none border-b bg-transparent p-0">
                  {[
                    { id: "overview", label: t("Overview") },
                    { id: "documents", label: t("Documents") },
                    { id: "reviews", label: t("Reviews") },
                    { id: "risks", label: t("Risks") },
                    { id: "activity", label: t("Activity") },
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
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("Vendor Information")}
                      </p>
                      <Button size="sm" variant="ghost" className="h-7 text-xs">
                        {t("Edit")}
                      </Button>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-4">
                      <MetaRow label={t("Category")}>
                        <span>{detail.item.category}</span>
                      </MetaRow>
                      <MetaRow label={t("Website")}>
                        <a
                          href={detail.item.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          {detail.item.website.replace(/^https?:\/\//, "")}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </MetaRow>
                      <MetaRow label={t("Vendor Owner")}>
                        <span className="flex items-center justify-end gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="bg-primary/10 text-xs text-primary">
                              {ownerInitials(detail.item.ownerName)}
                            </AvatarFallback>
                          </Avatar>
                          {detail.item.ownerName ?? t("Unassigned")}
                        </span>
                      </MetaRow>
                      <MetaRow label={t("Business Owner")}>
                        <span className="flex items-center justify-end gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="bg-primary/10 text-xs text-primary">
                              {ownerInitials(detail.item.businessOwnerName)}
                            </AvatarFallback>
                          </Avatar>
                          {detail.item.businessOwnerName ?? t("Unassigned")}
                        </span>
                      </MetaRow>
                      <MetaRow label={t("Risk Tier")}>
                        <VendorRiskTierBadge tier={detail.item.riskTier} />
                      </MetaRow>
                      <MetaRow label={t("Status")}>
                        <VendorReviewStatusBadge status={detail.item.reviewStatus} />
                      </MetaRow>
                      <MetaRow label={t("Contract")}>
                        <span>
                          <ComplianceDate value={detail.item.contractStart} /> —{" "}
                          <ComplianceDate value={detail.item.contractEnd} />
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({daysUntilDate(detail.item.contractEnd)})
                          </span>
                        </span>
                      </MetaRow>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("Compliance & Certification")}
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {[
                          { title: "SOC 2 Type II", ...detail.item.soc2Label },
                          { title: "ISO 27001", ...detail.item.isoLabel },
                          { title: "PCI DSS", ...detail.item.pciLabel },
                          { title: "HIPAA BAA", ...detail.item.hipaaLabel },
                          { title: "GDPR DPA", ...detail.item.gdprLabel },
                        ].map((cert) => (
                          <div key={cert.title} className="rounded-lg border p-3 text-sm">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              {cert.title}
                            </p>
                            <p
                              className={cn(
                                "mt-1 font-medium",
                                cert.tone === "success" && "text-emerald-600",
                                cert.tone === "muted" && "text-muted-foreground",
                              )}
                            >
                              {cert.label}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("Risk Summary")}
                      </p>
                      <div className="rounded-lg border p-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{t("Risk Score")}</span>
                          <span className="font-semibold">
                            {detail.item.riskScore} / 100
                          </span>
                        </div>
                        <Progress value={detail.item.riskScore} className="mt-2 h-2 [&>div]:bg-[#E31B23]" />
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">{t("Inherent Risk")}</p>
                            <p className="font-medium text-red-600">{detail.item.inherentRisk}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t("Residual Risk")}</p>
                            <p className="font-medium text-amber-600">
                              {detail.item.residualRisk} ({detail.item.residualScore})
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("Next Review")}
                      </p>
                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              <ComplianceDate value={detail.item.dueDate} />
                            </p>
                            {detail.item.dueDate ? (
                              <p className="text-xs text-amber-600">{daysUntilDate(detail.item.dueDate)}</p>
                            ) : null}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => void patchVendor(detail.item.id, { action: "start_review" })}>
                          {t("Schedule Review")}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="documents" className="mt-0">
                    <ul className="divide-y rounded-lg border">
                      {detail.documents.map((doc) => (
                        <li key={doc.id} className="flex items-center justify-between px-4 py-3 text-sm">
                          <span>{doc.name}</span>
                          <Badge variant="secondary">{doc.type}</Badge>
                        </li>
                      ))}
                    </ul>
                  </TabsContent>

                  <TabsContent value="reviews" className="mt-0">
                    <ul className="space-y-3">
                      {detail.reviews.map((rev) => (
                        <li key={rev.id} className="rounded-lg border p-4 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{rev.name}</span>
                            <VendorReviewStatusBadge status={rev.status} />
                          </div>
                          {rev.dueDate ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {t("Due")}: <ComplianceDate value={rev.dueDate} />
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </TabsContent>

                  <TabsContent value="risks" className="mt-0">
                    {detail.risks.length ? (
                      <ul className="space-y-2">
                        {detail.risks.map((risk) => (
                          <li key={risk.id} className="rounded-lg border px-4 py-3 text-sm">
                            <span className="font-medium">{risk.title}</span>
                            <Badge variant="outline" className="ml-2 capitalize">
                              {risk.severity}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("No linked risks.")}</p>
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
                </div>
              </Tabs>

              <div className="flex shrink-0 gap-2 border-t px-6 py-4">
                <Button variant="outline" className="flex-1">
                  <Eye className="mr-1.5 h-4 w-4" />
                  {t("View Profile")}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="flex-1 text-white" style={{ backgroundColor: COMPLIANCE_BRAND }} disabled={saving}>
                      {t("Start Review")}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => void patchVendor(detail.item.id, { action: "start_review" })}>
                      {t("Start review")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void patchVendor(detail.item.id, { reviewStatus: "completed" })}>
                      {t("Mark review complete")}
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
