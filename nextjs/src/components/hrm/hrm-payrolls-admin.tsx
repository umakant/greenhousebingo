"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import { Plus, Trash2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency } from "@/lib/format-currency";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableActionButton } from "@/components/ui/table-action-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { HrmProjectsStyleListPage, type HrmViewMode } from "@/components/hrm/hrm-projects-style-list";
import { TableColumnVisibilityMenu } from "@/components/ui/table-column-visibility-menu";
import { useTableColumnVisibility } from "@/hooks/use-table-column-visibility";
import { t } from "@/lib/admin-t";


const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type Row = {
  id: string;
  month: number;
  year: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: string;
  paymentDate?: string | null;
  employee?: { id: string; firstName: string; lastName?: string | null; employeeId?: string | null } | null;
};
type OptionRow = { id: string; name: string };

type PayCol = "employee" | "period" | "basic" | "allow" | "deduct" | "net" | "status";

const PAY_COL_DEFAULT: Record<PayCol, boolean> = {
  employee: true,
  period: true,
  basic: true,
  allow: true,
  deduct: true,
  net: true,
  status: true,
};

const payColumnDefs: { id: PayCol; label: string }[] = [
  { id: "employee", label: t("Employee") },
  { id: "period", label: t("Period") },
  { id: "basic", label: t("Basic") },
  { id: "allow", label: t("Allowances") },
  { id: "deduct", label: t("Deductions") },
  { id: "net", label: t("Net") },
  { id: "status", label: t("Status") },
];

function statusBadge(s: string) {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    paid: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };
  return <span className={`rounded-full px-2 py-1 text-xs ${map[s] ?? "bg-gray-100"}`}>{s}</span>;
}

export default function HrmPayrollsAdmin({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-hrm");
  const { settings } = useAppSettings();
  const fmtCur = (n: number | null | undefined) => (n != null ? formatCurrency(Number(n), settings) : "—");
  const now = new Date();
  const [items, setItems] = React.useState<Row[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [lastPage, setLastPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [viewMode, setViewMode] = React.useState<HrmViewMode>("list");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [monthFilter, setMonthFilter] = React.useState(String(now.getMonth() + 1));
  const [yearFilter, setYearFilter] = React.useState(String(now.getFullYear()));
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [employees, setEmployees] = React.useState<OptionRow[]>([]);
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  const emptyForm = { employee_id: "", month: String(now.getMonth() + 1), year: String(now.getFullYear()), basic_salary: "", allowances: "0", deductions: "0", net_salary: "", status: "pending", payment_date: "" };
  const [form, setForm] = React.useState(emptyForm);
  const [processing, setProcessing] = React.useState(false);
  const { columnVisible, setVisibility, resetVisibility } = useTableColumnVisibility<PayCol>("pf-hrm-payrolls-cols-v1", PAY_COL_DEFAULT);

  const yearOptions = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - 2 + i));
  const activeFilterCount = statusFilter !== "all" ? 1 : 0;

  async function load(opts?: { nextPage?: number; nextPerPage?: number; nextMonth?: string; nextYear?: string; nextStatus?: string }) {
    const p = opts?.nextPage ?? page;
    const pp = opts?.nextPerPage ?? perPage;
    const m = opts?.nextMonth ?? monthFilter;
    const y = opts?.nextYear ?? yearFilter;
    const st = opts?.nextStatus ?? statusFilter;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), per_page: String(pp), month: m, year: y });
      if (st !== "all") params.set("status", st);
      const res = await fetch(`/api/hrm/payrolls?${params}`, { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      setItems(json.data ?? []);
      setTotal(json.total ?? 0);
      setPage(p);
      if (opts?.nextPerPage != null) setPerPage(pp);
      if (opts?.nextMonth != null) setMonthFilter(m);
      if (opts?.nextYear != null) setYearFilter(y);
      if (opts?.nextStatus != null) setStatusFilter(st);
      setLastPage(typeof json.last_page === "number" ? json.last_page : Math.max(1, Math.ceil((json.total ?? 0) / pp)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    fetch("/api/hrm/employees?per_page=200&status=active", { credentials: "include" })
      .then((r) => r.json())
      .then((d) =>
        setEmployees(
          (d.data ?? []).map((e: { id: string; firstName: string; lastName?: string | null }) => ({
            id: e.id,
            name: `${e.firstName} ${e.lastName ?? ""}`.trim(),
          })),
        ),
      )
      .catch(() => {});
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

  function openCreate() {
    setMode("add");
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  }
  function openEdit(row: Row) {
    setMode("edit");
    setEditId(row.id);
    setForm({
      employee_id: row.employee?.id ?? "",
      month: String(row.month),
      year: String(row.year),
      basic_salary: String(row.basicSalary),
      allowances: String(row.allowances),
      deductions: String(row.deductions),
      net_salary: String(row.netSalary),
      status: row.status,
      payment_date: row.paymentDate ? new Date(row.paymentDate).toISOString().slice(0, 10) : "",
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setProcessing(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        month: Number(form.month),
        year: Number(form.year),
        basic_salary: Number(form.basic_salary),
        allowances: Number(form.allowances),
        deductions: Number(form.deductions),
        net_salary: Number(form.net_salary),
        status: form.status,
        payment_date: form.payment_date || null,
      };
      if (mode === "add") body.employee_id = form.employee_id;
      const url = mode === "add" ? "/api/hrm/payrolls" : `/api/hrm/payrolls/${editId}`;
      const res = await fetch(url, {
        method: mode === "add" ? "POST" : "PATCH",
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
    if (!(await appConfirm(t("Delete this payroll record?")))) return;
    const res = await fetch(`/api/hrm/payrolls/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError(j?.error || "Delete failed");
      return;
    }
    await load();
  }

  async function markPaid(id: string) {
    const res = await fetch(`/api/hrm/payrolls/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: "paid", payment_date: new Date().toISOString().slice(0, 10) }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError(j?.error || "Failed");
      return;
    }
    await load();
  }

  const empLabel = (row: Row) => (row.employee ? `${row.employee.firstName} ${row.employee.lastName ?? ""}`.trim() : "—");

  return (
    <div className="w-full min-w-0 space-y-4">
      {error ? <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
      <HrmProjectsStyleListPage
        showSearch={false}
        searchPlaceholder=""
        searchInput=""
        onSearchInputChange={() => {}}
        onSearchSubmit={() => {}}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        perPage={perPage}
        onPerPageChange={(n) => void load({ nextPage: 1, nextPerPage: n })}
        activeFilterCount={activeFilterCount}
        filtersMenuContent={
          <>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{t("Month")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={monthFilter}
              onValueChange={(v) => {
                setMonthFilter(v);
                void load({ nextPage: 1, nextMonth: v });
              }}
            >
              {MONTHS.map((m, i) => (
                <DropdownMenuRadioItem key={i + 1} value={String(i + 1)}>
                  {m}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{t("Year")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={yearFilter}
              onValueChange={(v) => {
                setYearFilter(v);
                void load({ nextPage: 1, nextYear: v });
              }}
            >
              {yearOptions.map((y) => (
                <DropdownMenuRadioItem key={y} value={y}>
                  {y}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{t("Status")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                void load({ nextPage: 1, nextStatus: v });
              }}
            >
              <DropdownMenuRadioItem value="all">{t("All Status")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="pending">{t("Pending")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="paid">{t("Paid")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="cancelled">{t("Cancelled")}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </>
        }
        columnsMenu={
          <TableColumnVisibilityMenu columns={payColumnDefs} columnVisible={columnVisible} setVisibility={setVisibility} onReset={resetVisibility} />
        }
        onRefresh={() => void load()}
        refreshing={loading}
        primaryAction={
          can("create-payroll") ? (
            <Button size="sm" className="gap-1" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t("Add Payroll")}
            </Button>
          ) : undefined
        }
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
                  {columnVisible("period") ? <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Period")}</th> : null}
                  {columnVisible("basic") ? <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t("Basic")}</th> : null}
                  {columnVisible("allow") ? <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t("Allowances")}</th> : null}
                  {columnVisible("deduct") ? <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t("Deductions")}</th> : null}
                  {columnVisible("net") ? <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t("Net")}</th> : null}
                  {columnVisible("status") ? <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Status")}</th> : null}
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                      {t("Loading...")}
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Receipt className="h-10 w-10 text-gray-300" />
                        <div>{t("No payroll records found")}</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr key={row.id} className="border-b hover:bg-muted/30">
                      {columnVisible("employee") ? <td className="px-4 py-3 font-medium">{empLabel(row)}</td> : null}
                      {columnVisible("period") ? (
                        <td className="px-4 py-3">
                          {MONTHS[row.month - 1]} {row.year}
                        </td>
                      ) : null}
                      {columnVisible("basic") ? <td className="px-4 py-3 text-right">{fmtCur(row.basicSalary)}</td> : null}
                      {columnVisible("allow") ? <td className="px-4 py-3 text-right text-green-700">{fmtCur(row.allowances)}</td> : null}
                      {columnVisible("deduct") ? <td className="px-4 py-3 text-right text-red-600">{fmtCur(row.deductions)}</td> : null}
                      {columnVisible("net") ? <td className="px-4 py-3 text-right font-medium">{fmtCur(row.netSalary)}</td> : null}
                      {columnVisible("status") ? <td className="px-4 py-3">{statusBadge(row.status)}</td> : null}
                      <td className="px-4 py-3 text-right">
                        <TableActionButton
                          label={t("Actions")}
                          onPrimaryClick={can("edit-payroll") ? () => openEdit(row) : undefined}
                          items={[
                            { label: t("Edit"), onSelect: () => openEdit(row), disabled: !can("edit-payroll") },
                            { label: t("Mark as Paid"), onSelect: () => markPaid(row.id), disabled: !can("edit-payroll") || row.status === "paid" },
                            { label: t("Delete"), onSelect: () => del(row.id), disabled: !can("delete-payroll"), destructive: true, icon: <Trash2 className="h-4 w-4" /> },
                          ]}
                        />
                      </td>
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
                <Receipt className="h-10 w-10 text-gray-300" />
                <div>{t("No payroll records found")}</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((row) => (
                  <Card key={row.id} className="border-border/60 shadow-sm">
                    <CardContent className="space-y-2 p-4">
                      {columnVisible("employee") ? <div className="font-semibold">{empLabel(row)}</div> : null}
                      {columnVisible("period") ? (
                        <p className="text-xs text-muted-foreground">
                          {MONTHS[row.month - 1]} {row.year}
                        </p>
                      ) : null}
                      {columnVisible("net") ? <p className="text-lg font-medium">{fmtCur(row.netSalary)}</p> : null}
                      {columnVisible("status") ? <div>{statusBadge(row.status)}</div> : null}
                      <div className="flex justify-end border-t pt-3">
                        <TableActionButton
                          label={t("Actions")}
                          onPrimaryClick={can("edit-payroll") ? () => openEdit(row) : undefined}
                          items={[
                            { label: t("Edit"), onSelect: () => openEdit(row), disabled: !can("edit-payroll") },
                            { label: t("Mark as Paid"), onSelect: () => markPaid(row.id), disabled: !can("edit-payroll") || row.status === "paid" },
                            { label: t("Delete"), onSelect: () => del(row.id), disabled: !can("delete-payroll"), destructive: true, icon: <Trash2 className="h-4 w-4" /> },
                          ]}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </HrmProjectsStyleListPage>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-[520px]">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>{mode === "add" ? t("Add Payroll") : t("Edit Payroll")}</SheetTitle>
          </SheetHeader>
          <form onSubmit={save} className="flex flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {mode === "add" && (
                <div className="space-y-2">
                  <Label required>{t("Employee")}</Label>
                  <Select value={form.employee_id} onValueChange={(v) => setForm((p) => ({ ...p, employee_id: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("Select employee...")} />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label required>{t("Month")}</Label>
                  <Select value={form.month} onValueChange={(v) => setForm((p) => ({ ...p, month: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label required>{t("Year")}</Label>
                  <Select value={form.year} onValueChange={(v) => setForm((p) => ({ ...p, year: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((y) => (
                        <SelectItem key={y} value={y}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
                  <Label>{t("Status")}</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">{t("Pending")}</SelectItem>
                      <SelectItem value="paid">{t("Paid")}</SelectItem>
                      <SelectItem value="cancelled">{t("Cancelled")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("Payment Date")}</Label>
                  <Input type="date" value={form.payment_date} onChange={(e) => setForm((p) => ({ ...p, payment_date: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t bg-background px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t("Cancel")}
              </Button>
              <Button type="submit" disabled={processing}>
                {processing ? t("Saving...") : mode === "add" ? t("Create Payroll") : t("Update")}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
