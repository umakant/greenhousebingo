"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import { Plus, Trash2, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TableActionButton } from "@/components/ui/table-action-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate } from "@/lib/format-date";
import { HrmProjectsStyleListPage, type HrmViewMode } from "@/components/hrm/hrm-projects-style-list";
import { TableColumnVisibilityMenu } from "@/components/ui/table-column-visibility-menu";
import { useTableColumnVisibility } from "@/hooks/use-table-column-visibility";
import { t } from "@/lib/admin-t";


type Row = {
  id: string;
  transferDate: string;
  reason?: string | null;
  employee?: { id: string; firstName: string; lastName?: string | null } | null;
  fromDepartment?: { id: string; name: string } | null;
  toDepartment?: { id: string; name: string } | null;
  fromBranch?: { id: string; name: string } | null;
  toBranch?: { id: string; name: string } | null;
};
type OptionRow = { id: string; name: string };
type TrCol = "employee" | "fromDept" | "toDept" | "date" | "reason";

const TR_COL_DEFAULT: Record<TrCol, boolean> = {
  employee: true,
  fromDept: true,
  toDept: true,
  date: true,
  reason: true,
};

const trColumnDefs: { id: TrCol; label: string }[] = [
  { id: "employee", label: t("Employee") },
  { id: "fromDept", label: t("From Dept") },
  { id: "toDept", label: t("To Dept") },
  { id: "date", label: t("Transfer Date") },
  { id: "reason", label: t("Reason") },
];

export default function HrmTransfersAdmin({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-hrm");
  const { settings } = useAppSettings();
  const fmtDate = (d: string | Date | null | undefined) => formatDate(d, settings);
  const [items, setItems] = React.useState<Row[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [lastPage, setLastPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<HrmViewMode>("list");
  const [perPage, setPerPage] = React.useState(10);
  const [employees, setEmployees] = React.useState<OptionRow[]>([]);
  const [departments, setDepartments] = React.useState<OptionRow[]>([]);
  const [branches, setBranches] = React.useState<OptionRow[]>([]);
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  const emptyForm = { employee_id: "", from_department_id: "", to_department_id: "", from_branch_id: "", to_branch_id: "", transfer_date: "", reason: "" };
  const [form, setForm] = React.useState(emptyForm);
  const [processing, setProcessing] = React.useState(false);
  const { columnVisible, setVisibility, resetVisibility } = useTableColumnVisibility<TrCol>("pf-hrm-transfers-cols-v1", TR_COL_DEFAULT);

  async function load(opts?: { nextPage?: number; nextPerPage?: number }) {
    const p = opts?.nextPage ?? page;
    const pp = opts?.nextPerPage ?? perPage;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/hrm/transfers?page=${p}&per_page=${pp}`, { cache: "no-store", credentials: "include" });
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
    Promise.all([
      fetch("/api/hrm/employees?per_page=200", { credentials: "include" }).then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/hrm/departments?per_page=100", { credentials: "include" }).then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/hrm/branches?per_page=100", { credentials: "include" }).then((r) => r.json()).catch(() => ({ data: [] })),
    ])
      .then(([e, d, b]) => {
        setEmployees((e.data ?? []).map((emp: { id: string; firstName: string; lastName?: string | null }) => ({ id: emp.id, name: `${emp.firstName} ${emp.lastName ?? ""}`.trim() })));
        setDepartments(d.data ?? []);
        setBranches(b.data ?? []);
      })
      .catch(() => {});
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

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
      from_department_id: row.fromDepartment?.id ?? "",
      to_department_id: row.toDepartment?.id ?? "",
      from_branch_id: row.fromBranch?.id ?? "",
      to_branch_id: row.toBranch?.id ?? "",
      transfer_date: new Date(row.transferDate).toISOString().slice(0, 10),
      reason: row.reason ?? "",
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setProcessing(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        from_department_id: form.from_department_id || null,
        to_department_id: form.to_department_id || null,
        from_branch_id: form.from_branch_id || null,
        to_branch_id: form.to_branch_id || null,
        transfer_date: form.transfer_date,
        reason: form.reason || null,
      };
      if (mode === "add") body.employee_id = form.employee_id;
      const url = mode === "add" ? "/api/hrm/transfers" : `/api/hrm/transfers/${editId}`;
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
    if (!(await appConfirm(t("Delete this transfer?")))) return;
    const res = await fetch(`/api/hrm/transfers/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError(j?.error || "Delete failed");
      return;
    }
    await load();
  }

  const noneOpt = <SelectItem value="__none__">{t("None")}</SelectItem>;
  const set = (k: keyof typeof emptyForm) => (v: string) => setForm((p) => ({ ...p, [k]: v === "__none__" ? "" : v }));

  const empLabel = (row: Row) => (row.employee ? `${row.employee.firstName} ${row.employee.lastName ?? ""}`.trim() : "—");

  const rowActions = (row: Row) =>
    can("edit-transfers") || can("delete-transfers") ? (
      <TableActionButton
        label={t("Edit")}
        onPrimaryClick={can("edit-transfers") ? () => openEdit(row) : undefined}
        items={[
          { label: t("Edit"), onSelect: () => openEdit(row), disabled: !can("edit-transfers") },
          { label: t("Delete"), onSelect: () => del(row.id), disabled: !can("delete-transfers"), destructive: true, icon: <Trash2 className="h-4 w-4" /> },
        ]}
      />
    ) : null;

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
        columnsMenu={
          <TableColumnVisibilityMenu columns={trColumnDefs} columnVisible={columnVisible} setVisibility={setVisibility} onReset={resetVisibility} />
        }
        onRefresh={() => void load()}
        refreshing={loading}
        primaryAction={
          can("create-transfers") ? (
            <Button size="sm" className="gap-1" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t("Add Transfer")}
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
                  {columnVisible("fromDept") ? <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("From Dept")}</th> : null}
                  {columnVisible("toDept") ? <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("To Dept")}</th> : null}
                  {columnVisible("date") ? <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Transfer Date")}</th> : null}
                  {columnVisible("reason") ? <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Reason")}</th> : null}
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      {t("Loading...")}
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ArrowLeftRight className="h-10 w-10 text-gray-300" />
                        <div>{t("No transfers found")}</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr key={row.id} className="border-b hover:bg-muted/30">
                      {columnVisible("employee") ? <td className="px-4 py-3 font-medium">{empLabel(row)}</td> : null}
                      {columnVisible("fromDept") ? <td className="px-4 py-3 text-muted-foreground">{row.fromDepartment?.name ?? "—"}</td> : null}
                      {columnVisible("toDept") ? <td className="px-4 py-3">{row.toDepartment?.name ?? "—"}</td> : null}
                      {columnVisible("date") ? <td className="px-4 py-3">{fmtDate(row.transferDate)}</td> : null}
                      {columnVisible("reason") ? (
                        <td className="max-w-40 truncate px-4 py-3 text-muted-foreground">{row.reason || "—"}</td>
                      ) : null}
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
                <ArrowLeftRight className="h-10 w-10 text-gray-300" />
                <div>{t("No transfers found")}</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((row) => (
                  <Card key={row.id} className="border-border/60 shadow-sm">
                    <CardContent className="space-y-2 p-4">
                      {columnVisible("employee") ? <div className="font-semibold">{empLabel(row)}</div> : null}
                      {columnVisible("fromDept") || columnVisible("toDept") ? (
                        <p className="text-sm text-muted-foreground">
                          {columnVisible("fromDept") ? row.fromDepartment?.name ?? "—" : ""}
                          {columnVisible("fromDept") && columnVisible("toDept") ? " → " : ""}
                          {columnVisible("toDept") ? row.toDepartment?.name ?? "—" : ""}
                        </p>
                      ) : null}
                      {columnVisible("date") ? <p className="text-xs">{fmtDate(row.transferDate)}</p> : null}
                      {columnVisible("reason") ? <p className="line-clamp-2 text-xs">{row.reason || "—"}</p> : null}
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
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-[520px]">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>{mode === "add" ? t("Add Transfer") : t("Edit Transfer")}</SheetTitle>
          </SheetHeader>
          <form onSubmit={save} className="flex flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {mode === "add" && (
                <div className="space-y-2">
                  <Label required>{t("Employee")}</Label>
                  <Select value={form.employee_id} onValueChange={set("employee_id")}>
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
                  <Label>{t("From Department")}</Label>
                  <Select value={form.from_department_id || "__none__"} onValueChange={set("from_department_id")}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("None")} />
                    </SelectTrigger>
                    <SelectContent>
                      {noneOpt}
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("To Department")}</Label>
                  <Select value={form.to_department_id || "__none__"} onValueChange={set("to_department_id")}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("None")} />
                    </SelectTrigger>
                    <SelectContent>
                      {noneOpt}
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("From Branch")}</Label>
                  <Select value={form.from_branch_id || "__none__"} onValueChange={set("from_branch_id")}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("None")} />
                    </SelectTrigger>
                    <SelectContent>
                      {noneOpt}
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("To Branch")}</Label>
                  <Select value={form.to_branch_id || "__none__"} onValueChange={set("to_branch_id")}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("None")} />
                    </SelectTrigger>
                    <SelectContent>
                      {noneOpt}
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label required>{t("Transfer Date")}</Label>
                <Input type="date" value={form.transfer_date} onChange={(e) => setForm((p) => ({ ...p, transfer_date: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>{t("Reason")}</Label>
                <Textarea value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t bg-background px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t("Cancel")}
              </Button>
              <Button type="submit" disabled={processing}>
                {processing ? t("Saving...") : mode === "add" ? t("Add Transfer") : t("Update")}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
