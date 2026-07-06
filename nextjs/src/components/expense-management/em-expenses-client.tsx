"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, History, Pencil, Plus, Receipt, Trash2 } from "lucide-react";

import { appConfirm } from "@/lib/app-confirm";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
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
import { EM_DEFAULT_EXPENSE_CATEGORY_NAMES } from "@/lib/em-expense-category-defaults";
import { canManageAllOrganizationExpenses } from "@/lib/em-portal-ui";
import {
  EM_REPORT_STATUS_LIST,
  getEmWorkflowCapabilities,
  normalizeEmReportStatus,
  statusLabel,
} from "@/lib/em-expense-workflow";
import { cn } from "@/lib/utils";
import { EmExpenseLineSheet, type EmExpenseLineRow } from "@/components/expense-management/em-expense-line-sheet";
import { EmLineStatusBadge } from "@/components/expense-management/em-expense-status-badges";
import { EmMatterWorkspaceShell } from "@/components/expense-management/em-matter-workspace-shell";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type ColId = "name" | "vendor" | "category" | "expense" | "notes" | "attachments" | "amount" | "billable" | "receipt" | "status";
type SortField = "expenseDate" | "category" | "merchant" | "amount" | "status";

const DEFAULT_COLS: Record<ColId, boolean> = {
  name: true,
  vendor: true,
  category: true,
  expense: true,
  notes: true,
  attachments: true,
  amount: true,
  billable: true,
  receipt: false,
  status: true,
};

type EmExpensesClientProps = {
  permissions?: string[];
  roles?: string[];
  userType?: string | null;
};

export function EmExpensesClient({
  permissions = [],
  roles = [],
  userType = null,
}: EmExpensesClientProps) {
  const canManageOrg = canManageAllOrganizationExpenses(permissions, roles, userType);
  const workflowCaps = React.useMemo(
    () => getEmWorkflowCapabilities({ permissions, roles, userType }),
    [permissions, roles, userType],
  );
  const showStatusField =
    workflowCaps.isCompanyAdmin &&
    !workflowCaps.isEmployeeSubmitter &&
    !workflowCaps.canSupervise &&
    !workflowCaps.canBilling;
  const { t: tLang } = useTranslation();
  const t = React.useCallback((s: string) => tLang(s) || s, [tLang]);
  const { settings } = useAppSettings();
  const fmtDate = (d: string) => formatDate(d, settings);

  const [rows, setRows] = React.useState<EmExpenseLineRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [categoryList, setCategoryList] = React.useState<string[]>([...EM_DEFAULT_EXPENSE_CATEGORY_NAMES]);
  const [open, setOpen] = React.useState(false);
  const [edit, setEdit] = React.useState<EmExpenseLineRow | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set());

  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const [searchInput, setSearchInput] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [viewMode, setViewMode] = React.useState<HrmViewMode>("list");
  const [sortField, setSortField] = React.useState<SortField>("expenseDate");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  const [listError, setListError] = React.useState<string | null>(null);
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");

  const colKey = "pf-em-expense-lines-cols-v3";
  const { columnVisible, setVisibility, resetVisibility } = useTableColumnVisibility<ColId>(colKey, DEFAULT_COLS);
  const columnDefs = React.useMemo<TableColumnVisibilityDef<ColId>[]>(
    () => [
      { id: "name", label: t("Name") },
      { id: "vendor", label: t("Vendor Name") },
      { id: "category", label: t("Category") },
      { id: "expense", label: t("Date") },
      { id: "notes", label: t("Notes") },
      { id: "attachments", label: t("Attachments") },
      { id: "amount", label: t("Amount") },
      { id: "billable", label: t("Billable") },
      { id: "receipt", label: t("Receipt") },
      { id: "status", label: t("Approval status") },
    ],
    [t],
  );

  const loadCategories = React.useCallback(() => {
    fetch("/api/expense-management/categories?per_page=100", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((j: { data?: { name: string }[] }) => {
        const names = (j?.data ?? []).map((x) => x.name).filter(Boolean);
        if (names.length) setCategoryList(names);
      })
      .catch(() => {});
  }, []);

  const load = React.useCallback(() => {
    setLoading(true);
    fetch("/api/expense-management/lines", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setRows(j.data as EmExpenseLineRow[]);
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  React.useEffect(() => {
    load();
  }, [load]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && normalizeEmReportStatus(r.status) !== normalizeEmReportStatus(statusFilter)) {
        return false;
      }
      if (dateFrom && r.expenseDate < dateFrom) return false;
      if (dateTo && r.expenseDate > dateTo) return false;
      if (!q) return true;
      const noteBlob = [r.internalNote, r.additionalInfo].filter(Boolean).join(" ");
      return [r.expenseDate, r.category, r.merchant ?? "", r.id, r.status, r.submitterName ?? "", noteBlob].some(
        (f) => String(f).toLowerCase().includes(q),
      );
    });
  }, [rows, search, statusFilter, dateFrom, dateTo]);

  const sorted = React.useMemo(() => {
    const out = [...filtered];
    out.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "expenseDate":
          cmp = a.expenseDate.localeCompare(b.expenseDate);
          break;
        case "category":
          cmp = a.category.localeCompare(b.category);
          break;
        case "merchant":
          cmp = (a.merchant ?? "").localeCompare(b.merchant ?? "");
          break;
        case "amount":
          cmp = Number(a.amountUsd ?? a.amount) - Number(b.amountUsd ?? b.amount);
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
    setOpen(true);
  }

  function openEdit(row: EmExpenseLineRow) {
    setEdit(row);
    setOpen(true);
  }

  async function removeLine(row: EmExpenseLineRow) {
    if (!(await appConfirm(t("Delete this expense line?")))) return;
    setListError(null);
    try {
      const res = await fetch(`/api/expense-management/lines/${row.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const j = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setListError(typeof j.message === "string" ? j.message : t("Delete failed"));
        return;
      }
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
      if (edit?.id === row.id) {
        setEdit(null);
        setOpen(false);
      }
      void load();
    } catch {
      setListError(t("Delete failed"));
    }
  }

  async function bulkRemove() {
    if (selectedIds.size === 0) return;
    if (!(await appConfirm(t("Delete selected expense lines?")))) return;
    setListError(null);
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        const res = await fetch(`/api/expense-management/lines/${id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const j = (await res.json().catch(() => ({}))) as { message?: string };
        if (!res.ok) {
          setListError(typeof j.message === "string" ? j.message : t("Delete failed"));
          return;
        }
      }
      setSelectedIds(new Set());
      if (edit && ids.includes(edit.id)) {
        setEdit(null);
        setOpen(false);
      }
      void load();
    } catch {
      setListError(t("Delete failed"));
    }
  }

  const activeFilterCount = (statusFilter !== "all" ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  function billableOn(v: string | null | undefined) {
    if (!v) return true;
    const s = v.trim().toLowerCase();
    return s === "yes" || s === "y" || s === "billable" || s === "true" || s === "1";
  }

  async function patchBillable(row: EmExpenseLineRow, on: boolean) {
    setListError(null);
    const billable = on ? "Yes" : "No";
    try {
      const res = await fetch(`/api/expense-management/lines/${row.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billable }),
      });
      const j = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setListError(typeof j.message === "string" ? j.message : t("Update failed"));
        return;
      }
      void load();
    } catch {
      setListError(t("Update failed"));
    }
  }

  async function bulkSetStatus(status: string) {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    const isApprove = status === "approved";
    const isReject = status === "rejected";
    const confirmed = await appConfirm(
      isApprove
        ? {
            title: t("Approve expenses"),
            description: t(
              "Approve {count} selected expense line(s)? Approved lines are locked for billing until rejected.",
            ).replace("{count}", String(count)),
            confirmLabel: t("Approve"),
          }
        : {
            title: t("Reject expenses"),
            description: t("Reject {count} selected expense line(s)?").replace(
              "{count}",
              String(count),
            ),
            confirmLabel: t("Reject"),
            variant: isReject ? "destructive" : "default",
          },
    );
    if (!confirmed) return;
    setListError(null);
    try {
      for (const id of selectedIds) {
        const res = await fetch(`/api/expense-management/lines/${id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        const j = (await res.json().catch(() => ({}))) as { message?: string };
        if (!res.ok) {
          setListError(typeof j.message === "string" ? j.message : t("Update failed"));
          return;
        }
      }
      setSelectedIds(new Set());
      void load();
    } catch {
      setListError(t("Update failed"));
    }
  }

  const totalAmountFiltered = React.useMemo(
    () => sorted.reduce((s, r) => s + Number(r.amountUsd ?? r.amount ?? 0), 0),
    [sorted],
  );

  function notesPreview(r: EmExpenseLineRow) {
    const raw = [r.internalNote, r.additionalInfo].filter(Boolean).join(" ").trim();
    if (!raw) return "—";
    return raw.length > 100 ? `${raw.slice(0, 100)}…` : raw;
  }

  const rowActions = (row: EmExpenseLineRow) => (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-primary"
        aria-label={t("Open")}
        onClick={() => openEdit(row)}
      >
        <History className="h-4 w-4" />
      </Button>
      <TableActionButton
        label={t("More")}
        onPrimaryClick={() => openEdit(row)}
        items={[
          { label: t("Edit"), onSelect: () => openEdit(row), icon: <Pencil className="h-4 w-4" /> },
          {
            label: t("Delete"),
            onSelect: () => void removeLine(row),
            destructive: true,
            icon: <Trash2 className="h-4 w-4" />,
          },
        ]}
      />
    </div>
  );

  const visibleDataCols =
    (columnVisible("name") ? 1 : 0) +
    (columnVisible("vendor") ? 1 : 0) +
    (columnVisible("category") ? 1 : 0) +
    (columnVisible("expense") ? 1 : 0) +
    (columnVisible("notes") ? 1 : 0) +
    (columnVisible("attachments") ? 1 : 0) +
    (columnVisible("amount") ? 1 : 0) +
    (columnVisible("billable") ? 1 : 0) +
    (columnVisible("receipt") ? 1 : 0) +
    (columnVisible("status") ? 1 : 0);
  const colSpan = visibleDataCols + 2;

  const allPageSelected =
    pageItems.length > 0 && pageItems.every((r) => selectedIds.has(r.id));
  const somePageSelected = pageItems.some((r) => selectedIds.has(r.id));

  return (
    <>
      <EmMatterWorkspaceShell
        active="expenses"
        panelTitle={t("Expenses")}
        permissions={permissions}
        roles={roles}
        userType={userType}
      >
        <div className="w-full min-w-0 space-y-4">
          {listError ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {listError}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 rounded-md border bg-muted/20 p-3 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("From date")}</Label>
                <DatePickerInput value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-[11rem]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("To date")}</Label>
                <DatePickerInput value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-[11rem]" />
              </div>
              {canManageOrg ? (
                <>
                  <Button type="button" variant="secondary" size="sm" disabled={selectedIds.size === 0} onClick={() => void bulkSetStatus("approved")}>
                    {t("Approve")}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={selectedIds.size === 0}
                    onClick={() => void bulkSetStatus("rejected")}
                  >
                    {t("Reject")}
                  </Button>
                </>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={selectedIds.size === 0}
                onClick={() => void bulkRemove()}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                {t("Remove")}
              </Button>
            </div>
          </div>

      <HrmProjectsStyleListPage
        searchPlaceholder={t("Search expense lines...")}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearchSubmit={() => {
          const q = searchInput.trim();
          setSearch(q);
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
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              {t("Approval status")}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <DropdownMenuRadioItem value="all">{t("All statuses")}</DropdownMenuRadioItem>
              {EM_REPORT_STATUS_LIST.map((s) => (
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
          <Button size="sm" className="gap-1 bg-sky-700 hover:bg-sky-800" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t("Add expense")}
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
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b bg-sky-50/80">
                  <th className="w-12 px-2 py-3 text-left align-middle">
                    <Checkbox
                      checked={
                        allPageSelected ? true : somePageSelected ? "indeterminate" : false
                      }
                      onCheckedChange={(v) => {
                        const on = v === true;
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (on) {
                            pageItems.forEach((r) => next.add(r.id));
                          } else {
                            pageItems.forEach((r) => next.delete(r.id));
                          }
                          return next;
                        });
                      }}
                      aria-label={t("Select all on this page")}
                    />
                  </th>
                  {columnVisible("name") ? (
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Name")}</th>
                  ) : null}
                  {columnVisible("vendor") ? (
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      <button type="button" className="inline-flex items-center" onClick={() => handleSort("merchant")}>
                        {t("Vendor Name")}
                        {sortChevron("merchant")}
                      </button>
                    </th>
                  ) : null}
                  {columnVisible("category") ? (
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      <button type="button" className="inline-flex items-center" onClick={() => handleSort("category")}>
                        {t("Category")}
                        {sortChevron("category")}
                      </button>
                    </th>
                  ) : null}
                  {columnVisible("expense") ? (
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      <button type="button" className="inline-flex items-center" onClick={() => handleSort("expenseDate")}>
                        {t("Date")}
                        {sortChevron("expenseDate")}
                      </button>
                    </th>
                  ) : null}
                  {columnVisible("notes") ? (
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Notes")}</th>
                  ) : null}
                  {columnVisible("attachments") ? (
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Attachments")}</th>
                  ) : null}
                  {columnVisible("amount") ? (
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      <button
                        type="button"
                        className="inline-flex w-full items-center justify-end"
                        onClick={() => handleSort("amount")}
                      >
                        {t("Amount")}
                        {sortChevron("amount")}
                      </button>
                    </th>
                  ) : null}
                  {columnVisible("billable") ? (
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Billable")}</th>
                  ) : null}
                  {columnVisible("receipt") ? (
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Receipt")}</th>
                  ) : null}
                  {columnVisible("status") ? (
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      <button type="button" className="inline-flex items-center" onClick={() => handleSort("status")}>
                        {t("Approval status")}
                        {sortChevron("status")}
                      </button>
                    </th>
                  ) : null}
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t("Action")}</th>
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
                        <Receipt className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                        <div>{t("No expense lines yet.")}</div>
                        <Button size="sm" onClick={openCreate}>
                          <Plus className="mr-1 h-4 w-4" />
                          {t("Add expense")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageItems.map((r) => (
                    <tr
                      key={r.id}
                      className={cn(
                        "cursor-pointer border-b hover:bg-muted/30",
                        open && edit?.id === r.id && "bg-primary/[0.06] dark:bg-primary/10",
                      )}
                      onClick={() => openEdit(r)}
                    >
                      <td className="w-12 px-2 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(r.id)}
                          onCheckedChange={(v) => {
                            const on = v === true;
                            setSelectedIds((prev) => {
                              const next = new Set(prev);
                              if (on) next.add(r.id);
                              else next.delete(r.id);
                              return next;
                            });
                          }}
                          aria-label={t("Select row")}
                        />
                      </td>
                      {columnVisible("name") ? (
                        <td className="px-4 py-3">{r.submitterName?.trim() || "—"}</td>
                      ) : null}
                      {columnVisible("vendor") ? (
                        <td className="px-4 py-3 text-muted-foreground">{r.merchant ?? "—"}</td>
                      ) : null}
                      {columnVisible("category") ? <td className="px-4 py-3">{r.category}</td> : null}
                      {columnVisible("expense") ? (
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-medium text-primary">{fmtDate(r.expenseDate)}</span>
                        </td>
                      ) : null}
                      {columnVisible("notes") ? (
                        <td className="max-w-[240px] px-4 py-3 text-muted-foreground" title={notesPreview(r) !== "—" ? notesPreview(r) : undefined}>
                          {notesPreview(r)}
                        </td>
                      ) : null}
                      {columnVisible("attachments") ? (
                        <td className="px-4 py-3">
                          {r.receiptAttached ? (
                            <Link
                              href="/expense-management/receipts"
                              className="text-primary underline-offset-2 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {t("View Documents")}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                      ) : null}
                      {columnVisible("amount") ? (
                        <td className="px-4 py-3 text-right tabular-nums font-medium">
                          {(r.amountUsd ?? r.amount).toLocaleString(undefined, {
                            style: "currency",
                            currency: r.currency || "USD",
                          })}
                        </td>
                      ) : null}
                      {columnVisible("billable") ? (
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <Switch checked={billableOn(r.billable)} onCheckedChange={(on) => void patchBillable(r, on)} />
                        </td>
                      ) : null}
                      {columnVisible("receipt") ? (
                        <td className="px-4 py-3">{r.receiptAttached ? t("Yes") : t("No")}</td>
                      ) : null}
                      {columnVisible("status") ? (
                        <td className="px-4 py-3">
                          <EmLineStatusBadge status={r.status} />
                        </td>
                      ) : null}
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {rowActions(r)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {!loading && pageItems.length > 0 ? (
                <tfoot>
                  <tr className="border-t bg-muted/30">
                    <td colSpan={colSpan} className="px-4 py-3 text-right">
                      <span className="text-sm text-muted-foreground">{t("Total Expenses")}</span>
                      <span className="ml-3 text-sm font-bold tabular-nums">
                        {totalAmountFiltered.toLocaleString(undefined, { style: "currency", currency: "USD" })}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        ) : (
          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="py-12 text-center text-muted-foreground">{t("Loading...")}</div>
            ) : pageItems.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <Receipt className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                <div>{t("No expense lines yet.")}</div>
                <Button size="sm" onClick={openCreate}>
                  <Plus className="mr-1 h-4 w-4" />
                  {t("Add expense")}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pageItems.map((r) => (
                  <Card
                    key={r.id}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openEdit(r);
                      }
                    }}
                    className={cn(
                      "cursor-pointer border-border/60 shadow-sm transition-colors hover:bg-muted/20",
                      open && edit?.id === r.id && "ring-2 ring-primary/25",
                    )}
                    onClick={() => openEdit(r)}
                  >
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-start justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(r.id)}
                          onCheckedChange={(v) => {
                            const on = v === true;
                            setSelectedIds((prev) => {
                              const next = new Set(prev);
                              if (on) next.add(r.id);
                              else next.delete(r.id);
                              return next;
                            });
                          }}
                          aria-label={t("Select row")}
                        />
                      </div>
                      {columnVisible("name") ? (
                        <p className="text-sm font-medium">
                          {t("Name")}: {r.submitterName?.trim() || "—"}
                        </p>
                      ) : null}
                      {columnVisible("expense") ? (
                        <div>
                          <p className="font-semibold text-primary">{fmtDate(r.expenseDate)}</p>
                          <p className="text-xs text-muted-foreground">#{r.id}</p>
                        </div>
                      ) : null}
                      {columnVisible("category") ? (
                        <p className="text-sm">
                          {t("Category")}: {r.category}
                        </p>
                      ) : null}
                      {columnVisible("vendor") ? (
                        <p className="text-xs text-muted-foreground">
                          {t("Vendor Name")}: {r.merchant ?? "—"}
                        </p>
                      ) : null}
                      {columnVisible("notes") ? (
                        <p className="text-xs text-muted-foreground line-clamp-2">{notesPreview(r)}</p>
                      ) : null}
                      {columnVisible("amount") ? (
                        <p className="text-sm font-medium tabular-nums">
                          {(r.amountUsd ?? r.amount).toLocaleString(undefined, {
                            style: "currency",
                            currency: r.currency || "USD",
                          })}
                        </p>
                      ) : null}
                      {columnVisible("billable") ? (
                        <div className="flex items-center gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
                          <span>{t("Billable")}</span>
                          <Switch checked={billableOn(r.billable)} onCheckedChange={(on) => void patchBillable(r, on)} />
                        </div>
                      ) : null}
                      {columnVisible("receipt") ? (
                        <p className="text-xs">
                          {t("Receipt")}: {r.receiptAttached ? t("Yes") : t("No")}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground">{t("Approval status")}:</span>
                        <EmLineStatusBadge status={r.status} />
                      </div>
                      <div className="flex justify-end border-t pt-3" onClick={(e) => e.stopPropagation()}>
                        {rowActions(r)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </HrmProjectsStyleListPage>
        </div>
      </EmMatterWorkspaceShell>

      <EmExpenseLineSheet
        open={open}
        onOpenChange={setOpen}
        edit={edit}
        categoryList={categoryList}
        showStatusField={showStatusField}
        onAfterSave={() => void load()}
        onRequestDelete={edit ? () => void removeLine(edit) : undefined}
      />
    </>
  );
}
