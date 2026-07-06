"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import { Plus, Trash2, CalendarDays } from "lucide-react";
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


type HolidayRow = { id: string; name: string; date: string; description?: string | null; isActive: boolean };
type HolColId = "name" | "date" | "description" | "status";

const HOL_COL_DEFAULT: Record<HolColId, boolean> = {
  name: true,
  date: true,
  description: true,
  status: true,
};

const holColumnDefs: { id: HolColId; label: string }[] = [
  { id: "name", label: t("Name") },
  { id: "date", label: t("Date") },
  { id: "description", label: t("Description") },
  { id: "status", label: t("Status") },
];

export default function HrmHolidaysAdmin({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-hrm");
  const { settings } = useAppSettings();
  const fmt = (d: string | Date | null | undefined) => formatDate(d, settings);
  const [items, setItems] = React.useState<HolidayRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [lastPage, setLastPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [searchInput, setSearchInput] = React.useState("");
  const [year, setYear] = React.useState(String(new Date().getFullYear()));
  const [viewMode, setViewMode] = React.useState<HrmViewMode>("list");
  const [perPage, setPerPage] = React.useState(10);
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ name: "", date: "", description: "", is_active: true });
  const [processing, setProcessing] = React.useState(false);
  const { columnVisible, setVisibility, resetVisibility } = useTableColumnVisibility<HolColId>(
    "pf-hrm-holidays-admin-cols-v1",
    HOL_COL_DEFAULT,
  );

  async function load(opts?: { nextPage?: number; nextPerPage?: number; nextSearch?: string; nextYear?: string }) {
    const p = opts?.nextPage ?? page;
    const pp = opts?.nextPerPage ?? perPage;
    const q = opts?.nextSearch !== undefined ? opts.nextSearch : search;
    const y = opts?.nextYear ?? year;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), per_page: String(pp) });
      if (q.trim()) params.set("search", q.trim());
      if (y) params.set("year", y);
      const res = await fetch(`/api/hrm/holidays?${params}`, { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load");
      setItems(json.data ?? []);
      setTotal(json.total ?? 0);
      setPage(p);
      if (opts?.nextPerPage != null) setPerPage(pp);
      if (opts?.nextYear != null) setYear(y);
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
  const yearOptions = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - 1 + i));

  function openCreate() {
    setMode("add");
    setEditId(null);
    setForm({ name: "", date: "", description: "", is_active: true });
    setOpen(true);
  }
  function openEdit(row: HolidayRow) {
    setMode("edit");
    setEditId(row.id);
    setForm({
      name: row.name,
      date: row.date ? new Date(row.date).toISOString().slice(0, 10) : "",
      description: row.description ?? "",
      is_active: row.isActive,
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setProcessing(true);
    setError(null);
    try {
      const body = { name: form.name, date: form.date, description: form.description || null, is_active: form.is_active };
      const url = mode === "add" ? "/api/hrm/holidays" : `/api/hrm/holidays/${editId}`;
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
    if (!(await appConfirm(t("Delete this holiday?")))) return;
    const res = await fetch(`/api/hrm/holidays/${id}`, { method: "DELETE", credentials: "include" });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error || "Delete failed");
      return;
    }
    await load();
  }

  const statusPill = (active: boolean) => (
    <span className={`rounded-full px-2 py-1 text-xs ${active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
      {active ? t("Active") : t("Inactive")}
    </span>
  );

  const rowActions = (row: HolidayRow) =>
    can("edit-holidays") || can("delete-holidays") ? (
      <TableActionButton
        label={t("Edit")}
        onPrimaryClick={can("edit-holidays") ? () => openEdit(row) : undefined}
        items={[
          { label: t("Edit"), onSelect: () => openEdit(row), disabled: !can("edit-holidays") },
          { label: t("Delete"), onSelect: () => del(row.id), disabled: !can("delete-holidays"), destructive: true, icon: <Trash2 className="h-4 w-4" /> },
        ]}
      />
    ) : null;

  return (
    <div className="w-full min-w-0 space-y-4">
      {error ? <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
      <HrmProjectsStyleListPage
        searchPlaceholder={t("Search holidays...")}
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
        activeFilterCount={0}
        filtersMenuContent={
          <>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{t("Year")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={year}
              onValueChange={(v) => {
                setYear(v);
                void load({ nextPage: 1, nextYear: v });
              }}
            >
              {yearOptions.map((y) => (
                <DropdownMenuRadioItem key={y} value={y}>
                  {y}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </>
        }
        columnsMenu={
          <TableColumnVisibilityMenu columns={holColumnDefs} columnVisible={columnVisible} setVisibility={setVisibility} onReset={resetVisibility} />
        }
        onRefresh={() => void load()}
        refreshing={loading}
        primaryAction={
          can("create-holidays") ? (
            <Button size="sm" className="gap-1" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t("Add Holiday")}
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
                  {columnVisible("name") ? <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Name")}</th> : null}
                  {columnVisible("date") ? <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Date")}</th> : null}
                  {columnVisible("description") ? <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Description")}</th> : null}
                  {columnVisible("status") ? <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Status")}</th> : null}
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
                        <CalendarDays className="h-10 w-10 text-gray-300" />
                        <div>{t("No holidays found")}</div>
                        {can("create-holidays") ? (
                          <Button size="sm" onClick={openCreate}>
                            <Plus className="h-4 w-4 mr-1" />
                            {t("Add Holiday")}
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr key={row.id} className="border-b hover:bg-muted/30">
                      {columnVisible("name") ? <td className="px-4 py-3 font-medium">{row.name}</td> : null}
                      {columnVisible("date") ? <td className="px-4 py-3">{fmt(row.date)}</td> : null}
                      {columnVisible("description") ? (
                        <td className="px-4 py-3 text-muted-foreground">{row.description || "—"}</td>
                      ) : null}
                      {columnVisible("status") ? <td className="px-4 py-3">{statusPill(row.isActive)}</td> : null}
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
                <CalendarDays className="h-10 w-10 text-gray-300" />
                <div>{t("No holidays found")}</div>
                {can("create-holidays") ? (
                  <Button size="sm" onClick={openCreate}>
                    <Plus className="h-4 w-4 mr-1" />
                    {t("Add Holiday")}
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((row) => (
                  <Card key={row.id} className="border-border/60 shadow-sm">
                    <CardContent className="space-y-2 p-4">
                      {columnVisible("name") ? <div className="font-semibold">{row.name}</div> : null}
                      {columnVisible("date") ? <p className="text-sm text-muted-foreground">{fmt(row.date)}</p> : null}
                      {columnVisible("description") ? (
                        <p className="text-xs text-muted-foreground line-clamp-3">{row.description || "—"}</p>
                      ) : null}
                      {columnVisible("status") ? <div>{statusPill(row.isActive)}</div> : null}
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
            <SheetTitle>{mode === "add" ? t("Add Holiday") : t("Edit Holiday")}</SheetTitle>
          </SheetHeader>
          <form onSubmit={save} className="flex flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <div className="space-y-2">
                <Label required>{t("Name")}</Label>
                <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label required>{t("Date")}</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>{t("Description")}</Label>
                <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>{t("Status")}</Label>
                <Select value={form.is_active ? "1" : "0"} onValueChange={(v) => setForm((p) => ({ ...p, is_active: v === "1" }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{t("Active")}</SelectItem>
                    <SelectItem value="0">{t("Inactive")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t bg-background px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t("Cancel")}
              </Button>
              <Button type="submit" disabled={processing}>
                {processing ? t("Saving...") : mode === "add" ? t("Create") : t("Update")}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
