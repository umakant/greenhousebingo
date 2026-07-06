"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import { Trash2, DollarSign, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency } from "@/lib/format-currency";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableActionButton } from "@/components/ui/table-action-button";
import { HrmProjectsStyleListPage, type HrmViewMode } from "@/components/hrm/hrm-projects-style-list";
import { TableColumnVisibilityMenu } from "@/components/ui/table-column-visibility-menu";
import { useTableColumnVisibility } from "@/hooks/use-table-column-visibility";
import { t } from "@/lib/admin-t";


type Row = {
  id: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  currency: string;
  effectiveDate?: string | null;
  employee?: { id: string; firstName: string; lastName?: string | null; employeeId?: string | null; designation?: { name: string } | null } | null;
};

type SalCol = "employee" | "designation" | "basic" | "allow" | "deduct" | "net";

const SAL_COL_DEFAULT: Record<SalCol, boolean> = {
  employee: true,
  designation: true,
  basic: true,
  allow: true,
  deduct: true,
  net: true,
};

const salColumnDefs: { id: SalCol; label: string }[] = [
  { id: "employee", label: t("Employee") },
  { id: "designation", label: t("Designation") },
  { id: "basic", label: t("Basic Salary") },
  { id: "allow", label: t("Allowances") },
  { id: "deduct", label: t("Deductions") },
  { id: "net", label: t("Net Salary") },
];

export default function HrmSetSalaryAdmin({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-hrm");
  const { settings } = useAppSettings();
  const fmtCur = (n: number | null | undefined) => (n != null ? formatCurrency(Number(n), settings) : "—");
  const [items, setItems] = React.useState<Row[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [lastPage, setLastPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const [searchInput, setSearchInput] = React.useState("");
  const [viewMode, setViewMode] = React.useState<HrmViewMode>("list");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ employee_id: "", basic_salary: "", allowances: "0", deductions: "0", net_salary: "", currency: "USD", effective_date: "" });
  const [processing, setProcessing] = React.useState(false);
  const { columnVisible, setVisibility, resetVisibility } = useTableColumnVisibility<SalCol>("pf-hrm-set-salary-cols-v1", SAL_COL_DEFAULT);

  async function load(opts?: { nextPage?: number; nextPerPage?: number; nextSearch?: string }) {
    const p = opts?.nextPage ?? page;
    const pp = opts?.nextPerPage ?? perPage;
    const q = opts?.nextSearch !== undefined ? opts.nextSearch : search;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), per_page: String(pp) });
      if (q.trim()) params.set("search", q.trim());
      const res = await fetch(`/api/hrm/salary-allocations?${params}`, { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      setItems(json.data ?? []);
      setTotal(json.total ?? 0);
      setPage(p);
      if (opts?.nextPerPage != null) setPerPage(pp);
      setLastPage(typeof json.last_page === "number" ? json.last_page : Math.max(1, Math.ceil((json.total ?? 0) / pp)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  function calcNet() {
    const basic = Number(form.basic_salary) || 0;
    const allow = Number(form.allowances) || 0;
    const ded = Number(form.deductions) || 0;
    setForm((p) => ({ ...p, net_salary: String(basic + allow - ded) }));
  }

  function openEdit(row: Row) {
    setEditId(row.id);
    setForm({
      employee_id: row.employee?.id ?? "",
      basic_salary: String(row.basicSalary),
      allowances: String(row.allowances),
      deductions: String(row.deductions),
      net_salary: String(row.netSalary),
      currency: row.currency,
      effective_date: row.effectiveDate ? new Date(row.effectiveDate).toISOString().slice(0, 10) : "",
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setProcessing(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        basic_salary: Number(form.basic_salary),
        allowances: Number(form.allowances),
        deductions: Number(form.deductions),
        net_salary: Number(form.net_salary),
        currency: form.currency,
        effective_date: form.effective_date || null,
      };
      if (!editId) body.employee_id = form.employee_id;
      const url = editId ? `/api/hrm/salary-allocations/${editId}` : "/api/hrm/salary-allocations";
      const res = await fetch(url, {
        method: editId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Save failed");
      setOpen(false);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setProcessing(false);
    }
  }

  async function del(id: string) {
    if (!(await appConfirm(t("Delete this salary allocation?")))) return;
    const res = await fetch(`/api/hrm/salary-allocations/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError(j?.error || "Delete failed");
      return;
    }
    await load();
  }

  const empCell = (row: Row) =>
    row.employee ? (
      <>
        <div className="font-medium">
          {row.employee.firstName} {row.employee.lastName ?? ""}
        </div>
        {row.employee.employeeId ? <div className="text-xs text-muted-foreground">{row.employee.employeeId}</div> : null}
      </>
    ) : (
      "—"
    );

  const rowActions = (row: Row) =>
    can("edit-salary") || can("delete-salary") ? (
      <TableActionButton
        label={t("Edit")}
        onPrimaryClick={can("edit-salary") ? () => openEdit(row) : undefined}
        items={[
          { label: t("Edit Salary"), onSelect: () => openEdit(row), disabled: !can("edit-salary"), icon: <Pencil className="h-4 w-4" /> },
          { label: t("Remove"), onSelect: () => del(row.id), disabled: !can("delete-salary"), destructive: true, icon: <Trash2 className="h-4 w-4" /> },
        ]}
      />
    ) : null;

  return (
    <div className="w-full min-w-0 space-y-4">
      {error ? <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
      <HrmProjectsStyleListPage
        searchPlaceholder={t("Search employees...")}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearchSubmit={() => {
          const q = searchInput.trim();
          setSearch(q);
          void load({ nextPage: 1, nextSearch: q });
        }}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        perPage={perPage}
        onPerPageChange={(n) => void load({ nextPage: 1, nextPerPage: n })}
        columnsMenu={
          <TableColumnVisibilityMenu columns={salColumnDefs} columnVisible={columnVisible} setVisibility={setVisibility} onReset={resetVisibility} />
        }
        onRefresh={() => void load()}
        refreshing={loading}
        page={page}
        lastPage={lastPage}
        total={total}
        from={from}
        to={to}
        onPageChange={(p) => void load({ nextPage: p })}
      >
        {viewMode === "list" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {columnVisible("employee") ? <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Employee")}</th> : null}
                  {columnVisible("designation") ? <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Designation")}</th> : null}
                  {columnVisible("basic") ? <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t("Basic Salary")}</th> : null}
                  {columnVisible("allow") ? <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t("Allowances")}</th> : null}
                  {columnVisible("deduct") ? <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t("Deductions")}</th> : null}
                  {columnVisible("net") ? <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t("Net Salary")}</th> : null}
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      {t("Loading...")}
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <DollarSign className="h-10 w-10 text-gray-300" />
                        <div>{t("No salary allocations found")}</div>
                        <p className="text-xs">{t("Salary allocations are set per employee.")}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr key={row.id} className="border-b hover:bg-muted/30">
                      {columnVisible("employee") ? <td className="px-4 py-3">{empCell(row)}</td> : null}
                      {columnVisible("designation") ? (
                        <td className="px-4 py-3 text-muted-foreground">{row.employee?.designation?.name ?? "—"}</td>
                      ) : null}
                      {columnVisible("basic") ? <td className="px-4 py-3 text-right">{fmtCur(row.basicSalary)}</td> : null}
                      {columnVisible("allow") ? <td className="px-4 py-3 text-right text-green-700">{fmtCur(row.allowances)}</td> : null}
                      {columnVisible("deduct") ? <td className="px-4 py-3 text-right text-red-600">{fmtCur(row.deductions)}</td> : null}
                      {columnVisible("net") ? <td className="px-4 py-3 text-right font-medium">{fmtCur(row.netSalary)}</td> : null}
                      <td className="px-4 py-3 text-right">{rowActions(row)}</td>
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
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <DollarSign className="h-10 w-10 text-gray-300" />
                <div>{t("No salary allocations found")}</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((row) => (
                  <Card key={row.id} className="border-border/60 shadow-sm">
                    <CardContent className="space-y-2 p-4">
                      {columnVisible("employee") ? <div className="font-semibold">{empCell(row)}</div> : null}
                      {columnVisible("designation") ? (
                        <p className="text-xs text-muted-foreground">{row.employee?.designation?.name ?? "—"}</p>
                      ) : null}
                      {columnVisible("net") ? <p className="text-lg font-medium">{fmtCur(row.netSalary)}</p> : null}
                      {columnVisible("basic") ? <p className="text-xs">{t("Basic")}: {fmtCur(row.basicSalary)}</p> : null}
                      <div className="flex justify-end border-t pt-3">{rowActions(row)}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </HrmProjectsStyleListPage>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-[480px]">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>{editId ? t("Edit Salary Allocation") : t("Set Salary")}</SheetTitle>
          </SheetHeader>
          <form onSubmit={save} className="flex flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <div className="space-y-2">
                <Label required>{t("Basic Salary")}</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.basic_salary}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, basic_salary: e.target.value }));
                    setTimeout(calcNet, 0);
                  }}
                  onBlur={calcNet}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("Allowances")}</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.allowances}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, allowances: e.target.value }));
                      setTimeout(calcNet, 0);
                    }}
                    onBlur={calcNet}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("Deductions")}</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.deductions}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, deductions: e.target.value }));
                      setTimeout(calcNet, 0);
                    }}
                    onBlur={calcNet}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("Net Salary")}</Label>
                <Input type="number" min={0} step={0.01} value={form.net_salary} onChange={(e) => setForm((p) => ({ ...p, net_salary: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("Currency")}</Label>
                  <Input value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))} placeholder="USD" />
                </div>
                <div className="space-y-2">
                  <Label>{t("Effective Date")}</Label>
                  <Input type="date" value={form.effective_date} onChange={(e) => setForm((p) => ({ ...p, effective_date: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t bg-background px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t("Cancel")}
              </Button>
              <Button type="submit" disabled={processing}>
                {processing ? t("Saving...") : t("Save Salary")}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
