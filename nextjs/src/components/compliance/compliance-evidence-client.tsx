"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  Filter,
  Image as ImageIcon,
  Loader2,
  Plus,
  Search,
  Upload,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { EvidenceStatusBadge } from "@/components/compliance/compliance-status-badge";
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
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/lib/admin-t";
import { cn } from "@/lib/utils";

type FrameworkOption = { id: number; code: string; name: string };

type EvidenceRow = {
  id: number;
  title: string;
  status: string;
  evidenceType: string;
  controlCode: string | null;
  controlTitle: string | null;
  frameworks: Array<{ code: string; name: string }>;
  expiresAt: string | null;
  auditorVisible: boolean;
  fileUrl: string | null;
  notes: string | null;
  uploadedByName: string | null;
  createdAt: string | null;
  collectedAt: string | null;
};

type EvidenceDetail = {
  item: EvidenceRow;
  frameworks: Array<{ code: string; name: string }>;
  attachments: Array<{ id: number; fileName: string; fileUrl: string; mimeType: string | null }>;
  comments: Array<{ id: number; body: string; authorName: string | null; createdAt: string }>;
  history: Array<{ id: number; action: string; actorName: string | null; createdAt: string }>;
};

const EVIDENCE_TYPES = ["document", "screenshot", "report", "certificate", "policy"] as const;

function pct(count: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((count / total) * 100)}%`;
}

function isExpired(row: { expiresAt: string | null }) {
  return row.expiresAt ? new Date(row.expiresAt) < new Date() : false;
}

function isExpiringSoon(row: { expiresAt: string | null }) {
  if (!row.expiresAt || isExpired(row)) return false;
  const days = Math.ceil((new Date(row.expiresAt).getTime() - Date.now()) / 86400000);
  return days <= 30;
}

function daysUntilExpiry(value: string | null | undefined) {
  if (!value) return null;
  const days = Math.ceil((new Date(value).getTime() - Date.now()) / 86400000);
  if (days < 0) return t("Expired");
  if (days === 0) return t("Today");
  return `${days} ${t("days left")}`;
}

function ownerInitials(name: string | null | undefined) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function evidenceTypeIcon(type: string) {
  if (type === "screenshot") return ImageIcon;
  return FileText;
}

function evidenceTypeLabel(type: string) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function fileNameFromEvidence(row: EvidenceRow) {
  if (row.fileUrl) {
    try {
      const part = row.fileUrl.split("/").pop();
      if (part) return decodeURIComponent(part);
    } catch {
      /* ignore */
    }
  }
  return `${row.title.replace(/\s+/g, "_")}.pdf`;
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

export function ComplianceEvidenceClient() {
  const { fmtDate } = useComplianceFormat();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<EvidenceRow[]>([]);
  const [frameworkOptions, setFrameworkOptions] = React.useState<FrameworkOption[]>([]);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [frameworkFilter, setFrameworkFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [requestOpen, setRequestOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [detailId, setDetailId] = React.useState<number | null>(null);
  const [detail, setDetail] = React.useState<EvidenceDetail | null>(null);
  const [detailTab, setDetailTab] = React.useState("details");
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [comment, setComment] = React.useState("");
  const [savingDetail, setSavingDetail] = React.useState(false);
  const [form, setForm] = React.useState({
    title: "",
    fileUrl: "",
    controlId: "",
    expiresAt: "",
    auditorVisible: false,
    evidenceType: "document",
  });

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("evidenceType", typeFilter);
      if (frameworkFilter !== "all") params.set("frameworkId", frameworkFilter);
      const qs = params.toString();
      const res = await fetch(`/api/compliance/evidence${qs ? `?${qs}` : ""}`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        items?: EvidenceRow[];
        frameworks?: FrameworkOption[];
      };
      if (!res.ok || !data?.ok) {
        toast.error("Failed to load evidence");
        setItems([]);
        return;
      }
      setItems(data.items ?? []);
      setFrameworkOptions(data.frameworks ?? []);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter, frameworkFilter]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setPage(1);
  }, [search, statusFilter, typeFilter, frameworkFilter, perPage]);

  const total = items.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, lastPage);
  const from = total === 0 ? 0 : (safePage - 1) * perPage + 1;
  const to = Math.min(safePage * perPage, total);
  const slice = items.slice((safePage - 1) * perPage, safePage * perPage);

  const stats = React.useMemo(() => {
    const approved = items.filter((i) => i.status === "approved" || i.status === "complete").length;
    const pending = items.filter((i) => ["pending", "requested", "draft"].includes(i.status)).length;
    const rejected = items.filter((i) => i.status === "rejected").length;
    const expiringSoon = items.filter((i) => isExpiringSoon(i)).length;
    return [
      { label: t("Total Evidence"), value: total, hint: undefined, icon: FileCheck2, tone: "default" as const },
      { label: t("Approved"), value: approved, hint: pct(approved, total), icon: CheckCircle2, tone: "success" as const },
      { label: t("Pending Review"), value: pending, hint: pct(pending, total), icon: Clock, tone: "warning" as const },
      { label: t("Rejected"), value: rejected, hint: pct(rejected, total), icon: XCircle, tone: "danger" as const },
      { label: t("Expiring Soon"), value: expiringSoon, hint: pct(expiringSoon, total), icon: AlertTriangle, tone: "warning" as const },
    ];
  }, [items, total]);

  const submitEvidence = async (isRequest: boolean) => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/compliance/evidence", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          controlId: form.controlId ? Number(form.controlId) : null,
          isRequest,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Save failed");
        return;
      }
      toast.success(isRequest ? "Evidence request created" : "Evidence uploaded");
      setUploadOpen(false);
      setRequestOpen(false);
      setForm({ title: "", fileUrl: "", controlId: "", expiresAt: "", auditorVisible: false, evidenceType: "document" });
      void load();
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (id: number) => {
    setDetailId(id);
    setDetailTab("details");
    setDetailLoading(true);
    setDetail(null);
    try {
    const res = await fetch(`/api/compliance/evidence/${id}`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as EvidenceDetail & { ok?: boolean; item?: EvidenceRow };
      if (res.ok && data?.ok && data.item) {
        setDetail({
          item: data.item,
          frameworks: data.frameworks ?? data.item.frameworks ?? [],
          attachments: data.attachments ?? [],
          comments: data.comments ?? [],
          history: data.history ?? [],
        });
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const patchDetail = async (payload: Record<string, unknown>, id = detailId) => {
    if (!id) return;
    setSavingDetail(true);
    try {
      const res = await fetch(`/api/compliance/evidence/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (res.ok) {
        toast.success(t("Evidence updated"));
        if (detailId === id) void openDetail(id);
      void load();
      }
    } finally {
      setSavingDetail(false);
    }
  };

  const approve = async (approveEvidence: boolean) => {
    await patchDetail({ approve: approveEvidence, reject: !approveEvidence, comment: comment || undefined });
    setComment("");
  };

  const exportCsv = () => {
    const header = ["Evidence", "Control", "Framework", "Type", "Status", "Expiry", "Uploaded By", "Uploaded At"];
    const rows = items.map((r) => [
      r.title,
      r.controlCode ?? "",
      r.frameworks.map((f) => f.name).join("; "),
      r.evidenceType,
      r.status,
      r.expiresAt ? fmtDate(r.expiresAt) : "",
      r.uploadedByName ?? "",
      r.createdAt ? fmtDate(r.createdAt) : "",
    ]);
    const csv = [header, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "compliance-evidence.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <ComplianceSectionShell
        title={t("Evidence")}
        description={t("Upload, manage, and track all compliance evidence in one place.")}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => setRequestOpen(true)}>
              {t("Request Evidence")}
          </Button>
            <CompliancePrimaryButton type="button" onClick={() => setUploadOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("Upload Evidence")}
            </CompliancePrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          {/* Stat cards with icons */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.label} className={complianceCardClass}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          s.tone === "success" && "text-emerald-600",
                          s.tone === "warning" && "text-amber-600",
                          s.tone === "danger" && "text-red-600",
                          s.tone === "default" && "text-violet-600",
                        )}
                      />
                    </div>
                    <p
                      className={cn(
                        "mt-1 text-2xl font-bold tabular-nums",
                        s.tone === "success" && "text-emerald-600",
                        s.tone === "warning" && "text-amber-600",
                        s.tone === "danger" && "text-red-600",
                      )}
                    >
                      {s.value}
                    </p>
                    {s.hint ? <p className="mt-0.5 text-xs text-muted-foreground">{s.hint}</p> : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>

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
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-[140px] bg-background">
                    <SelectValue placeholder={t("All Statuses")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All Statuses")}</SelectItem>
                    <SelectItem value="approved">{t("Approved")}</SelectItem>
                    <SelectItem value="pending">{t("Pending Review")}</SelectItem>
                    <SelectItem value="requested">{t("Requested")}</SelectItem>
                    <SelectItem value="rejected">{t("Rejected")}</SelectItem>
                    <SelectItem value="draft">{t("Draft")}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-9 w-[130px] bg-background">
                    <SelectValue placeholder={t("All Types")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All Types")}</SelectItem>
                    {EVIDENCE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {evidenceTypeLabel(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative min-w-[220px] flex-1 lg:max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-9 bg-background pl-8"
                    placeholder={t("Search evidence...")}
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
                  <Upload className="mr-1.5 h-4 w-4" />
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
                  <FileCheck2 className="mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="font-medium">{t("No evidence")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("Upload or request evidence and link it to controls.")}
                  </p>
                </div>
              ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
                      <tr className={complianceTableHeadClass}>
                        <th className="px-4 py-3">{t("Evidence")}</th>
                        <th className="px-4 py-3">{t("Control")}</th>
                        <th className="px-4 py-3">{t("Framework")}</th>
                        <th className="px-4 py-3">{t("Type")}</th>
                        <th className="px-4 py-3">{t("Status")}</th>
                        <th className="px-4 py-3">{t("Expiry Date")}</th>
                        <th className="px-4 py-3">{t("Uploaded By")}</th>
                        <th className="px-4 py-3">{t("Uploaded At")}</th>
                        <th className="px-4 py-3 w-24">{t("Actions")}</th>
              </tr>
            </thead>
            <tbody>
                      {slice.map((row) => {
                        const TypeIcon = evidenceTypeIcon(row.evidenceType);
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
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                                  <TypeIcon className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <span className="font-medium">{row.title}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                              {row.controlCode ?? "—"}
                            </td>
                            <td className="px-4 py-3.5">
                              <FrameworkBadges frameworks={row.frameworks} />
                            </td>
                            <td className="px-4 py-3.5 capitalize text-muted-foreground">
                              {evidenceTypeLabel(row.evidenceType)}
                            </td>
                            <td className="px-4 py-3.5">
                              <EvidenceStatusBadge status={row.status} expired={isExpired(row)} />
                            </td>
                            <td className="px-4 py-3.5 text-muted-foreground">
                              <ComplianceDate value={row.expiresAt} />
                            </td>
                            <td className="px-4 py-3.5">
                              {row.uploadedByName ? (
                                <span className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                                      {ownerInitials(row.uploadedByName)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-muted-foreground">{row.uploadedByName}</span>
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-muted-foreground">
                              <ComplianceDate value={row.createdAt} />
                  </td>
                            <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                              <ComplianceRowActions
                                label={t("View")}
                                onView={() => void openDetail(row.id)}
                                items={[
                                  { label: "Approve", onSelect: () => void patchDetail({ approve: true }, row.id) },
                                  { label: "Reject", onSelect: () => void patchDetail({ reject: true }, row.id) },
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
                  entityLabel={t("evidence items")}
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

      <EvidenceFormSheet
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        title={t("Upload Evidence")}
        form={form}
        setForm={setForm}
        saving={saving}
        onSubmit={() => void submitEvidence(false)}
      />
      <EvidenceFormSheet
        open={requestOpen}
        onOpenChange={setRequestOpen}
        title={t("Request Evidence")}
        form={form}
        setForm={setForm}
        saving={saving}
        onSubmit={() => void submitEvidence(true)}
      />

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
                      <EvidenceStatusBadge status={detail.item.status} expired={isExpired(detail.item)} />
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <Tabs value={detailTab} onValueChange={setDetailTab} className="flex min-h-0 flex-1 flex-col">
                <TabsList className="mx-6 mt-3 h-auto w-auto justify-start gap-1 rounded-none border-b bg-transparent p-0">
                  {[
                    { id: "details", label: t("Details") },
                    { id: "history", label: t("History") },
                    { id: "comments", label: `${t("Comments")} (${detail.comments.length})` },
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
                  <TabsContent value="details" className="mt-0 space-y-5">
                    <div className="rounded-lg border bg-muted/20 p-4">
                      <MetaRow label={t("Control ID")}>
                        <span className="font-mono text-xs">{detail.item.controlCode ?? "—"}</span>
                      </MetaRow>
                      <MetaRow label={t("Frameworks")}>
                        <FrameworkBadges frameworks={detail.frameworks} />
                      </MetaRow>
                      <MetaRow label={t("Type")}>
                        <span className="capitalize">{evidenceTypeLabel(detail.item.evidenceType)}</span>
                      </MetaRow>
                      <MetaRow label={t("Status")}>
                        <EvidenceStatusBadge status={detail.item.status} expired={isExpired(detail.item)} />
                      </MetaRow>
                      <MetaRow label={t("Expiry Date")}>
                        <span>
                          <ComplianceDate value={detail.item.expiresAt} />
                          {detail.item.expiresAt ? (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({daysUntilExpiry(detail.item.expiresAt)})
                            </span>
                          ) : null}
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
                        <ComplianceDate value={detail.item.createdAt} />
                      </MetaRow>
                    </div>

                    {detail.item.notes ? (
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {t("Description")}
                        </p>
                        <p className="text-sm leading-relaxed text-muted-foreground">{detail.item.notes}</p>
                      </div>
                    ) : null}

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("File")}
                      </p>
                      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{fileNameFromEvidence(detail.item)}</p>
                            <p className="text-xs text-muted-foreground">{t("Document")}</p>
                          </div>
                        </div>
                        {detail.item.fileUrl ? (
                          <Button size="icon" variant="ghost" asChild>
                            <a href={detail.item.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        ) : null}
                      </div>
                      {detail.attachments.map((a) => (
                        <div
                          key={a.id}
                          className="mt-2 flex items-center justify-between rounded-lg border px-4 py-3"
                        >
                          <span className="truncate text-sm">{a.fileName}</span>
                          <Button size="icon" variant="ghost" asChild>
                            <a href={a.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      {detail.item.controlCode ? (
                        <Link
                          href={`/compliance/controls`}
                          className="flex items-center justify-between rounded-md border px-3 py-2 text-sm text-primary hover:bg-muted/40"
                        >
                          <span>{t("Linked Control")}</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      ) : null}
                      <Link
                        href="/compliance/policies"
                        className="flex items-center justify-between rounded-md border px-3 py-2 text-sm text-primary hover:bg-muted/40"
                      >
                        <span>{t("Linked Policy")}</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                      <Link
                        href="/compliance/monitors"
                        className="flex items-center justify-between rounded-md border px-3 py-2 text-sm text-primary hover:bg-muted/40"
                      >
                        <span>{t("Linked Monitor")}</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                      <Link
                        href="/compliance/risks"
                        className="flex items-center justify-between rounded-md border px-3 py-2 text-sm text-primary hover:bg-muted/40"
                      >
                        <span>{t("Related Risk")}</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
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

                    <div className="flex gap-2">
                      <Button size="sm" disabled={savingDetail} onClick={() => void approve(true)}>
                        {t("Approve")}
                      </Button>
                      <Button size="sm" variant="outline" disabled={savingDetail} onClick={() => void approve(false)}>
                        {t("Reject")}
                      </Button>
              </div>
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

                  <TabsContent value="comments" className="mt-0 space-y-4">
                {detail.comments.map((c) => (
                      <div key={c.id} className="rounded-md border px-3 py-2 text-sm">
                        <div className="mb-1 text-xs text-muted-foreground">
                          {c.authorName ?? t("User")} · {complianceRelativeTime(c.createdAt)}
                        </div>
                    {c.body}
                  </div>
                ))}
                    {detail.comments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t("No comments yet.")}</p>
                    ) : null}
                    <div className="space-y-2">
                      <Label>{t("Add comment")}</Label>
                      <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!comment.trim() || savingDetail}
                        onClick={() => void patchDetail({ comment })}
                      >
                        {t("Post comment")}
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="related" className="mt-0 space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {t("Evidence linked to control")}{" "}
                      <span className="font-mono">{detail.item.controlCode ?? "—"}</span>
                    </p>
                    <FrameworkBadges frameworks={detail.frameworks} />
                  </TabsContent>
                </div>
              </Tabs>

              <div className="border-t p-4">
                <CompliancePrimaryButton className="w-full" onClick={() => setDetailTab("details")}>
                  {t("Manage Evidence")}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </CompliancePrimaryButton>
            </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

function EvidenceFormSheet({
  open,
  onOpenChange,
  title,
  form,
  setForm,
  saving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  form: {
    title: string;
    fileUrl: string;
    controlId: string;
    expiresAt: string;
    auditorVisible: boolean;
    evidenceType: string;
  };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  saving: boolean;
  onSubmit: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-[480px]">
        <SheetHeader className="border-b px-6 py-4 text-left">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>{t("Title")}</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("Control ID")}</Label>
              <Input value={form.controlId} onChange={(e) => setForm({ ...form, controlId: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("Type")}</Label>
              <Select value={form.evidenceType} onValueChange={(v) => setForm({ ...form, evidenceType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVIDENCE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {evidenceTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
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
        </div>

        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("Cancel")}
          </Button>
          <Button onClick={onSubmit} disabled={saving} style={{ backgroundColor: COMPLIANCE_BRAND }} className="text-white">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Save")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
