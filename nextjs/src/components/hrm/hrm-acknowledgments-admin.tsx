"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import { Plus, Trash2, ClipboardSignature } from "lucide-react";
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
  policyTitle: string;
  acknowledgedAt: string;
  notes?: string | null;
  employee?: { id: string; firstName: string; lastName?: string | null } | null;
};
type OptionRow = { id: string; name: string };

type AckCol = "employee" | "policy" | "date" | "notes";

const ACK_COL_DEFAULT: Record<AckCol, boolean> = {
  employee: true,
  policy: true,
  date: true,
  notes: true,
};

const ackColumnDefs: { id: AckCol; label: string }[] = [
  { id: "employee", label: t("Employee") },
  { id: "policy", label: t("Policy / document") },
  { id: "date", label: t("Acknowledged") },
  { id: "notes", label: t("Notes") },
];

export default function HrmAcknowledgmentsAdmin({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-hrm");
  const { settings } = useAppSettings();
  const fmtDate = (d: string | Date | null | undefined) => formatDate(d, settings);
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
  const [employees, setEmployees] = React.useState<OptionRow[]>([]);
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    employee_id: "",
    policy_title: "",
    acknowledged_at: "",
    notes: "",
  });
  const [processing, setProcessing] = React.useState(false);
  const { columnVisible, setVisibility, resetVisibility } = useTableColumnVisibility<AckCol>("pf-hrm-acknowledgments-cols-v1", ACK_COL_DEFAULT);

  async function load(opts?: { nextPage?: number; nextPerPage?: number; nextSearch?: string }) {
    const p = opts?.nextPage ?? page;
    const pp = opts?.nextPerPage ?? perPage;
    const q = opts?.nextSearch !== undefined ? opts.nextSearch : search;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), per_page: String(pp) });
      if (q.trim()) params.set("search", q.trim());
      const res = await fetch(`/api/hrm/acknowledgments?${params}`, { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load");
      setItems(json.data ?? []);
      setTotal(json.total ?? 0);
      setPage(p);
      if (opts?.nextPerPage != null) setPerPage(pp);
      setLastPage(typeof json.last_page === "number" ? json.last_page : Math.max(1, Math.ceil((json.total ?? 0) / pp)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    fetch("/api/hrm/employees?per_page=200", { credentials: "include" })
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

  function openCreate() {
    setMode("add");
    setEditId(null);
    setForm({
      employee_id: "",
      policy_title: "",
      acknowledged_at: new Date().toISOString().slice(0, 10),
      notes: "",
    });
    setOpen(true);
  }

  function openEdit(row: Row) {
    setMode("edit");
    setEditId(row.id);
    setForm({
      employee_id: row.employee?.id ?? "",
      policy_title: row.policyTitle,
      acknowledged_at: new Date(row.acknowledgedAt).toISOString().slice(0, 10),
      notes: row.notes ?? "",
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setProcessing(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        policy_title: form.policy_title,
        acknowledged_at: form.acknowledged_at,
        notes: form.notes || null,
      };
      if (mode === "add") body.employee_id = form.employee_id;
      const url = mode === "add" ? "/api/hrm/acknowledgments" : `/api/hrm/acknowledgments/${editId}`;
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
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setProcessing(false);
    }
  }

  async function del(id: string) {
    if (!(await appConfirm(t("Delete this acknowledgment record?")))) return;
    const res = await fetch(`/api/hrm/acknowledgments/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError(j?.error || "Delete failed");
      return;
    }
    await load();
  }

  const empLabel = (row: Row) => (row.employee ? `${row.employee.firstName} ${row.employee.lastName ?? ""}`.trim() : "—");

  const rowActions = (row: Row) =>
    can("manage-acknowledgments") ? (
      <TableActionButton
        label={t("Edit")}
        onPrimaryClick={() => openEdit(row)}
        items={[
          { label: t("Edit"), onSelect: () => openEdit(row) },
          { label: t("Delete"), onSelect: () => del(row.id), destructive: true, icon: <Trash2 className="h-4 w-4" /> },
        ]}
      />
    ) : null;

  return (
    <div className="w-full min-w-0 space-y-4">
      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      ) : null}
      <HrmProjectsStyleListPage
        searchPlaceholder={t("Search by policy title...")}
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
          <TableColumnVisibilityMenu columns={ackColumnDefs} columnVisible={columnVisible} setVisibility={setVisibility} onReset={resetVisibility} />
        }
        onRefresh={() => void load()}
        refreshing={loading}
        primaryAction={
          can("manage-acknowledgments") ? (
            <Button size="sm" className="gap-1" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t("Add Acknowledgment")}
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
                  {columnVisible("policy") ? <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Policy / document")}</th> : null}
                  {columnVisible("date") ? <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Acknowledged")}</th> : null}
                  {columnVisible("notes") ? <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Notes")}</th> : null}
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      {t("Loading...")}
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ClipboardSignature className="h-10 w-10 text-gray-300" />
                        <div>{t("No acknowledgments yet")}</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr key={row.id} className="border-b hover:bg-muted/30">
                      {columnVisible("employee") ? <td className="px-4 py-3 font-medium">{empLabel(row)}</td> : null}
                      {columnVisible("policy") ? <td className="px-4 py-3">{row.policyTitle}</td> : null}
                      {columnVisible("date") ? <td className="px-4 py-3">{fmtDate(row.acknowledgedAt)}</td> : null}
                      {columnVisible("notes") ? (
                        <td className="max-w-40 truncate px-4 py-3 text-muted-foreground">{row.notes || "—"}</td>
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
                <ClipboardSignature className="h-10 w-10 text-gray-300" />
                <div>{t("No acknowledgments yet")}</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((row) => (
                  <Card key={row.id} className="border-border/60 shadow-sm">
                    <CardContent className="space-y-2 p-4">
                      {columnVisible("employee") ? <div className="text-xs text-muted-foreground">{empLabel(row)}</div> : null}
                      {columnVisible("policy") ? <div className="font-semibold">{row.policyTitle}</div> : null}
                      {columnVisible("date") ? <p className="text-xs">{fmtDate(row.acknowledgedAt)}</p> : null}
                      {columnVisible("notes") ? <p className="line-clamp-2 text-xs text-muted-foreground">{row.notes || "—"}</p> : null}
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
            <SheetTitle>{mode === "add" ? t("Add Acknowledgment") : t("Edit Acknowledgment")}</SheetTitle>
          </SheetHeader>
          <form onSubmit={save} className="flex flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {mode === "add" ? (
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
              ) : null}
              <div className="space-y-2">
                <Label required>{t("Policy / document title")}</Label>
                <Input value={form.policy_title} onChange={(e) => setForm((p) => ({ ...p, policy_title: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label required>{t("Acknowledgment date")}</Label>
                <Input type="date" value={form.acknowledged_at} onChange={(e) => setForm((p) => ({ ...p, acknowledged_at: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>{t("Notes")}</Label>
                <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3} />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t bg-background px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t("Cancel")}
              </Button>
              <Button type="submit" disabled={processing}>
                {processing ? t("Saving...") : mode === "add" ? t("Save") : t("Update")}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
