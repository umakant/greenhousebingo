"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import { Plus, Trash2, CalendarCheck } from "lucide-react";
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

type LARow = {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  totalDays: number | string | unknown;
  status: string;
  reason?: string | null;
  employee?: { id: string; firstName: string; lastName?: string | null } | null;
  leaveType?: { id: string; name: string } | null;
};
type OptionRow = { id: string; name: string };

type LaColId = "employee" | "leaveType" | "from" | "to" | "days" | "status";

const LA_COL_DEFAULT: Record<LaColId, boolean> = {
  employee: true,
  leaveType: true,
  from: true,
  to: true,
  days: true,
  status: true,
};

const laColumnDefs: { id: LaColId; label: string }[] = [
  { id: "employee", label: t("Employee") },
  { id: "leaveType", label: t("Leave Type") },
  { id: "from", label: t("From") },
  { id: "to", label: t("To") },
  { id: "days", label: t("Days") },
  { id: "status", label: t("Status") },
];

function statusBadge(s: string | null | undefined) {
  const key = (s ?? "").toLowerCase();
  const map: Record<string, string> = { pending: "bg-yellow-100 text-yellow-800", approved: "bg-green-100 text-green-800", rejected: "bg-red-100 text-red-800" };
  const label = s && String(s).trim() ? String(s) : "—";
  return <span className={`px-2 py-1 rounded-full text-xs ${map[key] ?? "bg-gray-100 text-gray-700"}`}>{label}</span>;
}

function fmtTotalDays(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "object" && v !== null && "toNumber" in v && typeof (v as { toNumber: () => number }).toNumber === "function") {
    return String((v as { toNumber: () => number }).toNumber());
  }
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : "—";
}

export default function HrmLeaveApplicationsAdmin({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-hrm");
  const { settings } = useAppSettings();
  const fmtDate = (d: string | Date | null | undefined) => formatDate(d, settings);
  const [items, setItems] = React.useState<LARow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [lastPage, setLastPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [searchInput, setSearchInput] = React.useState("");
  const [viewMode, setViewMode] = React.useState<HrmViewMode>("list");
  const [perPage, setPerPage] = React.useState(10);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [employees, setEmployees] = React.useState<OptionRow[]>([]);
  const [leaveTypes, setLeaveTypes] = React.useState<OptionRow[]>([]);
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ employee_id: "", leave_type_id: "", start_date: "", end_date: "", reason: "", status: "pending" });
  const [processing, setProcessing] = React.useState(false);
  const { columnVisible, setVisibility, resetVisibility } = useTableColumnVisibility<LaColId>("pf-hrm-leave-apps-admin-cols-v1", LA_COL_DEFAULT);

  async function loadOptions() {
    const [e, lt] = await Promise.all([
      fetch("/api/hrm/employees?per_page=200&status=active", { credentials: "include" }).then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/hrm/leave-types?per_page=100", { credentials: "include" }).then((r) => r.json()).catch(() => ({ data: [] })),
    ]);
    setEmployees((e.data ?? []).map((emp: { id: string; firstName: string; lastName?: string | null }) => ({ id: emp.id, name: `${emp.firstName} ${emp.lastName ?? ""}`.trim() })));
    setLeaveTypes(lt.data ?? []);
  }

  async function load(opts?: { nextPage?: number; nextPerPage?: number; nextSearch?: string; nextStatus?: string }) {
    const p = opts?.nextPage ?? page;
    const pp = opts?.nextPerPage ?? perPage;
    const q = opts?.nextSearch !== undefined ? opts.nextSearch : search;
    const st = opts?.nextStatus !== undefined ? opts.nextStatus : statusFilter;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), per_page: String(pp) });
      if (st && st !== "all") params.set("status", st);
      if (q.trim()) params.set("search", q.trim());
      const res = await fetch(`/api/hrm/leave-applications?${params}`, { cache: "no-store", credentials: "include" });
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
    void loadOptions();
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
  const filterCount = statusFilter !== "all" ? 1 : 0;

  function openCreate() {
    setMode("add");
    setEditId(null);
    setForm({ employee_id: "", leave_type_id: "", start_date: "", end_date: "", reason: "", status: "pending" });
    setOpen(true);
  }
  function openEdit(row: LARow) {
    const sd = row.startDate ? new Date(row.startDate).toISOString().slice(0, 10) : "";
    const ed = row.endDate ? new Date(row.endDate).toISOString().slice(0, 10) : "";
    setMode("edit");
    setEditId(row.id);
    setForm({
      employee_id: row.employeeId,
      leave_type_id: row.leaveTypeId,
      start_date: sd,
      end_date: ed,
      reason: row.reason ?? "",
      status: row.status ?? "pending",
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setProcessing(true);
    setError(null);
    try {
      const url = mode === "add" ? "/api/hrm/leave-applications" : `/api/hrm/leave-applications/${editId}`;
      const body =
        mode === "add"
          ? { employee_id: form.employee_id, leave_type_id: form.leave_type_id, start_date: form.start_date, end_date: form.end_date, reason: form.reason || null, status: form.status }
          : { status: form.status, reason: form.reason || null };
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
    if (!(await appConfirm(t("Delete this leave application?")))) return;
    const res = await fetch(`/api/hrm/leave-applications/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError(j?.error || "Delete failed");
      return;
    }
    await load();
  }

  async function approve(id: string) {
    const res = await fetch(`/api/hrm/leave-applications/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: "approved" }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError(j?.error || "Failed");
      return;
    }
    await load();
  }

  async function reject(id: string) {
    const res = await fetch(`/api/hrm/leave-applications/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: "rejected" }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError(j?.error || "Failed");
      return;
    }
    await load();
  }

  const empLabel = (row: LARow) => (row.employee ? `${row.employee.firstName} ${row.employee.lastName ?? ""}`.trim() : "—");

  const rowActions = (row: LARow) => (
    <TableActionButton
      label={t("Actions")}
      onPrimaryClick={can("edit-leave-applications") ? () => openEdit(row) : undefined}
      items={[
        { label: t("Edit"), onSelect: () => openEdit(row), disabled: !can("edit-leave-applications") },
        {
          label: t("Approve"),
          onSelect: () => approve(row.id),
          disabled: !can("edit-leave-applications") || String(row.status).toLowerCase() === "approved",
        },
        {
          label: t("Reject"),
          onSelect: () => reject(row.id),
          disabled: !can("edit-leave-applications") || String(row.status).toLowerCase() === "rejected",
        },
        { label: t("Delete"), onSelect: () => del(row.id), disabled: !can("delete-leave-applications"), destructive: true, icon: <Trash2 className="h-4 w-4" /> },
      ]}
    />
  );

  return (
    <div className="w-full min-w-0 space-y-4">
      {error ? <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
      <HrmProjectsStyleListPage
        searchPlaceholder={t("Search by employee, leave type, or reason...")}
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
        activeFilterCount={filterCount}
        filtersMenuContent={
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t("Status")}</label>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                void load({ nextPage: 1, nextSearch: search, nextStatus: v });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All Status")}</SelectItem>
                <SelectItem value="pending">{t("Pending")}</SelectItem>
                <SelectItem value="approved">{t("Approved")}</SelectItem>
                <SelectItem value="rejected">{t("Rejected")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        columnsMenu={
          <TableColumnVisibilityMenu columns={laColumnDefs} columnVisible={columnVisible} setVisibility={setVisibility} onReset={resetVisibility} />
        }
        onRefresh={() => void load()}
        refreshing={loading}
        primaryAction={
          can("create-leave-applications") ? (
            <Button size="sm" className="gap-1" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t("Apply Leave")}
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
                  {columnVisible("leaveType") ? <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Leave Type")}</th> : null}
                  {columnVisible("from") ? <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("From")}</th> : null}
                  {columnVisible("to") ? <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("To")}</th> : null}
                  {columnVisible("days") ? <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Days")}</th> : null}
                  {columnVisible("status") ? <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Status")}</th> : null}
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
                        <CalendarCheck className="h-10 w-10 text-gray-300" />
                        <div>{t("No leave applications found")}</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr key={row.id} className="border-b hover:bg-muted/30">
                      {columnVisible("employee") ? <td className="px-4 py-3 font-medium">{empLabel(row)}</td> : null}
                      {columnVisible("leaveType") ? <td className="px-4 py-3">{row.leaveType?.name ?? "—"}</td> : null}
                      {columnVisible("from") ? <td className="px-4 py-3">{fmtDate(row.startDate)}</td> : null}
                      {columnVisible("to") ? <td className="px-4 py-3">{fmtDate(row.endDate)}</td> : null}
                      {columnVisible("days") ? <td className="px-4 py-3">{fmtTotalDays(row.totalDays)}</td> : null}
                      {columnVisible("status") ? <td className="px-4 py-3">{statusBadge(row.status)}</td> : null}
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
                <CalendarCheck className="h-10 w-10 text-gray-300" />
                <div>{t("No leave applications found")}</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((row) => (
                  <Card key={row.id} className="border-border/60 shadow-sm">
                    <CardContent className="space-y-2 p-4">
                      {columnVisible("employee") ? <div className="font-semibold">{empLabel(row)}</div> : null}
                      {columnVisible("leaveType") ? <div className="text-sm text-muted-foreground">{row.leaveType?.name ?? "—"}</div> : null}
                      {columnVisible("from") || columnVisible("to") ? (
                        <p className="text-xs text-muted-foreground">
                          {columnVisible("from") ? fmtDate(row.startDate) : "—"}
                          {" → "}
                          {columnVisible("to") ? fmtDate(row.endDate) : "—"}
                        </p>
                      ) : null}
                      {columnVisible("days") ? <p className="text-xs">{t("Days")}: {fmtTotalDays(row.totalDays)}</p> : null}
                      {columnVisible("status") ? <div>{statusBadge(row.status)}</div> : null}
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
            <SheetTitle>{mode === "add" ? t("Apply for Leave") : t("Update Leave Application")}</SheetTitle>
          </SheetHeader>
          <form onSubmit={save} className="flex flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {mode === "add" && (
                <>
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
                  <div className="space-y-2">
                    <Label required>{t("Leave Type")}</Label>
                    <Select value={form.leave_type_id} onValueChange={(v) => setForm((p) => ({ ...p, leave_type_id: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("Select leave type...")} />
                      </SelectTrigger>
                      <SelectContent>
                        {leaveTypes.map((lt) => (
                          <SelectItem key={lt.id} value={lt.id}>
                            {lt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label required>{t("Start Date")}</Label>
                      <Input type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <Label required>{t("End Date")}</Label>
                      <Input type="date" value={form.end_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} required />
                    </div>
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label>{t("Status")}</Label>
                <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">{t("Pending")}</SelectItem>
                    <SelectItem value="approved">{t("Approved")}</SelectItem>
                    <SelectItem value="rejected">{t("Rejected")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("Reason")}</Label>
                <Textarea value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} rows={3} />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t bg-background px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t("Cancel")}
              </Button>
              <Button type="submit" disabled={processing}>
                {processing ? t("Saving...") : mode === "add" ? t("Submit") : t("Update")}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
