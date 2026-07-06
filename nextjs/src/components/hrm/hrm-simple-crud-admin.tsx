"use client";

import { appConfirm } from "@/lib/app-confirm";
import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TableActionButton } from "@/components/ui/table-action-button";
import { TableColumnVisibilityMenu } from "@/components/ui/table-column-visibility-menu";
import { useTableColumnVisibility } from "@/hooks/use-table-column-visibility";
import { HrmProjectsStyleListPage, type HrmViewMode } from "@/components/hrm/hrm-projects-style-list";
import { t } from "@/lib/admin-t";


type SimpleRow = { id: string; name: string; description?: string | null; createdAt?: string | null };

type ColId = "name" | "description";

const DEFAULT_COLS: Record<ColId, boolean> = { name: true, description: true };

function useSimpleCrud(apiPath: string) {
  const [items, setItems] = React.useState<SimpleRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [lastPage, setLastPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  async function load(opts?: { nextPage?: number; q?: string; nextPerPage?: number }) {
    const p = opts?.nextPage ?? page;
    const q = opts?.q !== undefined ? opts.q : search;
    const pp = opts?.nextPerPage ?? perPage;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), per_page: String(pp) });
      if (q.trim()) params.set("search", q.trim());
      const res = await fetch(`${apiPath}?${params}`, { cache: "no-store", credentials: "include" });
      const json = (await res.json().catch(() => null)) as
        | { data?: SimpleRow[]; total?: number; last_page?: number; error?: string; message?: string }
        | null;
      if (!res.ok) {
        const msg =
          (typeof json?.error === "string" && json.error) ||
          (typeof json?.message === "string" && json.message) ||
          res.statusText ||
          `HTTP ${res.status}`;
        throw new Error(msg || "Failed to load");
      }
      setItems(json?.data ?? []);
      setTotal(json?.total ?? 0);
      setPage(p);
      if (opts?.nextPerPage != null) setPerPage(pp);
      const lp =
        typeof json?.last_page === "number"
          ? json.last_page
          : Math.max(1, Math.ceil((json?.total ?? 0) / pp) || 1);
      setLastPage(lp);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function create(body: Record<string, unknown>) {
    const res = await fetch(apiPath, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(typeof json?.error === "string" ? json.error : "Create failed");
    await load();
  }

  async function update(id: string, body: Record<string, unknown>) {
    const res = await fetch(`${apiPath}/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(typeof json?.error === "string" ? json.error : "Update failed");
    await load();
  }

  async function remove(id: string) {
    const res = await fetch(`${apiPath}/${id}`, { method: "DELETE", credentials: "include" });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(typeof json?.error === "string" ? json.error : "Delete failed");
    await load();
  }

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  return {
    items,
    total,
    page,
    perPage,
    setPerPage,
    lastPage,
    from,
    to,
    loading,
    error,
    setError,
    search,
    setSearch,
    load,
    create,
    update,
    remove,
  };
}

export function HrmSimpleCrudAdmin({
  apiPath,
  label,
  icon,
  canCreate,
  canEdit,
  canDelete,
  columnStorageKey,
}: {
  apiPath: string;
  label: string;
  icon: React.ReactNode;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  /** Unique key for persisted column visibility (default derived from apiPath). */
  columnStorageKey?: string;
}) {
  const colKey = columnStorageKey ?? `pf-hrm-simple-${apiPath.replace(/\//g, "-")}-cols-v1`;
  const { columnVisible, setVisibility, resetVisibility } = useTableColumnVisibility<ColId>(colKey, DEFAULT_COLS);
  const columnDefs = React.useMemo(
    () => [
      { id: "name" as const, label: t("Name") },
      { id: "description" as const, label: t("Description") },
    ],
    [],
  );

  const crud = useSimpleCrud(apiPath);
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ name: "", description: "" });
  const [processing, setProcessing] = React.useState(false);
  const [searchInput, setSearchInput] = React.useState("");
  const [viewMode, setViewMode] = React.useState<HrmViewMode>("list");

  React.useEffect(() => {
    void crud.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    setSearchInput(crud.search);
  }, [crud.search]);

  function openCreate() {
    setMode("add");
    setEditId(null);
    setForm({ name: "", description: "" });
    crud.setError(null);
    setOpen(true);
  }

  function openEdit(row: SimpleRow) {
    setMode("edit");
    setEditId(row.id);
    setForm({ name: row.name, description: row.description ?? "" });
    crud.setError(null);
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      crud.setError(t("Name is required."));
      return;
    }
    if (name.length > 255) {
      crud.setError(t("Name must be at most 255 characters."));
      return;
    }
    const desc = form.description.trim();
    if (desc.length > 2000) {
      crud.setError(t("Description is too long (max 2000 characters)."));
      return;
    }
    setProcessing(true);
    crud.setError(null);
    try {
      if (mode === "add") await crud.create({ name, description: desc || null });
      else await crud.update(editId!, { name, description: desc || null });
      setOpen(false);
    } catch (err: unknown) {
      crud.setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setProcessing(false);
    }
  }

  async function del(id: string) {
    if (!(await appConfirm(t(`Delete this ${label}?`)))) return;
    try {
      await crud.remove(id);
    } catch (err: unknown) {
      crud.setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const handleSearch = () => {
    crud.setSearch(searchInput);
    void crud.load({ nextPage: 1, q: searchInput });
  };

  const handlePerPage = (n: number) => {
    void crud.load({ nextPage: 1, nextPerPage: n, q: crud.search });
  };

  const tableBody = () => {
    if (crud.loading) {
      return (
        <tr>
          <td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">
            {t("Loading...")}
          </td>
        </tr>
      );
    }
    if (crud.items.length === 0) {
      return (
        <tr>
          <td colSpan={3} className="px-4 py-12 text-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">{icon}</div>
              <div className="font-medium">{t(`No ${label.toLowerCase()} found`)}</div>
              {canCreate ? (
                <Button size="sm" onClick={openCreate} className="mt-2">
                  <Plus className="mr-1 h-4 w-4" />
                  {t(`Add ${label}`)}
                </Button>
              ) : null}
            </div>
          </td>
        </tr>
      );
    }
    return crud.items.map((row) => (
      <tr key={row.id} className="border-b hover:bg-muted/30">
        {columnVisible("name") ? (
          <td className="px-4 py-3 font-medium">{row.name}</td>
        ) : null}
        {columnVisible("description") ? (
          <td className="px-4 py-3 text-muted-foreground">{row.description || "—"}</td>
        ) : null}
        <td className="px-4 py-3 text-right">
          {(canEdit || canDelete) && (
            <TableActionButton
              label={t("Edit")}
              onPrimaryClick={canEdit ? () => openEdit(row) : undefined}
              items={[
                { label: t("Edit"), onSelect: () => openEdit(row), disabled: !canEdit },
                {
                  label: t("Delete"),
                  onSelect: () => del(row.id),
                  disabled: !canDelete,
                  destructive: true,
                  icon: <Trash2 className="h-4 w-4" />,
                },
              ]}
            />
          )}
        </td>
      </tr>
    ));
  };

  const visibleCount = (columnVisible("name") ? 1 : 0) + (columnVisible("description") ? 1 : 0) + (canEdit || canDelete ? 1 : 0);

  return (
    <div className="w-full min-w-0 space-y-4">
      {crud.error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{crud.error}</div>
      ) : null}
      <HrmProjectsStyleListPage
        searchPlaceholder={t(`Search ${label.toLowerCase()}...`)}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearchSubmit={handleSearch}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        perPage={crud.perPage}
        onPerPageChange={handlePerPage}
        columnsMenu={
          <TableColumnVisibilityMenu
            columns={columnDefs}
            columnVisible={columnVisible}
            setVisibility={setVisibility}
            onReset={resetVisibility}
          />
        }
        onRefresh={() => void crud.load()}
        refreshing={crud.loading}
        primaryAction={
          canCreate ? (
            <Button size="sm" className="gap-1" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t("Add")}
            </Button>
          ) : undefined
        }
        page={crud.page}
        lastPage={crud.lastPage}
        total={crud.total}
        from={crud.from}
        to={crud.to}
        onPageChange={(p) => void crud.load({ nextPage: p })}
      >
        {viewMode === "list" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {columnVisible("name") ? (
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Name")}</th>
                  ) : null}
                  {columnVisible("description") ? (
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Description")}</th>
                  ) : null}
                  {(canEdit || canDelete) && <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t("Actions")}</th>}
                </tr>
              </thead>
              <tbody>{tableBody()}</tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 sm:p-6">
            {crud.loading ? (
              <div className="py-12 text-center text-muted-foreground">{t("Loading...")}</div>
            ) : crud.items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">{icon}</div>
                <div className="font-medium">{t(`No ${label.toLowerCase()} found`)}</div>
                {canCreate ? (
                  <Button size="sm" onClick={openCreate}>
                    <Plus className="mr-1 h-4 w-4" />
                    {t(`Add ${label}`)}
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {crud.items.map((row) => (
                  <Card key={row.id} className="border-border/60 shadow-sm">
                    <CardContent className="space-y-3 p-4">
                      {columnVisible("name") ? <div className="font-semibold">{row.name}</div> : null}
                      {columnVisible("description") ? (
                        <p className="text-sm text-muted-foreground">{row.description || "—"}</p>
                      ) : null}
                      {(canEdit || canDelete) && (
                        <div className="flex justify-end border-t pt-3">
                          <TableActionButton
                            label={t("Edit")}
                            onPrimaryClick={canEdit ? () => openEdit(row) : undefined}
                            items={[
                              { label: t("Edit"), onSelect: () => openEdit(row), disabled: !canEdit },
                              {
                                label: t("Delete"),
                                onSelect: () => del(row.id),
                                disabled: !canDelete,
                                destructive: true,
                                icon: <Trash2 className="h-4 w-4" />,
                              },
                            ]}
                          />
                        </div>
                      )}
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
            <SheetTitle>{mode === "add" ? t(`Add ${label}`) : t(`Edit ${label}`)}</SheetTitle>
          </SheetHeader>
          <form onSubmit={save} className="flex flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <div className="space-y-2">
                <Label required>{t("Name")}</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                  maxLength={255}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("Description")}</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  maxLength={2000}
                />
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
