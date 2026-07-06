"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import { Plus, Trash2, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TableActionButton } from "@/components/ui/table-action-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HrmProjectsStyleListPage, type HrmViewMode } from "@/components/hrm/hrm-projects-style-list";
import { TableColumnVisibilityMenu } from "@/components/ui/table-column-visibility-menu";
import { useTableColumnVisibility } from "@/hooks/use-table-column-visibility";
import { t } from "@/lib/admin-t";


type Row = {
  id: string;
  title: string;
  description?: string | null;
  startAt: string;
  endAt?: string | null;
  location?: string | null;
  isActive: boolean;
};

type EvCol = "title" | "when" | "location" | "status";

const EV_COL_DEFAULT: Record<EvCol, boolean> = {
  title: true,
  when: true,
  location: true,
  status: true,
};

const evColumnDefs: { id: EvCol; label: string }[] = [
  { id: "title", label: t("Title") },
  { id: "when", label: t("When") },
  { id: "location", label: t("Location") },
  { id: "status", label: t("Status") },
];

function toLocalDatetimeValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function HrmEventsAdmin({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-hrm");
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
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    title: "",
    description: "",
    start_at: "",
    end_at: "",
    location: "",
    is_active: true,
  });
  const [processing, setProcessing] = React.useState(false);
  const { columnVisible, setVisibility, resetVisibility } = useTableColumnVisibility<EvCol>("pf-hrm-events-cols-v1", EV_COL_DEFAULT);

  async function load(opts?: { nextPage?: number; nextPerPage?: number; nextSearch?: string }) {
    const p = opts?.nextPage ?? page;
    const pp = opts?.nextPerPage ?? perPage;
    const q = opts?.nextSearch !== undefined ? opts.nextSearch : search;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), per_page: String(pp) });
      if (q.trim()) params.set("search", q.trim());
      const res = await fetch(`/api/hrm/events?${params}`, { cache: "no-store", credentials: "include" });
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
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  function openCreate() {
    setMode("add");
    setEditId(null);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const startDefault = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setForm({
      title: "",
      description: "",
      start_at: startDefault,
      end_at: "",
      location: "",
      is_active: true,
    });
    setOpen(true);
  }

  function openEdit(row: Row) {
    setMode("edit");
    setEditId(row.id);
    setForm({
      title: row.title,
      description: row.description ?? "",
      start_at: toLocalDatetimeValue(row.startAt),
      end_at: toLocalDatetimeValue(row.endAt),
      location: row.location ?? "",
      is_active: row.isActive,
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setProcessing(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        title: form.title,
        description: form.description || null,
        start_at: new Date(form.start_at).toISOString(),
        end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
        location: form.location || null,
        is_active: form.is_active,
      };
      const url = mode === "add" ? "/api/hrm/events" : `/api/hrm/events/${editId}`;
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
    if (!(await appConfirm(t("Delete this event?")))) return;
    const res = await fetch(`/api/hrm/events/${id}`, { method: "DELETE", credentials: "include" });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error || "Delete failed");
      return;
    }
    await load();
  }

  function fmtShort(iso: string | null | undefined) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  }

  const statusPill = (active: boolean) => (
    <span className={`rounded-full px-2 py-1 text-xs ${active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
      {active ? t("Active") : t("Inactive")}
    </span>
  );

  const rowActions = (row: Row) =>
    can("manage-events") ? (
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
        searchPlaceholder={t("Search events...")}
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
          <TableColumnVisibilityMenu columns={evColumnDefs} columnVisible={columnVisible} setVisibility={setVisibility} onReset={resetVisibility} />
        }
        onRefresh={() => void load()}
        refreshing={loading}
        primaryAction={
          can("manage-events") ? (
            <Button size="sm" className="gap-1" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t("Add Event")}
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
                  {columnVisible("title") ? <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Title")}</th> : null}
                  {columnVisible("when") ? <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("When")}</th> : null}
                  {columnVisible("location") ? <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Location")}</th> : null}
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
                        <CalendarClock className="h-10 w-10 text-gray-300" />
                        <div>{t("No events yet")}</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr key={row.id} className="border-b hover:bg-muted/30">
                      {columnVisible("title") ? <td className="px-4 py-3 font-medium">{row.title}</td> : null}
                      {columnVisible("when") ? (
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {fmtShort(row.startAt)}
                          {row.endAt ? ` → ${fmtShort(row.endAt)}` : ""}
                        </td>
                      ) : null}
                      {columnVisible("location") ? (
                        <td className="max-w-[140px] truncate px-4 py-3 text-muted-foreground">{row.location || "—"}</td>
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
                <CalendarClock className="h-10 w-10 text-gray-300" />
                <div>{t("No events yet")}</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((row) => (
                  <Card key={row.id} className="border-border/60 shadow-sm">
                    <CardContent className="space-y-2 p-4">
                      {columnVisible("title") ? <div className="font-semibold">{row.title}</div> : null}
                      {columnVisible("when") ? (
                        <p className="text-xs text-muted-foreground">
                          {fmtShort(row.startAt)}
                          {row.endAt ? ` → ${fmtShort(row.endAt)}` : ""}
                        </p>
                      ) : null}
                      {columnVisible("location") ? <p className="text-xs">{row.location || "—"}</p> : null}
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
            <SheetTitle>{mode === "add" ? t("Add Event") : t("Edit Event")}</SheetTitle>
          </SheetHeader>
          <form onSubmit={save} className="flex flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <div className="space-y-2">
                <Label required>{t("Title")}</Label>
                <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>{t("Description")}</Label>
                <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} />
              </div>
              <div className="space-y-2">
                <Label required>{t("Start")}</Label>
                <Input type="datetime-local" value={form.start_at} onChange={(e) => setForm((p) => ({ ...p, start_at: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>{t("End")}</Label>
                <Input type="datetime-local" value={form.end_at} onChange={(e) => setForm((p) => ({ ...p, end_at: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t("Location")}</Label>
                <Input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
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
