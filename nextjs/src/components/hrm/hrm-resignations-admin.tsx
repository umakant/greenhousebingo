"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import { Plus, Trash2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TableActionButton } from "@/components/ui/table-action-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate } from "@/lib/format-date";
import { HrmProjectsStyleListPage, type HrmViewMode } from "@/components/hrm/hrm-projects-style-list";
import { TableColumnVisibilityMenu } from "@/components/ui/table-column-visibility-menu";
import { useTableColumnVisibility } from "@/hooks/use-table-column-visibility";
import { t } from "@/lib/admin-t";


type Row = {
  id: string;
  status: string;
  noticeDate?: string | null;
  resignationDate?: string | null;
  reason?: string | null;
  employee?: { id: string; firstName: string; lastName?: string | null } | null;
};
type OptionRow = { id: string; name: string };
type ResColId = "employee" | "notice" | "resignation" | "reason" | "status";

const RES_COL_DEFAULT: Record<ResColId, boolean> = {
  employee: true,
  notice: true,
  resignation: true,
  reason: true,
  status: true,
};

const resColumnDefs: { id: ResColId; label: string }[] = [
  { id: "employee", label: t("Employee") },
  { id: "notice", label: t("Notice Date") },
  { id: "resignation", label: t("Resignation Date") },
  { id: "reason", label: t("Reason") },
  { id: "status", label: t("Status") },
];

function statusBadge(s: string) {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };
  return <span className={`rounded-full px-2 py-1 text-xs ${map[s] ?? "bg-gray-100 text-gray-700"}`}>{s}</span>;
}

export default function HrmResignationsAdmin({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-hrm");
  const { settings } = useAppSettings();
  const fmtDate = (d: string | Date | null | undefined) => formatDate(d, settings);
  const [items, setItems] = React.useState<Row[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [lastPage, setLastPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [viewMode, setViewMode] = React.useState<HrmViewMode>("list");
  const [perPage, setPerPage] = React.useState(10);
  const [employees, setEmployees] = React.useState<OptionRow[]>([]);
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ employee_id: "", notice_date: "", resignation_date: "", reason: "", status: "pending" });
  const [processing, setProcessing] = React.useState(false);
  const { columnVisible, setVisibility, resetVisibility } = useTableColumnVisibility<ResColId>(
    "pf-hrm-resignations-admin-cols-v1",
    RES_COL_DEFAULT,
  );

  async function load(opts?: { nextPage?: number; nextPerPage?: number; nextStatus?: string }) {
    const p = opts?.nextPage ?? page;
    const pp = opts?.nextPerPage ?? perPage;
    const st = opts?.nextStatus ?? statusFilter;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), per_page: String(pp) });
      if (st !== "all") params.set("status", st);
      const res = await fetch(`/api/hrm/resignations?${params}`, { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      setItems(json.data ?? []);
      setTotal(json.total ?? 0);
      setPage(p);
      if (opts?.nextPerPage != null) setPerPage(pp);
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
  const activeFilterCount = statusFilter !== "all" ? 1 : 0;

  function openCreate() {
    setMode("add");
    setEditId(null);
    setForm({ employee_id: "", notice_date: "", resignation_date: "", reason: "", status: "pending" });
    setOpen(true);
  }
  function openEdit(row: Row) {
    setMode("edit");
    setEditId(row.id);
    setForm({
      employee_id: row.employee?.id ?? "",
      notice_date: row.noticeDate ? new Date(row.noticeDate).toISOString().slice(0, 10) : "",
      resignation_date: row.resignationDate ? new Date(row.resignationDate).toISOString().slice(0, 10) : "",
      reason: row.reason ?? "",
      status: row.status,
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setProcessing(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        notice_date: form.notice_date || null,
        resignation_date: form.resignation_date || null,
        reason: form.reason || null,
        status: form.status,
      };
      if (mode === "add") body.employee_id = form.employee_id;
      const url = mode === "add" ? "/api/hrm/resignations" : `/api/hrm/resignations/${editId}`;
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
    if (!(await appConfirm(t("Delete this resignation?")))) return;
    const res = await fetch(`/api/hrm/resignations/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError(j?.error || "Delete failed");
      return;
    }
    await load();
  }

  const empLabel = (row: Row) => (row.employee ? `${row.employee.firstName} ${row.employee.lastName ?? ""}`.trim() : "—");

  const rowActions = (row: Row) =>
    can("edit-resignations") || can("delete-resignations") ? (
      <TableActionButton
        label={t("Edit")}
        onPrimaryClick={can("edit-resignations") ? () => openEdit(row) : undefined}
        items={[
          { label: t("Edit"), onSelect: () => openEdit(row), disabled: !can("edit-resignations") },
          { label: t("Delete"), onSelect: () => del(row.id), disabled: !can("delete-resignations"), destructive: true, icon: <Trash2 className="h-4 w-4" /> },
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
        activeFilterCount={activeFilterCount}
        filtersMenuContent={
          <>
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
              <DropdownMenuRadioItem value="approved">{t("Approved")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="rejected">{t("Rejected")}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </>
        }
        columnsMenu={
          <TableColumnVisibilityMenu columns={resColumnDefs} columnVisible={columnVisible} setVisibility={setVisibility} onReset={resetVisibility} />
        }
        onRefresh={() => void load()}
        refreshing={loading}
        primaryAction={
          can("create-resignations") ? (
            <Button size="sm" className="gap-1" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t("Add Resignation")}
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
                  {columnVisible("notice") ? <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Notice Date")}</th> : null}
                  {columnVisible("resignation") ? <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Resignation Date")}</th> : null}
                  {columnVisible("reason") ? <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Reason")}</th> : null}
                  {columnVisible("status") ? <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Status")}</th> : null}
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
                        <LogOut className="h-10 w-10 text-gray-300" />
                        <div>{t("No resignations found")}</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr key={row.id} className="border-b hover:bg-muted/30">
                      {columnVisible("employee") ? <td className="px-4 py-3 font-medium">{empLabel(row)}</td> : null}
                      {columnVisible("notice") ? <td className="px-4 py-3">{fmtDate(row.noticeDate)}</td> : null}
                      {columnVisible("resignation") ? <td className="px-4 py-3">{fmtDate(row.resignationDate)}</td> : null}
                      {columnVisible("reason") ? (
                        <td className="max-w-48 truncate px-4 py-3 text-muted-foreground">{row.reason || "—"}</td>
                      ) : null}
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
                <LogOut className="h-10 w-10 text-gray-300" />
                <div>{t("No resignations found")}</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((row) => (
                  <Card key={row.id} className="border-border/60 shadow-sm">
                    <CardContent className="space-y-2 p-4">
                      {columnVisible("employee") ? <div className="font-semibold">{empLabel(row)}</div> : null}
                      {columnVisible("status") ? <div>{statusBadge(row.status)}</div> : null}
                      {columnVisible("notice") ? (
                        <p className="text-xs text-muted-foreground">
                          {t("Notice")}: {fmtDate(row.noticeDate)}
                        </p>
                      ) : null}
                      {columnVisible("resignation") ? (
                        <p className="text-xs text-muted-foreground">
                          {t("Resignation")}: {fmtDate(row.resignationDate)}
                        </p>
                      ) : null}
                      {columnVisible("reason") ? <p className="line-clamp-3 text-xs">{row.reason || "—"}</p> : null}
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
            <SheetTitle>{mode === "add" ? t("Add Resignation") : t("Edit Resignation")}</SheetTitle>
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
                  <Label>{t("Notice Date")}</Label>
                  <Input type="date" value={form.notice_date} onChange={(e) => setForm((p) => ({ ...p, notice_date: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("Resignation Date")}</Label>
                  <Input type="date" value={form.resignation_date} onChange={(e) => setForm((p) => ({ ...p, resignation_date: e.target.value }))} />
                </div>
              </div>
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
