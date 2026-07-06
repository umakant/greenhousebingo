"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, FileStack, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableActionButton } from "@/components/ui/table-action-button";
import {
  TableColumnVisibilityMenu,
  type TableColumnVisibilityDef,
} from "@/components/ui/table-column-visibility-menu";
import { useTableColumnVisibility } from "@/hooks/use-table-column-visibility";
import { HrmProjectsStyleListPage, type HrmViewMode } from "@/components/hrm/hrm-projects-style-list";
import { useTranslation } from "@/contexts/translation-context";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate } from "@/lib/format-date";
import { EmReportStatusBadge } from "@/components/expense-management/em-expense-status-badges";
import {
  canPerformWorkflowAction,
  normalizeEmReportStatus,
  statusLabel,
  type EmWorkflowAction,
  type EmWorkflowCapabilities,
} from "@/lib/em-expense-workflow";

type ReportRow = {
  id: string;
  reportNumber: string;
  purpose: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  status: string;
  currency: string;
  totalAmount: number;
  rejectionNote: string | null;
};

const STATUSES = [
  "draft",
  "submitted",
  "supervisor_approved",
  "rejected",
  "in_billing",
  "processed",
  "paid",
];

type ColId = "report" | "purpose" | "period" | "amount" | "status";
type SortField = "reportNumber" | "purpose" | "dateFrom" | "totalAmount" | "status";

const DEFAULT_COLS: Record<ColId, boolean> = {
  report: true,
  purpose: true,
  period: true,
  amount: true,
  status: true,
};

const DEFAULT_WORKFLOW_CAPS: EmWorkflowCapabilities = {
  isEmployeeSubmitter: false,
  canSupervise: false,
  canBilling: false,
  isCompanyAdmin: true,
};

export function EmReportsClient({
  createdByUserId,
  workflowCaps = DEFAULT_WORKFLOW_CAPS,
}: {
  createdByUserId?: string;
  workflowCaps?: EmWorkflowCapabilities;
}) {
  const { t: tLang } = useTranslation();
  const t = React.useCallback((s: string) => tLang(s) || s, [tLang]);
  const { settings } = useAppSettings();
  const fmtDate = (d: string | null | undefined) => formatDate(d ?? null, settings);

  const [rows, setRows] = React.useState<ReportRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [edit, setEdit] = React.useState<ReportRow | null>(null);
  const [form, setForm] = React.useState({
    purpose: "",
    date_from: "",
    date_to: "",
    status: "draft",
  });

  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const [searchInput, setSearchInput] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [viewMode, setViewMode] = React.useState<HrmViewMode>("list");
  const [sortField, setSortField] = React.useState<SortField>("reportNumber");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

  const colKey = "pf-em-reports-cols-v1";
  const { columnVisible, setVisibility, resetVisibility } = useTableColumnVisibility<ColId>(colKey, DEFAULT_COLS);
  const columnDefs = React.useMemo<TableColumnVisibilityDef<ColId>[]>(
    () => [
      { id: "report", label: t("Report") },
      { id: "purpose", label: t("Purpose") },
      { id: "period", label: t("Period") },
      { id: "amount", label: t("Amount") },
      { id: "status", label: t("Status") },
    ],
    [t],
  );

  const load = React.useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams({ per_page: "500", page: "1" });
    if (createdByUserId?.trim()) qs.set("created_by_user_id", createdByUserId.trim());
    fetch(`/api/expense-management/reports?${qs}`, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setRows(j.data as ReportRow[]);
      })
      .finally(() => setLoading(false));
  }, [createdByUserId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (
        statusFilter !== "all" &&
        normalizeEmReportStatus(r.status) !== normalizeEmReportStatus(statusFilter)
      ) {
        return false;
      }
      if (!q) return true;
      return [r.reportNumber, r.purpose ?? "", r.id, r.status].some((f) => String(f).toLowerCase().includes(q));
    });
  }, [rows, search, statusFilter]);

  const sorted = React.useMemo(() => {
    const out = [...filtered];
    out.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "reportNumber":
          cmp = a.reportNumber.localeCompare(b.reportNumber);
          break;
        case "purpose":
          cmp = (a.purpose ?? "").localeCompare(b.purpose ?? "");
          break;
        case "dateFrom":
          cmp = (a.dateFrom ?? "").localeCompare(b.dateFrom ?? "");
          break;
        case "totalAmount":
          cmp = a.totalAmount - b.totalAmount;
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        default:
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return out;
  }, [filtered, sortField, sortDir]);

  const total = sorted.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage) || 1);
  const pageSafe = Math.min(page, lastPage);
  const from = total === 0 ? 0 : (pageSafe - 1) * perPage + 1;
  const to = Math.min(total, pageSafe * perPage);
  const pageItems = sorted.slice((pageSafe - 1) * perPage, pageSafe * perPage);

  React.useEffect(() => {
    if (page > lastPage) setPage(lastPage);
  }, [page, lastPage]);

  function handleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function sortChevron(field: SortField) {
    if (sortField !== field) return null;
    return sortDir === "asc" ? (
      <ChevronUp className="ml-1 inline h-3.5 w-3.5" aria-hidden />
    ) : (
      <ChevronDown className="ml-1 inline h-3.5 w-3.5" aria-hidden />
    );
  }

  function openCreate() {
    setEdit(null);
    setForm({ purpose: "", date_from: "", date_to: "", status: "draft" });
    setOpen(true);
  }

  function openEdit(row: ReportRow) {
    setEdit(row);
    setForm({
      purpose: row.purpose ?? "",
      date_from: row.dateFrom ?? "",
      date_to: row.dateTo ?? "",
      status: row.status,
    });
    setOpen(true);
  }

  async function runWorkflow(action: EmWorkflowAction, row: ReportRow, rejectionNote?: string) {
    const res = await fetch(`/api/expense-management/reports/${row.id}/workflow`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, rejection_note: rejectionNote ?? null }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.ok) {
      window.alert((j as { message?: string }).message ?? t("Action failed"));
      return;
    }
    setOpen(false);
    load();
  }

  function workflowActionsFor(row: ReportRow, isOwn = true): { label: string; action: EmWorkflowAction; variant?: "destructive" }[] {
    const status = normalizeEmReportStatus(row.status);
    const out: { label: string; action: EmWorkflowAction; variant?: "destructive" }[] = [];
    const add = (action: EmWorkflowAction, label: string, variant?: "destructive") => {
      if (canPerformWorkflowAction(action, status, workflowCaps, isOwn)) {
        out.push({ action, label, variant });
      }
    };
    add("submit", t("Submit for approval"));
    add("withdraw", t("Withdraw submission"));
    add("supervisor_approve", t("Approve (supervisor)"));
    add("supervisor_reject", t("Reject"), "destructive");
    add("send_to_billing", t("Send to billing"));
    add("billing_complete", t("Mark processed"));
    return out;
  }

  const showStatusPicker =
    workflowCaps.isCompanyAdmin &&
    !workflowCaps.isEmployeeSubmitter &&
    !workflowCaps.canSupervise &&
    !workflowCaps.canBilling;

  async function save() {
    const payload: Record<string, string | null> = {
      purpose: form.purpose || null,
      date_from: form.date_from || null,
      date_to: form.date_to || null,
    };
    if (showStatusPicker) payload.status = form.status;
    if (edit) {
      await fetch(`/api/expense-management/reports/${edit.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/expense-management/reports", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setOpen(false);
    load();
  }

  const activeFilterCount = statusFilter !== "all" ? 1 : 0;

  const rowActions = (row: ReportRow) => {
    const wf = workflowActionsFor(row);
    return (
      <TableActionButton
        label={t("Edit")}
        onPrimaryClick={() => openEdit(row)}
        items={[
          { label: t("Edit"), onSelect: () => openEdit(row) },
          ...wf.map((w) => ({
            label: w.label,
            onSelect: () => {
              if (w.action === "supervisor_reject") {
                const note = window.prompt(t("Rejection reason (optional)")) ?? "";
                void runWorkflow(w.action, row, note || undefined);
              } else {
                void runWorkflow(w.action, row);
              }
            },
          })),
        ]}
      />
    );
  };

  const visibleDataCols =
    (columnVisible("report") ? 1 : 0) +
    (columnVisible("purpose") ? 1 : 0) +
    (columnVisible("period") ? 1 : 0) +
    (columnVisible("amount") ? 1 : 0) +
    (columnVisible("status") ? 1 : 0);
  const colSpan = visibleDataCols + 1;

  function periodLabel(r: ReportRow) {
    const a = r.dateFrom ? fmtDate(r.dateFrom) : "—";
    const b = r.dateTo ? fmtDate(r.dateTo) : "—";
    return `${a} → ${b}`;
  }

  return (
    <div className="w-full min-w-0 space-y-4">
      <HrmProjectsStyleListPage
        searchPlaceholder={t("Search reports...")}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearchSubmit={() => {
          setSearch(searchInput.trim());
          setPage(1);
        }}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        perPage={perPage}
        onPerPageChange={(n) => {
          setPerPage(n);
          setPage(1);
        }}
        activeFilterCount={activeFilterCount}
        filtersMenuContent={
          <>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{t("Status")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <DropdownMenuRadioItem value="all">{t("All statuses")}</DropdownMenuRadioItem>
              {STATUSES.map((s) => (
                <DropdownMenuRadioItem key={s} value={s}>
                  {statusLabel(s)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </>
        }
        columnsMenu={
          <TableColumnVisibilityMenu
            columns={columnDefs}
            columnVisible={columnVisible}
            setVisibility={setVisibility}
            onReset={resetVisibility}
          />
        }
        onRefresh={() => void load()}
        refreshing={loading}
        primaryAction={
          <Button size="sm" className="gap-1" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t("New expense report")}
          </Button>
        }
        page={pageSafe}
        lastPage={lastPage}
        total={total}
        from={from}
        to={to}
        onPageChange={(p) => setPage(p)}
      >
        {viewMode === "list" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {columnVisible("report") ? (
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      <button
                        type="button"
                        className="inline-flex items-center"
                        onClick={() => handleSort("reportNumber")}
                      >
                        {t("Report")}
                        {sortChevron("reportNumber")}
                      </button>
                    </th>
                  ) : null}
                  {columnVisible("purpose") ? (
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      <button type="button" className="inline-flex items-center" onClick={() => handleSort("purpose")}>
                        {t("Purpose")}
                        {sortChevron("purpose")}
                      </button>
                    </th>
                  ) : null}
                  {columnVisible("period") ? (
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      <button type="button" className="inline-flex items-center" onClick={() => handleSort("dateFrom")}>
                        {t("Period")}
                        {sortChevron("dateFrom")}
                      </button>
                    </th>
                  ) : null}
                  {columnVisible("amount") ? (
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      <button
                        type="button"
                        className="inline-flex w-full items-center justify-end"
                        onClick={() => handleSort("totalAmount")}
                      >
                        {t("Amount")}
                        {sortChevron("totalAmount")}
                      </button>
                    </th>
                  ) : null}
                  {columnVisible("status") ? (
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      <button type="button" className="inline-flex items-center" onClick={() => handleSort("status")}>
                        {t("Status")}
                        {sortChevron("status")}
                      </button>
                    </th>
                  ) : null}
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={colSpan} className="px-4 py-10 text-center text-muted-foreground">
                      {t("Loading...")}
                    </td>
                  </tr>
                ) : pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={colSpan} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <FileStack className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                        <div>{t("No reports yet.")}</div>
                        <Button size="sm" onClick={openCreate}>
                          <Plus className="mr-1 h-4 w-4" />
                          {t("New expense report")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageItems.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-muted/30">
                      {columnVisible("report") ? (
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            className="font-mono text-sm font-medium text-primary hover:underline"
                            onClick={() => openEdit(r)}
                          >
                            {r.reportNumber}
                          </button>
                          <div className="text-xs text-muted-foreground">#{r.id}</div>
                        </td>
                      ) : null}
                      {columnVisible("purpose") ? (
                        <td className="max-w-[220px] truncate px-4 py-3 text-muted-foreground">{r.purpose ?? "—"}</td>
                      ) : null}
                      {columnVisible("period") ? <td className="px-4 py-3 text-muted-foreground">{periodLabel(r)}</td> : null}
                      {columnVisible("amount") ? (
                        <td className="px-4 py-3 text-right tabular-nums font-medium">
                          {r.totalAmount.toLocaleString(undefined, { style: "currency", currency: r.currency || "USD" })}
                        </td>
                      ) : null}
                      {columnVisible("status") ? (
                        <td className="px-4 py-3">
                          <EmReportStatusBadge status={r.status} />
                        </td>
                      ) : null}
                      <td className="px-4 py-3 text-right">{rowActions(r)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="py-12 text-center text-muted-foreground">{t("Loading...")}</div>
            ) : pageItems.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <FileStack className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                <div>{t("No reports yet.")}</div>
                <Button size="sm" onClick={openCreate}>
                  <Plus className="mr-1 h-4 w-4" />
                  {t("New expense report")}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pageItems.map((r) => (
                  <Card key={r.id} className="border-border/60 shadow-sm">
                    <CardContent className="space-y-2 p-4">
                      {columnVisible("report") ? (
                        <div>
                          <button
                            type="button"
                            className="font-mono text-sm font-semibold text-primary hover:underline"
                            onClick={() => openEdit(r)}
                          >
                            {r.reportNumber}
                          </button>
                          <p className="text-xs text-muted-foreground">#{r.id}</p>
                        </div>
                      ) : null}
                      {columnVisible("purpose") ? (
                        <p className="line-clamp-2 text-sm text-muted-foreground">{r.purpose ?? "—"}</p>
                      ) : null}
                      {columnVisible("period") ? (
                        <p className="text-xs text-muted-foreground">{periodLabel(r)}</p>
                      ) : null}
                      {columnVisible("amount") ? (
                        <p className="text-sm font-medium tabular-nums">
                          {r.totalAmount.toLocaleString(undefined, { style: "currency", currency: r.currency || "USD" })}
                        </p>
                      ) : null}
                      {columnVisible("status") ? (
                        <div>
                          <EmReportStatusBadge status={r.status} />
                        </div>
                      ) : null}
                      <div className="flex justify-end border-t pt-3">{rowActions(r)}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </HrmProjectsStyleListPage>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{edit ? t("Edit report") : t("New expense report")}</SheetTitle>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="em-purpose">{t("Purpose")}</Label>
              <Input
                id="em-purpose"
                value={form.purpose}
                onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
                placeholder={t("Trip / project name")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="em-df">{t("From")}</Label>
                <Input
                  id="em-df"
                  type="date"
                  value={form.date_from}
                  onChange={(e) => setForm((f) => ({ ...f, date_from: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="em-dt">{t("To")}</Label>
                <Input
                  id="em-dt"
                  type="date"
                  value={form.date_to}
                  onChange={(e) => setForm((f) => ({ ...f, date_to: e.target.value }))}
                />
              </div>
            </div>
            {showStatusPicker ? (
              <div className="grid gap-2">
                <Label>{t("Status")}</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {statusLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : edit ? (
              <p className="text-sm text-muted-foreground">
                {t("Status")}: {statusLabel(edit.status)}
              </p>
            ) : null}
          </div>
          <SheetFooter className="flex flex-col gap-2 sm:justify-start">
            {edit
              ? workflowActionsFor(edit).map((w) => (
                  <Button
                    key={w.action}
                    type="button"
                    variant={w.variant === "destructive" ? "destructive" : w.action === "submit" ? "default" : "secondary"}
                    onClick={() => {
                      if (w.action === "supervisor_reject") {
                        const note = window.prompt(t("Rejection reason (optional)")) ?? "";
                        void runWorkflow(w.action, edit, note || undefined);
                      } else {
                        void runWorkflow(w.action, edit);
                      }
                    }}
                  >
                    {w.label}
                  </Button>
                ))
              : null}
            <div className="flex gap-2">
            <Button type="button" onClick={() => void save()}>
              {t("Save")}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("Cancel")}
            </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
