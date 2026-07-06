"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calendar,
  Check,
  CheckCircle2,
  Circle,
  Download,
  ExternalLink,
  Filter,
  FolderOpen,
  ListPlus,
  Loader2,
  MessageSquare,
  Paperclip,
  Pencil,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import {
  ComplianceProgressBar,
  TaskPriorityBadge,
  TaskStatusBadge,
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
  ComplianceDateField,
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
import { dueDateTone } from "@/lib/compliance/compliance-tasks";
import { cn } from "@/lib/utils";

type TaskRow = {
  id: number;
  title: string;
  subtitle: string;
  status: string;
  displayStatus: string;
  priority: string;
  dueDate: string | null;
  dueIn: string | null;
  assigneeName: string | null;
  category: string;
  commentCount: number;
  attachmentCount: number;
  progressPct: number;
};

type TaskDetail = {
  item: TaskRow & {
    description: string;
    createdByName: string;
    createdAt: string;
    notes: string;
    progressSteps: Array<{ title: string; status: string; label: string }>;
    subtasks: Array<{ id: string; title: string; status: string; assigneeName: string }>;
    subtaskCount: number;
    relatedLink: { label: string; href: string } | null;
  };
  comments: Array<{ id: number; body: string; authorName: string | null; createdAt: string }>;
  attachments: Array<{ id: number; fileName: string; fileUrl: string }>;
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
  if (tone === "due") return "bg-yellow-400";
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

function StepIcon({ status }: { status: string }) {
  if (status === "completed") {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />;
  }
  if (status === "in_progress") {
    return <Circle className="h-4 w-4 shrink-0 fill-blue-100 text-blue-600" />;
  }
  return <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />;
}

export function ComplianceTasksClient() {
  const { fmtDate, fmtDateTime } = useComplianceFormat();
  const [loading, setLoading] = React.useState(true);
  const [allItems, setAllItems] = React.useState<TaskRow[]>([]);
  const [ownerOptions, setOwnerOptions] = React.useState<string[]>([]);
  const [categoryOptions, setCategoryOptions] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [priorityFilter, setPriorityFilter] = React.useState("all");
  const [ownerFilter, setOwnerFilter] = React.useState("all");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [detailId, setDetailId] = React.useState<number | null>(null);
  const [detail, setDetail] = React.useState<TaskDetail | null>(null);
  const [detailTab, setDetailTab] = React.useState("details");
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [comment, setComment] = React.useState("");
  const [attachName, setAttachName] = React.useState("");
  const [attachUrl, setAttachUrl] = React.useState("");
  const [form, setForm] = React.useState({
    title: "",
    priority: "medium",
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  });

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      if (ownerFilter !== "all") params.set("owner", ownerFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      const res = await fetch(`/api/compliance/tasks?${params}`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        items?: TaskRow[];
        owners?: string[];
        categories?: string[];
      };
      if (res.ok && data?.ok) {
        setAllItems(data.items ?? []);
        setOwnerOptions(data.owners ?? []);
        setCategoryOptions(data.categories ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, priorityFilter, ownerFilter, categoryFilter]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [search, statusFilter, priorityFilter, ownerFilter, categoryFilter, perPage]);

  const items = allItems;
  const total = items.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, lastPage);
  const from = total === 0 ? 0 : (safePage - 1) * perPage + 1;
  const to = Math.min(safePage * perPage, total);
  const slice = items.slice((safePage - 1) * perPage, safePage * perPage);

  const stats = React.useMemo(() => {
    const base = allItems.length;
    const open = allItems.filter((i) => i.displayStatus === "open").length;
    const inProgress = allItems.filter((i) => i.displayStatus === "in_progress").length;
    const dueSoon = allItems.filter((i) => i.displayStatus === "due_soon").length;
    const overdue = allItems.filter((i) => i.displayStatus === "overdue").length;
    return [
      { label: t("Total Tasks"), value: base, hint: t("All time"), tone: "default" as const },
      { label: t("Open"), value: open, hint: pct(open, base), tone: "warning" as const },
      { label: t("In Progress"), value: inProgress, hint: pct(inProgress, base), tone: "info" as const },
      { label: t("Due Soon"), value: dueSoon, hint: t("Next 7 days"), tone: "due" as const },
      { label: t("Overdue"), value: overdue, hint: pct(overdue, base), tone: "danger" as const },
    ];
  }, [allItems]);

  const save = async () => {
    if (!form.title.trim()) return toast.error(t("Title required"));
    setSaving(true);
    try {
      const res = await fetch("/api/compliance/tasks", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success(t("Task created"));
        setDialogOpen(false);
        setForm({
          title: "",
          priority: "medium",
          dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        });
        void load();
      } else {
        toast.error(t("Create failed"));
      }
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (id: number) => {
    setDetailId(id);
    setDetailTab("details");
    setDetailLoading(true);
    setDetail(null);
    setComment("");
    try {
      const res = await fetch(`/api/compliance/tasks/${id}`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as TaskDetail & { ok?: boolean; item?: TaskDetail["item"] };
      if (res.ok && data?.ok && data.item) {
        setDetail({
          item: data.item,
          comments: data.comments ?? [],
          attachments: data.attachments ?? [],
        });
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/compliance/tasks/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success(status === "done" ? t("Task completed") : t("Task updated"));
        if (detailId === id) void openDetail(id);
        void load();
      }
    } finally {
      setSaving(false);
    }
  };

  const addComment = async () => {
    if (!detailId || !comment.trim()) return;
    const res = await fetch(`/api/compliance/tasks/${detailId}/comments`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: comment.trim() }),
    });
    if (!res.ok) {
      toast.error(t("Comment failed"));
      return;
    }
    setComment("");
    void openDetail(detailId);
    void load();
  };

  const addAttachment = async () => {
    if (!detailId || !attachName.trim() || !attachUrl.trim()) return;
    const res = await fetch(`/api/compliance/tasks/${detailId}/attachments`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: attachName.trim(), fileUrl: attachUrl.trim() }),
    });
    if (!res.ok) {
      toast.error(t("Attachment failed"));
      return;
    }
    setAttachName("");
    setAttachUrl("");
    void openDetail(detailId);
    void load();
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
    const header = ["Title", "Category", "Priority", "Status", "Due Date", "Assignee"];
    const rows = items.map((r) => [
      r.title,
      r.category,
      r.priority,
      r.displayStatus,
      r.dueDate ? fmtDate(r.dueDate) : "",
      r.assigneeName ?? "",
    ]);
    const csv = [header, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "compliance-tasks.csv";
    a.click();
  };

  return (
    <>
      <ComplianceSectionShell
        title={t("Tasks")}
        description={t("Track and manage your compliance tasks and action items.")}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => toast.message(t("Calendar view coming soon."))}>
              <Calendar className="mr-1.5 h-4 w-4" />
              {t("Calendar View")}
            </Button>
            <CompliancePrimaryButton type="button" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("New Task")}
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
                      s.tone === "warning" && "text-orange-600",
                      s.tone === "due" && "text-yellow-600",
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
                <div className="relative min-w-[200px] flex-1 lg:max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-9 bg-background pl-8"
                    placeholder={t("Search tasks...")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-[140px] bg-background">
                    <SelectValue placeholder={t("All Statuses")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All Statuses")}</SelectItem>
                    <SelectItem value="open">{t("Open")}</SelectItem>
                    <SelectItem value="in_progress">{t("In Progress")}</SelectItem>
                    <SelectItem value="due_soon">{t("Due Soon")}</SelectItem>
                    <SelectItem value="overdue">{t("Overdue")}</SelectItem>
                    <SelectItem value="done">{t("Completed")}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="h-9 w-[140px] bg-background">
                    <SelectValue placeholder={t("All Priorities")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All Priorities")}</SelectItem>
                    <SelectItem value="high">{t("High")}</SelectItem>
                    <SelectItem value="medium">{t("Medium")}</SelectItem>
                    <SelectItem value="low">{t("Low")}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                  <SelectTrigger className="h-9 w-[130px] bg-background">
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
                  <FolderOpen className="mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="font-medium">{t("No tasks yet")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("Create tasks to track evidence collection, reviews, and remediation.")}
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
                        <th className="px-4 py-3">{t("Task Title")}</th>
                        <th className="px-4 py-3">{t("Priority")}</th>
                        <th className="px-4 py-3">{t("Status")}</th>
                        <th className="px-4 py-3">{t("Due Date")}</th>
                        <th className="px-4 py-3">{t("Assignee")}</th>
                        <th className="px-4 py-3">{t("Category")}</th>
                        <th className="px-4 py-3">{t("Activity")}</th>
                        <th className="w-28 px-4 py-3 text-right">{t("Actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slice.map((row) => {
                        const tone = dueDateTone(row.displayStatus as Parameters<typeof dueDateTone>[0]);
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
                              <p className="font-medium">{row.title}</p>
                              <p className="text-xs text-muted-foreground">{row.subtitle}</p>
                            </td>
                            <td className="px-4 py-3.5">
                              <TaskPriorityBadge priority={row.priority} />
                            </td>
                            <td className="px-4 py-3.5">
                              <TaskStatusBadge displayStatus={row.displayStatus} />
                            </td>
                            <td className="px-4 py-3.5">
                              {row.dueDate ? (
                                <span
                                  className={cn(
                                    tone === "danger" && "text-red-600",
                                    tone === "warning" && "text-amber-600",
                                    tone === "info" && "text-blue-600",
                                  )}
                                >
                                  <ComplianceDate value={row.dueDate} />
                                  {row.dueIn ? (
                                    <span className="block text-xs text-muted-foreground">{row.dueIn}</span>
                                  ) : null}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-7 w-7">
                                  <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                                    {ownerInitials(row.assigneeName)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{row.assigneeName}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-muted-foreground">{row.category}</td>
                            <td className="px-4 py-3.5 text-muted-foreground">
                              <span className="inline-flex items-center gap-2">
                                <span className="inline-flex items-center gap-0.5">
                                  <MessageSquare className="h-3.5 w-3.5" />
                                  {row.commentCount}
                                </span>
                                <span className="inline-flex items-center gap-0.5">
                                  <Paperclip className="h-3.5 w-3.5" />
                                  {row.attachmentCount}
                                </span>
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                              <ComplianceRowActions
                                label={t("View")}
                                onView={() => void openDetail(row.id)}
                                items={[
                                  { label: "Mark in progress", onSelect: () => void updateStatus(row.id, "in_progress") },
                                  { label: "Complete", onSelect: () => void updateStatus(row.id, "done") },
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
                  entityLabel={t("tasks")}
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
            <DialogTitle>{t("New Task")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t("Title")}</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("Priority")}</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">{t("High")}</SelectItem>
                    <SelectItem value="medium">{t("Medium")}</SelectItem>
                    <SelectItem value="low">{t("Low")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <ComplianceDateField
                  label={t("Due date")}
                  value={form.dueDate}
                  onChange={(v) => setForm((f) => ({ ...f, dueDate: v }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button onClick={() => void save()} disabled={saving} style={{ backgroundColor: COMPLIANCE_BRAND }} className="text-white">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Create Task")}
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
                      <TaskStatusBadge displayStatus={detail.item.displayStatus} />
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <Tabs value={detailTab} onValueChange={setDetailTab} className="flex min-h-0 flex-1 flex-col">
                <TabsList className="mx-6 mt-3 h-auto w-auto justify-start gap-1 rounded-none border-b bg-transparent p-0">
                  {[
                    { id: "details", label: t("Details") },
                    { id: "activity", label: t("Activity") },
                    {
                      id: "subtasks",
                      label: `${t("Subtasks")}${detail.item.subtaskCount ? ` (${detail.item.subtaskCount})` : ""}`,
                    },
                    {
                      id: "attachments",
                      label: `${t("Attachments")}${detail.attachments.length ? ` (${detail.attachments.length})` : ""}`,
                    },
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
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("Description")}
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground">{detail.item.description}</p>
                    </div>

                    <div className="rounded-lg border bg-muted/20 p-4">
                      <MetaRow label={t("Title")}>
                        <span className="max-w-[220px] truncate">{detail.item.title}</span>
                      </MetaRow>
                      <MetaRow label={t("Category")}>
                        <span className="flex items-center justify-end gap-1.5">
                          <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                          {detail.item.category}
                        </span>
                      </MetaRow>
                      <MetaRow label={t("Priority")}>
                        <TaskPriorityBadge priority={detail.item.priority} />
                      </MetaRow>
                      <MetaRow label={t("Status")}>
                        <TaskStatusBadge displayStatus={detail.item.displayStatus} />
                      </MetaRow>
                      <MetaRow label={t("Assignee")}>
                        <span className="flex items-center justify-end gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="bg-primary/10 text-xs text-primary">
                              {ownerInitials(detail.item.assigneeName)}
                            </AvatarFallback>
                          </Avatar>
                          {detail.item.assigneeName}
                        </span>
                      </MetaRow>
                      <MetaRow label={t("Due Date")}>
                        <span
                          className={cn(
                            detail.item.displayStatus === "overdue" && "text-red-600",
                            detail.item.displayStatus === "due_soon" && "text-amber-600",
                          )}
                        >
                          <ComplianceDate value={detail.item.dueDate} />
                          {detail.item.dueIn ? (
                            <span className="ml-1 block text-xs">{detail.item.dueIn}</span>
                          ) : null}
                        </span>
                      </MetaRow>
                      <MetaRow label={t("Created By")}>
                        <span className="flex items-center justify-end gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="bg-primary/10 text-xs text-primary">
                              {ownerInitials(detail.item.createdByName)}
                            </AvatarFallback>
                          </Avatar>
                          {detail.item.createdByName}
                        </span>
                      </MetaRow>
                      <MetaRow label={t("Created On")}>
                        <ComplianceDate value={detail.item.createdAt} />
                      </MetaRow>
                      {detail.item.relatedLink ? (
                        <MetaRow label={t("Related To")}>
                          <Link
                            href={detail.item.relatedLink.href}
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            {detail.item.relatedLink.label}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </MetaRow>
                      ) : null}
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("Progress")}
                      </p>
                      <ComplianceProgressBar value={detail.item.progressPct} className="mb-4" />
                      <div className="space-y-3">
                        {detail.item.progressSteps.map((step) => (
                          <div key={step.title} className="flex items-center gap-3 text-sm">
                            <StepIcon status={step.status} />
                            <div className="flex-1">
                              <p className="font-medium">{step.title}</p>
                              <p
                                className={cn(
                                  "text-xs",
                                  step.status === "completed" && "text-emerald-600",
                                  step.status === "in_progress" && "text-blue-600",
                                  step.status === "not_started" && "text-muted-foreground",
                                )}
                              >
                                {step.label}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("Notes")}
                      </p>
                      <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                        {detail.item.notes}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="activity" className="mt-0 space-y-4">
                    <div className="max-h-64 space-y-2 overflow-y-auto">
                      {detail.comments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("No activity yet.")}</p>
                      ) : (
                        detail.comments.map((c) => (
                          <div key={c.id} className="rounded-lg border p-3 text-sm">
                            <p>{c.body}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {c.authorName ?? t("Unknown")} · {fmtDateTime(c.createdAt)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                    <div>
                      <Label>{t("Add comment")}</Label>
                      <Textarea className="mt-1" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
                      <Button size="sm" className="mt-2" onClick={() => void addComment()}>
                        {t("Post comment")}
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="subtasks" className="mt-0 space-y-3">
                    {detail.item.subtasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t("No subtasks yet.")}</p>
                    ) : (
                      detail.item.subtasks.map((st) => (
                        <div key={st.id} className="flex items-start gap-3 rounded-lg border p-3">
                          <StepIcon status={st.status} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{st.title}</p>
                            <p className="text-xs text-muted-foreground">{st.assigneeName}</p>
                          </div>
                          <span
                            className={cn(
                              "text-xs capitalize",
                              st.status === "completed" && "text-emerald-600",
                              st.status === "in_progress" && "text-blue-600",
                            )}
                          >
                            {st.status.replace(/_/g, " ")}
                          </span>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="attachments" className="mt-0 space-y-4">
                    {detail.attachments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t("No attachments yet.")}</p>
                    ) : (
                      <ul className="space-y-2">
                        {detail.attachments.map((a) => (
                          <li key={a.id} className="rounded-lg border px-3 py-2 text-sm">
                            <a href={a.fileUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                              {a.fileName}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div>
                      <Label>{t("Add attachment")}</Label>
                      <Input
                        className="mt-1"
                        placeholder={t("File name")}
                        value={attachName}
                        onChange={(e) => setAttachName(e.target.value)}
                      />
                      <Input
                        className="mt-2"
                        placeholder={t("File URL")}
                        value={attachUrl}
                        onChange={(e) => setAttachUrl(e.target.value)}
                      />
                      <Button size="sm" className="mt-2" onClick={() => void addAttachment()}>
                        {t("Upload link")}
                      </Button>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>

              <div className="flex flex-wrap gap-2 border-t px-6 py-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.message(t("Edit task coming soon."))}
                >
                  <Pencil className="mr-1.5 h-4 w-4" />
                  {t("Edit Task")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.message(t("Add subtask coming soon."))}
                >
                  <ListPlus className="mr-1.5 h-4 w-4" />
                  {t("Add Subtask")}
                </Button>
                {detail.item.status !== "done" ? (
                  <CompliancePrimaryButton
                    type="button"
                    className="ml-auto"
                    disabled={saving}
                    onClick={() => void updateStatus(detail.item.id, "done")}
                  >
                    {saving ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-1.5 h-4 w-4" />
                    )}
                    {t("Mark Complete")}
                  </CompliancePrimaryButton>
                ) : null}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
