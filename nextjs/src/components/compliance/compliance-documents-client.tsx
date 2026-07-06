"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { DocumentStatusBadge } from "@/components/compliance/compliance-status-badge";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { t } from "@/lib/admin-t";
import { cn } from "@/lib/utils";

type OwnerOption = { id: number; name: string };

type DocumentRow = {
  id: number;
  title: string;
  docType: string;
  docTypeLabel: string;
  status: string;
  effectiveStatus: string;
  version: string;
  frameworks: string[];
  ownerName: string | null;
  expiresAt: string | null;
  expired: boolean;
  expiringSoon: boolean;
  fileUrl: string | null;
  auditorVisible: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

type DocumentDetail = {
  item: DocumentRow & {
    description: string;
    uploadedByName: string | null;
    fileName: string;
    fileSize: string;
    trustCenterPublished: boolean;
  };
  relatedCounts: { controls: number; evidence: number; policies: number; risks: number; monitors: number };
  versions: Array<{
    version: string;
    status: string;
    uploadedAt: string | null;
    uploadedByName: string | null;
    notes: string | null;
  }>;
  access: Array<{ role: string; access: string }>;
  comments: Array<{ id: number; body: string; authorName: string | null; createdAt: string }>;
  history: Array<{ id: number; action: string; actorName: string | null; createdAt: string }>;
};

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

function daysUntilExpiry(value: string | null | undefined) {
  if (!value) return null;
  const days = Math.ceil((new Date(value).getTime() - Date.now()) / 86400000);
  if (days < 0) return t("Expired");
  if (days === 0) return t("Today");
  if (days === 1) return t("in 1 day");
  return `${t("in")} ${days} ${t("days")}`;
}

function documentTypeIcon(docType: string) {
  if (docType.includes("spreadsheet") || docType.includes("excel")) return FileSpreadsheet;
  return FileText;
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

function FrameworkBadges({ frameworks }: { frameworks: string[] }) {
  if (!frameworks.length) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap justify-end gap-1">
      {frameworks.map((fw) => (
        <Badge key={fw} variant="secondary" className="font-normal">
          {fw}
        </Badge>
      ))}
    </div>
  );
}

export function ComplianceDocumentsClient() {
  const { fmtDate } = useComplianceFormat();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<DocumentRow[]>([]);
  const [frameworkOptions, setFrameworkOptions] = React.useState<string[]>([]);
  const [docTypeOptions, setDocTypeOptions] = React.useState<string[]>([]);
  const [ownerOptions, setOwnerOptions] = React.useState<OwnerOption[]>([]);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [frameworkFilter, setFrameworkFilter] = React.useState("all");
  const [ownerFilter, setOwnerFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [detailId, setDetailId] = React.useState<number | null>(null);
  const [detail, setDetail] = React.useState<DocumentDetail | null>(null);
  const [detailTab, setDetailTab] = React.useState("overview");
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [savingDetail, setSavingDetail] = React.useState(false);
  const [form, setForm] = React.useState({
    title: "",
    docType: "general",
    fileUrl: "",
    version: "1.0",
    expiresAt: "",
    auditorVisible: false,
  });

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter === "approved") params.set("status", "approved");
      else if (statusFilter === "pending") params.set("status", "pending");
      else if (statusFilter === "expired") params.set("status", "expired");
      else if (statusFilter === "expiring_soon") params.set("status", "expiring_soon");
      if (typeFilter !== "all") params.set("docType", typeFilter);
      if (frameworkFilter !== "all") params.set("framework", frameworkFilter);
      if (ownerFilter !== "all") params.set("ownerId", ownerFilter);
      const qs = params.toString();
      const res = await fetch(`/api/compliance/documents${qs ? `?${qs}` : ""}`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        items?: DocumentRow[];
        frameworks?: string[];
        docTypes?: string[];
        owners?: OwnerOption[];
      };
      if (!res.ok || !data?.ok) {
        toast.error("Failed to load documents");
        setItems([]);
        return;
      }
      setItems(data.items ?? []);
      setFrameworkOptions(data.frameworks ?? []);
      setDocTypeOptions(data.docTypes ?? []);
      setOwnerOptions(data.owners ?? []);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter, frameworkFilter, ownerFilter]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setPage(1);
  }, [search, statusFilter, typeFilter, frameworkFilter, ownerFilter, perPage]);

  const total = items.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, lastPage);
  const from = total === 0 ? 0 : (safePage - 1) * perPage + 1;
  const to = Math.min(safePage * perPage, total);
  const slice = items.slice((safePage - 1) * perPage, safePage * perPage);

  const stats = React.useMemo(() => {
    const approved = items.filter((i) => i.effectiveStatus === "approved").length;
    const pending = items.filter((i) => i.effectiveStatus === "pending").length;
    const expired = items.filter((i) => i.expired).length;
    const expiringSoon = items.filter((i) => i.expiringSoon && !i.expired).length;
    return [
      { label: t("Total Documents"), value: total, hint: t("All time"), tone: "default" as const },
      { label: t("Expiring Soon"), value: expiringSoon, hint: t("Next 90 days"), tone: "danger" as const },
      { label: t("Expired"), value: expired, hint: t("Require attention"), tone: "danger" as const },
      { label: t("Pending Review"), value: pending, hint: t("Awaiting review"), tone: "warning" as const },
      { label: t("Approved"), value: approved, hint: pct(approved, total), tone: "success" as const },
    ];
  }, [items, total]);

  const saveDocument = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/compliance/documents", {
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
      toast.success(uploadOpen ? "Document uploaded" : "Document created");
      setUploadOpen(false);
      setDialogOpen(false);
      setForm({ title: "", docType: "general", fileUrl: "", version: "1.0", expiresAt: "", auditorVisible: false });
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
    const res = await fetch(`/api/compliance/documents/${id}`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as DocumentDetail & { ok?: boolean; item?: DocumentDetail["item"] };
      if (res.ok && data?.ok && data.item) {
        setDetail({
          item: data.item,
          relatedCounts: data.relatedCounts ?? { controls: 0, evidence: 0, policies: 0, risks: 0, monitors: 0 },
          versions: data.versions ?? [],
          access: data.access ?? [],
          comments: data.comments ?? [],
          history: data.history ?? [],
        });
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const docAction = async (action: "approve" | "request_review" | "new_version", id = detailId) => {
    if (!id) return;
    setSavingDetail(true);
    try {
      const res = await fetch(`/api/compliance/documents/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
        const labels = {
          approve: t("Document approved"),
          request_review: t("Review requested"),
          new_version: t("New version created"),
        };
        toast.success(labels[action]);
        if (detailId === id) void openDetail(id);
        void load();
      }
    } finally {
      setSavingDetail(false);
    }
  };

  const patchDetail = async (payload: Record<string, unknown>) => {
    if (!detailId) return;
    setSavingDetail(true);
    try {
      const res = await fetch(`/api/compliance/documents/${detailId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success(t("Document updated"));
      void openDetail(detailId);
      void load();
    }
    } finally {
      setSavingDetail(false);
    }
  };

  const exportCsv = () => {
    const header = ["Document", "Type", "Frameworks", "Status", "Version", "Owner", "Expiry", "Last Updated"];
    const rows = items.map((r) => [
      r.title,
      r.docTypeLabel,
      r.frameworks.join("; "),
      r.effectiveStatus,
      r.version,
      r.ownerName ?? "",
      r.expiresAt ? fmtDate(r.expiresAt) : "",
      r.updatedAt ? fmtDate(r.updatedAt) : "",
    ]);
    const csv = [header, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "compliance-documents.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const relatedItems = detail
    ? [
        { label: t("Controls"), count: `${detail.relatedCounts.controls} ${t("controls")}`, href: "/compliance/controls" },
        { label: t("Evidence"), count: `${detail.relatedCounts.evidence} ${t("evidence items")}`, href: "/compliance/evidence" },
        { label: t("Policies"), count: `${detail.relatedCounts.policies} ${t("policies")}`, href: "/compliance/policies" },
        { label: t("Risks"), count: detail.relatedCounts.risks ? `${detail.relatedCounts.risks} ${t("risk")}` : "—", href: "/compliance/risks" },
        {
          label: t("Monitors"),
          count: detail.relatedCounts.monitors ? `${detail.relatedCounts.monitors} ${t("monitor")}` : "—",
          href: "/compliance/monitors",
        },
      ]
    : [];

  return (
    <>
      <ComplianceSectionShell
        title={t("Documents")}
        description={t("Store, manage, and track all compliance and security documents.")}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("New Document")}
            </Button>
            <CompliancePrimaryButton type="button" onClick={() => setUploadOpen(true)}>
              <Upload className="mr-1.5 h-4 w-4" />
              {t("Upload Document")}
            </CompliancePrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {stats.map((s) => (
              <Card key={s.label} className={complianceCardClass}>
                <CardContent className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
                  <p
                    className={cn(
                      "mt-1 text-2xl font-semibold tabular-nums",
                      s.tone === "success" && "text-emerald-600",
                      s.tone === "warning" && "text-amber-600",
                      s.tone === "danger" && "text-[#E31B23]",
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
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-9 w-[130px] bg-background">
                    <SelectValue placeholder={t("All Types")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All Types")}</SelectItem>
                    {docTypeOptions.map((dt) => (
                      <SelectItem key={dt} value={dt}>
                        {dt.replace(/_/g, " ")}
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
                    <SelectItem value="approved">{t("Approved")}</SelectItem>
                    <SelectItem value="pending">{t("Pending Review")}</SelectItem>
                    <SelectItem value="expiring_soon">{t("Expiring Soon")}</SelectItem>
                    <SelectItem value="expired">{t("Expired")}</SelectItem>
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
                <div className="relative min-w-[220px] flex-1 lg:max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-9 bg-background pl-8"
                    placeholder={t("Search documents...")}
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
                  <FileText className="mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="font-medium">{t("No documents")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("Compliance documents with version control and auditor visibility.")}
                  </p>
                </div>
              ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
                      <tr className={complianceTableHeadClass}>
                        <th className="px-4 py-3">{t("Document Name")}</th>
                        <th className="px-4 py-3">{t("Type")}</th>
                        <th className="px-4 py-3">{t("Framework(s)")}</th>
                        <th className="px-4 py-3">{t("Status")}</th>
                        <th className="px-4 py-3">{t("Version")}</th>
                        <th className="px-4 py-3">{t("Owner")}</th>
                        <th className="px-4 py-3">{t("Expiry Date")}</th>
                        <th className="px-4 py-3">{t("Last Updated")}</th>
                        <th className="px-4 py-3 w-16">{t("Actions")}</th>
              </tr>
            </thead>
            <tbody>
                      {slice.map((row) => {
                        const TypeIcon = documentTypeIcon(row.docType);
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
                            <td className="px-4 py-3.5">
                              <span className="flex items-center gap-2.5 font-medium">
                                <TypeIcon
                                  className={cn(
                                    "h-4 w-4 shrink-0",
                                    row.docType.includes("audit") || row.title.toLowerCase().includes("soc")
                                      ? "text-[#E31B23]"
                                      : "text-blue-600",
                                  )}
                                />
                                {row.title}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-muted-foreground">{row.docTypeLabel}</td>
                            <td className="px-4 py-3.5">
                              <div className="flex flex-wrap gap-1">
                                {row.frameworks.length
                                  ? row.frameworks.map((fw) => (
                                      <Badge key={fw} variant="outline" className="font-normal text-xs">
                                        {fw}
                                      </Badge>
                                    ))
                                  : "—"}
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <DocumentStatusBadge status={row.status} expired={row.expired} />
                            </td>
                            <td className="px-4 py-3.5 tabular-nums">v{row.version}</td>
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
                            <td className="px-4 py-3.5 text-muted-foreground">
                              <ComplianceDate value={row.expiresAt} />
                            </td>
                            <td className="px-4 py-3.5 text-muted-foreground">
                              <ComplianceDate value={row.updatedAt ?? row.createdAt} />
                            </td>
                            <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                              <ComplianceRowActions
                                label={t("View")}
                                onView={() => void openDetail(row.id)}
                                items={[
                                  { label: "Approve", onSelect: () => void docAction("approve", row.id) },
                                  { label: "Request review", onSelect: () => void docAction("request_review", row.id) },
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
                  entityLabel={t("documents")}
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
            <DialogTitle>{t("New Document")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>{t("Title")}</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>{t("File URL")}</Label>
              <Input value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} />
            </div>
            <ComplianceDateField
              label={t("Expiration")}
              value={form.expiresAt}
              onChange={(v) => setForm({ ...form, expiresAt: v })}
            />
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.auditorVisible}
                onCheckedChange={(v) => setForm({ ...form, auditorVisible: v === true })}
              />
              {t("Visible to auditors")}
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button onClick={() => void saveDocument()} disabled={saving} style={{ backgroundColor: COMPLIANCE_BRAND }} className="text-white">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Upload Document")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("Upload a compliance document to your library.")}</p>
          <div className="grid gap-3 py-2">
            <div>
              <Label>{t("Title")}</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>{t("File URL")}</Label>
              <Input value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} />
            </div>
            <ComplianceDateField
              label={t("Expiration")}
              value={form.expiresAt}
              onChange={(v) => setForm({ ...form, expiresAt: v })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button onClick={() => void saveDocument()} disabled={saving}>
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
                      <DocumentStatusBadge status={detail.item.status} expired={detail.item.expired} />
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <Tabs value={detailTab} onValueChange={setDetailTab} className="flex min-h-0 flex-1 flex-col">
                <TabsList className="mx-6 mt-3 h-auto w-auto justify-start gap-1 rounded-none border-b bg-transparent p-0">
                  {[
                    { id: "overview", label: t("Overview") },
                    { id: "versions", label: t("Versions") },
                    { id: "access", label: t("Access") },
                    { id: "activity", label: t("Activity") },
                    { id: "comments", label: t("Comments") },
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
                      <MetaRow label={t("Document Type")}>
                        <span>{detail.item.docTypeLabel}</span>
                      </MetaRow>
                      <MetaRow label={t("Frameworks")}>
                        <FrameworkBadges frameworks={detail.item.frameworks} />
                      </MetaRow>
                      <MetaRow label={t("Owner")}>
                        <span className="flex items-center justify-end gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="bg-primary/10 text-xs text-primary">
                              {ownerInitials(detail.item.ownerName)}
                            </AvatarFallback>
                          </Avatar>
                          {detail.item.ownerName ?? t("Unknown")}
                        </span>
                      </MetaRow>
                      <MetaRow label={t("Status")}>
                        <DocumentStatusBadge status={detail.item.status} expired={detail.item.expired} />
                      </MetaRow>
                      <MetaRow label={t("Version")}>
                        <span>v{detail.item.version}</span>
                      </MetaRow>
                    </div>

                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("Description")}
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground">{detail.item.description}</p>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("File")}
                      </p>
                      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <FileText className="h-5 w-5 shrink-0 text-[#E31B23]" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{detail.item.fileName}</p>
                            <p className="text-xs text-muted-foreground">{detail.item.fileSize}</p>
                          </div>
                        </div>
                        {detail.item.fileUrl ? (
                          <Button size="icon" variant="ghost" asChild>
                            <a href={detail.item.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        ) : (
                          <Button size="icon" variant="ghost" disabled>
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border bg-muted/20 p-4">
                      <MetaRow label={t("Expiry Date")}>
                        <span className={cn(detail.item.expiringSoon && !detail.item.expired && "text-[#E31B23]")}>
                          {detail.item.expiresAt ? (
                            <>
                              <ComplianceDate value={detail.item.expiresAt} />
                              <span className="ml-1 text-xs font-normal">
                                ({daysUntilExpiry(detail.item.expiresAt)})
                              </span>
                            </>
                          ) : (
                            "—"
                          )}
                        </span>
                      </MetaRow>
                      <MetaRow label={t("Uploaded By")}>
                        <span className="flex items-center justify-end gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="bg-primary/10 text-xs text-primary">
                              {ownerInitials(detail.item.uploadedByName)}
                            </AvatarFallback>
                          </Avatar>
                          {detail.item.uploadedByName ?? t("Unknown")}
                        </span>
                      </MetaRow>
                      <MetaRow label={t("Uploaded At")}>
                        <ComplianceDate value={detail.item.createdAt} withTime />
                      </MetaRow>
                      <MetaRow label={t("Auditor Visible")}>
                        <span className="flex items-center justify-end gap-1.5 text-emerald-600">
                          {detail.item.auditorVisible ? (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              {t("Visible")}
                            </>
                          ) : (
                            <span className="text-muted-foreground">{t("Hidden")}</span>
                          )}
                        </span>
                      </MetaRow>
                      <MetaRow label={t("Trust Center")}>
                        <span className="flex items-center justify-end gap-1.5 text-emerald-600">
                          {detail.item.trustCenterPublished ? (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              {t("Published")}
                            </>
                          ) : (
                            <span className="text-muted-foreground">{t("Not published")}</span>
                          )}
                        </span>
                      </MetaRow>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("Linked Items")}
                      </p>
                      <div className="divide-y rounded-lg border">
                        {relatedItems.map((item) => (
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

                    <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{t("Visible to Auditor")}</p>
                        <p className="text-xs text-muted-foreground">{t("Include in auditor portal exports")}</p>
                      </div>
                      <Switch
                        checked={detail.item.auditorVisible}
                        onCheckedChange={(v) => void patchDetail({ auditorVisible: v })}
                        disabled={savingDetail}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="versions" className="mt-0">
                    <ul className="space-y-3">
                      {detail.versions.map((v) => (
                        <li key={v.version} className="rounded-lg border p-4 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">v{v.version}</span>
                            <DocumentStatusBadge status={v.status} />
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {v.uploadedByName ?? t("Unknown")} · <ComplianceDate value={v.uploadedAt} />
                          </p>
                          {v.notes ? <p className="mt-2 text-muted-foreground">{v.notes}</p> : null}
                        </li>
                      ))}
                    </ul>
                  </TabsContent>

                  <TabsContent value="access" className="mt-0">
                    <ul className="divide-y rounded-lg border">
                      {detail.access.map((a) => (
                        <li key={a.role} className="flex items-center justify-between px-4 py-3 text-sm">
                          <span className="font-medium">{a.role}</span>
                          <span className="text-muted-foreground">{a.access}</span>
                        </li>
                      ))}
                    </ul>
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

                  <TabsContent value="comments" className="mt-0">
                    {detail.comments.length ? (
                      <ul className="space-y-3">
                        {detail.comments.map((c) => (
                          <li key={c.id} className="rounded-lg border p-3 text-sm">
                            <p className="font-medium">{c.authorName ?? t("Unknown")}</p>
                            <p className="mt-1 text-muted-foreground">{c.body}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{complianceRelativeTime(c.createdAt)}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("No comments yet.")}</p>
                    )}
                  </TabsContent>
                </div>
              </Tabs>

              <div className="flex shrink-0 gap-2 border-t px-6 py-4">
                <Button variant="outline" className="flex-1" disabled={savingDetail}>
                  {t("Edit Document")}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={savingDetail}
                  onClick={() => void docAction("request_review")}
                >
                  {t("Request Review")}
                </Button>
                <Button
                  className="flex-1 text-white"
                  style={{ backgroundColor: COMPLIANCE_BRAND }}
                  disabled={savingDetail}
                  onClick={() => void docAction("new_version")}
                >
                  {t("New Version")}
                </Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
