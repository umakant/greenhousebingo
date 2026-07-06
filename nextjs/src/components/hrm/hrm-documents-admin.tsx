"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import { Plus, Trash2, FileText } from "lucide-react";
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
  documentName: string;
  documentType?: string | null;
  fileUrl?: string | null;
  expiryDate?: string | null;
  description?: string | null;
  employee?: { id: string; firstName: string; lastName?: string | null } | null;
};
type OptionRow = { id: string; name: string };
type DCol = "employee" | "name" | "type" | "expiry";

const D_COL_DEFAULT: Record<DCol, boolean> = {
  employee: true,
  name: true,
  type: true,
  expiry: true,
};

const dColumnDefs: { id: DCol; label: string }[] = [
  { id: "employee", label: t("Employee") },
  { id: "name", label: t("Document Name") },
  { id: "type", label: t("Type") },
  { id: "expiry", label: t("Expiry") },
];

const DOC_TYPES = ["passport", "national_id", "driving_license", "contract", "certificate", "degree", "other"];

export default function HrmDocumentsAdmin({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-hrm");
  const { settings } = useAppSettings();
  const fmtDate = (d: string | Date | null | undefined) => formatDate(d, settings);
  const [items, setItems] = React.useState<Row[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [lastPage, setLastPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [searchInput, setSearchInput] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [viewMode, setViewMode] = React.useState<HrmViewMode>("list");
  const [perPage, setPerPage] = React.useState(10);
  const [employees, setEmployees] = React.useState<OptionRow[]>([]);
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ employee_id: "", document_name: "", document_type: "", file_url: "", description: "", expiry_date: "" });
  const [processing, setProcessing] = React.useState(false);
  const { columnVisible, setVisibility, resetVisibility } = useTableColumnVisibility<DCol>("pf-hrm-documents-cols-v1", D_COL_DEFAULT);

  async function load(opts?: { nextPage?: number; nextPerPage?: number; nextSearch?: string; nextType?: string }) {
    const p = opts?.nextPage ?? page;
    const pp = opts?.nextPerPage ?? perPage;
    const q = opts?.nextSearch !== undefined ? opts.nextSearch : search;
    const tf = opts?.nextType ?? typeFilter;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), per_page: String(pp) });
      if (tf !== "all") params.set("document_type", tf);
      if (q.trim()) params.set("search", q.trim());
      const res = await fetch(`/api/hrm/documents?${params}`, { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      setItems(json.data ?? []);
      setTotal(json.total ?? 0);
      setPage(p);
      if (opts?.nextPerPage != null) setPerPage(pp);
      if (opts?.nextType != null) setTypeFilter(tf);
      if (opts?.nextSearch !== undefined) setSearch(q);
      setLastPage(typeof json.last_page === "number" ? json.last_page : Math.max(1, Math.ceil((json.total ?? 0) / pp)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
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
  const activeFilterCount = typeFilter !== "all" ? 1 : 0;

  function openCreate() {
    setMode("add");
    setEditId(null);
    setForm({ employee_id: "", document_name: "", document_type: "", file_url: "", description: "", expiry_date: "" });
    setOpen(true);
  }
  function openEdit(row: Row) {
    setMode("edit");
    setEditId(row.id);
    setForm({
      employee_id: row.employee?.id ?? "",
      document_name: row.documentName,
      document_type: row.documentType ?? "",
      file_url: row.fileUrl ?? "",
      description: row.description ?? "",
      expiry_date: row.expiryDate ? new Date(row.expiryDate).toISOString().slice(0, 10) : "",
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setProcessing(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        document_name: form.document_name,
        document_type: form.document_type || null,
        file_path: form.file_url || null,
        description: form.description || null,
        expiry_date: form.expiry_date || null,
      };
      if (mode === "add") body.employee_id = form.employee_id;
      const url = mode === "add" ? "/api/hrm/documents" : `/api/hrm/documents/${editId}`;
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
    if (!(await appConfirm(t("Delete this document?")))) return;
    const res = await fetch(`/api/hrm/documents/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError(j?.error || "Delete failed");
      return;
    }
    await load();
  }

  const empLabel = (row: Row) => (row.employee ? `${row.employee.firstName} ${row.employee.lastName ?? ""}`.trim() : "—");

  const rowActions = (row: Row) =>
    can("edit-documents") || can("delete-documents") ? (
      <TableActionButton
        label={t("Edit")}
        onPrimaryClick={can("edit-documents") ? () => openEdit(row) : undefined}
        items={[
          { label: t("Edit"), onSelect: () => openEdit(row), disabled: !can("edit-documents") },
          { label: t("Delete"), onSelect: () => del(row.id), disabled: !can("delete-documents"), destructive: true, icon: <Trash2 className="h-4 w-4" /> },
        ]}
      />
    ) : null;

  return (
    <div className="w-full min-w-0 space-y-4">
      {error ? <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
      <HrmProjectsStyleListPage
        searchPlaceholder={t("Search documents...")}
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
        activeFilterCount={activeFilterCount}
        filtersMenuContent={
          <>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{t("Document type")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v);
                void load({ nextPage: 1, nextType: v });
              }}
            >
              <DropdownMenuRadioItem value="all">{t("All Types")}</DropdownMenuRadioItem>
              {DOC_TYPES.map((dt) => (
                <DropdownMenuRadioItem key={dt} value={dt}>
                  {dt.replace("_", " ")}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </>
        }
        columnsMenu={
          <TableColumnVisibilityMenu columns={dColumnDefs} columnVisible={columnVisible} setVisibility={setVisibility} onReset={resetVisibility} />
        }
        onRefresh={() => void load()}
        refreshing={loading}
        primaryAction={
          can("create-documents") ? (
            <Button size="sm" className="gap-1" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t("Add Document")}
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
                  {columnVisible("name") ? <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Document Name")}</th> : null}
                  {columnVisible("type") ? <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Type")}</th> : null}
                  {columnVisible("expiry") ? <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Expiry")}</th> : null}
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
                        <FileText className="h-10 w-10 text-gray-300" />
                        <div>{t("No documents found")}</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr key={row.id} className="border-b hover:bg-muted/30">
                      {columnVisible("employee") ? <td className="px-4 py-3 font-medium">{empLabel(row)}</td> : null}
                      {columnVisible("name") ? (
                        <td className="px-4 py-3">
                          {row.documentName}
                          {row.fileUrl ? (
                            <a href={row.fileUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs text-primary underline">
                              {t("View")}
                            </a>
                          ) : null}
                        </td>
                      ) : null}
                      {columnVisible("type") ? (
                        <td className="px-4 py-3 text-muted-foreground">{row.documentType?.replace("_", " ") || "—"}</td>
                      ) : null}
                      {columnVisible("expiry") ? <td className="px-4 py-3">{fmtDate(row.expiryDate)}</td> : null}
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
                <FileText className="h-10 w-10 text-gray-300" />
                <div>{t("No documents found")}</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((row) => (
                  <Card key={row.id} className="border-border/60 shadow-sm">
                    <CardContent className="space-y-2 p-4">
                      {columnVisible("employee") ? <div className="text-xs text-muted-foreground">{empLabel(row)}</div> : null}
                      {columnVisible("name") ? <div className="font-semibold">{row.documentName}</div> : null}
                      {columnVisible("type") ? <p className="text-xs text-muted-foreground">{row.documentType?.replace("_", " ") || "—"}</p> : null}
                      {columnVisible("expiry") ? <p className="text-xs">{fmtDate(row.expiryDate)}</p> : null}
                      {row.fileUrl ? (
                        <a href={row.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
                          {t("View")}
                        </a>
                      ) : null}
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
            <SheetTitle>{mode === "add" ? t("Add Document") : t("Edit Document")}</SheetTitle>
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
                  <Label required>{t("Document Name")}</Label>
                  <Input value={form.document_name} onChange={(e) => setForm((p) => ({ ...p, document_name: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>{t("Document Type")}</Label>
                  <Select value={form.document_type || "__none__"} onValueChange={(v) => setForm((p) => ({ ...p, document_type: v === "__none__" ? "" : v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("Select type...")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t("None")}</SelectItem>
                      {DOC_TYPES.map((dt) => (
                        <SelectItem key={dt} value={dt}>
                          {dt.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("File URL")}</Label>
                  <Input value={form.file_url} onChange={(e) => setForm((p) => ({ ...p, file_url: e.target.value }))} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label>{t("Expiry Date")}</Label>
                  <Input type="date" value={form.expiry_date} onChange={(e) => setForm((p) => ({ ...p, expiry_date: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("Description")}</Label>
                <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t bg-background px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t("Cancel")}
              </Button>
              <Button type="submit" disabled={processing}>
                {processing ? t("Saving...") : mode === "add" ? t("Add Document") : t("Update")}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
