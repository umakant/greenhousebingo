"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, FileText, Plus, Receipt } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { EmExpenseLineSheet, type EmExpenseLineRow } from "@/components/expense-management/em-expense-line-sheet";
import { EmLineStatusBadge } from "@/components/expense-management/em-expense-status-badges";
import { EmMatterWorkspaceShell } from "@/components/expense-management/em-matter-workspace-shell";

type ColId = "expense" | "category" | "merchant" | "amount" | "status";
type SortField = "expenseDate" | "category" | "merchant" | "amount" | "status";

const DEFAULT_COLS: Record<ColId, boolean> = {
  expense: true,
  category: true,
  merchant: true,
  amount: true,
  status: true,
};

const LINE_STATUSES = ["draft", "submitted", "approved", "rejected", "paid", "processed"] as const;

export function EmReceiptsClient({
  permissions = [],
  roles = [],
  userType = null,
}: {
  permissions?: string[];
  roles?: string[];
  userType?: string | null;
} = {}) {
  const { t: tLang } = useTranslation();
  const t = React.useCallback((s: string) => tLang(s) || s, [tLang]);
  const { settings } = useAppSettings();
  const fmtDate = (d: string) => formatDate(d, settings);

  const [rows, setRows] = React.useState<EmExpenseLineRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [categoryList, setCategoryList] = React.useState<string[]>([...EM_DEFAULT_EXPENSE_CATEGORY_NAMES]);
  const [open, setOpen] = React.useState(false);
  const [edit, setEdit] = React.useState<EmExpenseLineRow | null>(null);

  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const [searchInput, setSearchInput] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [viewMode, setViewMode] = React.useState<HrmViewMode>("list");
  const [sortField, setSortField] = React.useState<SortField>("expenseDate");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

  const colKey = "pf-em-receipts-cols-v1";
  const { columnVisible, setVisibility, resetVisibility } = useTableColumnVisibility<ColId>(colKey, DEFAULT_COLS);
  const columnDefs = React.useMemo<TableColumnVisibilityDef<ColId>[]>(
    () => [
      { id: "expense", label: t("Expense") },
      { id: "category", label: t("Category") },
      { id: "merchant", label: t("Merchant") },
      { id: "amount", label: t("Amount") },
      { id: "status", label: t("Status") },
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
        if (j.ok) {
          const all = j.data as EmExpenseLineRow[];
          setRows(all.filter((x) => x.receiptAttached));
        }
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
      if (statusFilter !== "all" && r.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (!q) return true;
      return [r.expenseDate, r.category, r.merchant ?? "", r.id, r.status].some((f) =>
        String(f).toLowerCase().includes(q),
      );
    });
  }, [rows, search, statusFilter]);

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

  function openEdit(row: EmExpenseLineRow) {
    setEdit(row);
    setOpen(true);
  }

  const activeFilterCount = statusFilter !== "all" ? 1 : 0;

  const rowActions = (row: EmExpenseLineRow) => (
    <TableActionButton
      label={t("Edit")}
      onPrimaryClick={() => openEdit(row)}
      items={[{ label: t("Edit"), onSelect: () => openEdit(row) }]}
    />
  );

  const visibleDataCols =
    (columnVisible("expense") ? 1 : 0) +
    (columnVisible("category") ? 1 : 0) +
    (columnVisible("merchant") ? 1 : 0) +
    (columnVisible("amount") ? 1 : 0) +
    (columnVisible("status") ? 1 : 0);
  const colSpan = visibleDataCols + 1;

  return (
    <>
      <EmMatterWorkspaceShell
        active="receipts"
        panelTitle={t("Receipts")}
        permissions={permissions}
        roles={roles}
        userType={userType}
      >
        <div className="w-full min-w-0 space-y-4">
      <HrmProjectsStyleListPage
        searchPlaceholder={t("Search receipts...")}
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
              {LINE_STATUSES.map((s) => (
                <DropdownMenuRadioItem key={s} value={s} className="capitalize">
                  {s.replace(/_/g, " ")}
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
          <Button size="sm" className="gap-1" asChild>
            <Link href="/expense-management/expenses">
              <Plus className="h-4 w-4" />
              {t("Record expense")}
            </Link>
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
                  {columnVisible("expense") ? (
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      <button type="button" className="inline-flex items-center" onClick={() => handleSort("expenseDate")}>
                        {t("Expense")}
                        {sortChevron("expenseDate")}
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
                  {columnVisible("merchant") ? (
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      <button type="button" className="inline-flex items-center" onClick={() => handleSort("merchant")}>
                        {t("Merchant")}
                        {sortChevron("merchant")}
                      </button>
                    </th>
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
                        <Receipt className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                        <div>{t("No receipt-backed expense lines yet.")}</div>
                        <p className="max-w-md text-xs">{t("Mark “Receipt attached” on an expense line to show it here.")}</p>
                        <Button size="sm" asChild>
                          <Link href="/expense-management/expenses">
                            <FileText className="mr-1 h-4 w-4" />
                            {t("Go to expenses")}
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageItems.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-muted/30">
                      {columnVisible("expense") ? (
                        <td className="px-4 py-3">
                          <button type="button" className="text-left font-medium text-primary hover:underline" onClick={() => openEdit(r)}>
                            {fmtDate(r.expenseDate)}
                          </button>
                          <div className="text-xs text-muted-foreground">#{r.id}</div>
                        </td>
                      ) : null}
                      {columnVisible("category") ? <td className="px-4 py-3">{r.category}</td> : null}
                      {columnVisible("merchant") ? <td className="px-4 py-3 text-muted-foreground">{r.merchant ?? "—"}</td> : null}
                      {columnVisible("amount") ? (
                        <td className="px-4 py-3 text-right tabular-nums font-medium">
                          {(r.amountUsd ?? r.amount).toLocaleString(undefined, {
                            style: "currency",
                            currency: r.currency || "USD",
                          })}
                        </td>
                      ) : null}
                      {columnVisible("status") ? (
                        <td className="px-4 py-3">
                          <EmLineStatusBadge status={r.status} />
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
                <Receipt className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                <div>{t("No receipt-backed expense lines yet.")}</div>
                <Button size="sm" asChild>
                  <Link href="/expense-management/expenses">{t("Go to expenses")}</Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pageItems.map((r) => (
                  <Card key={r.id} className="border-border/60 shadow-sm">
                    <CardContent className="space-y-2 p-4">
                      {columnVisible("expense") ? (
                        <div>
                          <button type="button" className="font-semibold text-primary hover:underline" onClick={() => openEdit(r)}>
                            {fmtDate(r.expenseDate)}
                          </button>
                          <p className="text-xs text-muted-foreground">#{r.id}</p>
                        </div>
                      ) : null}
                      {columnVisible("category") ? (
                        <p className="text-sm">
                          {t("Category")}: {r.category}
                        </p>
                      ) : null}
                      {columnVisible("merchant") ? (
                        <p className="text-xs text-muted-foreground">
                          {t("Merchant")}: {r.merchant ?? "—"}
                        </p>
                      ) : null}
                      {columnVisible("amount") ? (
                        <p className="text-sm font-medium tabular-nums">
                          {(r.amountUsd ?? r.amount).toLocaleString(undefined, {
                            style: "currency",
                            currency: r.currency || "USD",
                          })}
                        </p>
                      ) : null}
                      {columnVisible("status") ? (
                        <div>
                          <EmLineStatusBadge status={r.status} />
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
        </div>
      </EmMatterWorkspaceShell>

      <EmExpenseLineSheet
        open={open}
        onOpenChange={setOpen}
        edit={edit}
        categoryList={categoryList}
        onAfterSave={() => void load()}
      />
    </>
  );
}
