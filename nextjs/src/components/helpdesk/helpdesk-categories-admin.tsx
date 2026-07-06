"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import { ChevronDown, Plus, Search, Tag, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TableActionButton } from "@/components/ui/table-action-button";
import { cn } from "@/lib/utils";
import { t } from "@/lib/admin-t";

type CategoryRow = {
  id: string;
  name: string;
  description?: string;
  color: string;
  is_active: boolean;
  created_at?: string | null;
};

type CategoriesResponse = {
  ok: boolean;
  categories: {
    data: CategoryRow[];
    meta: { total: number; per_page: number; current_page: number; last_page: number };
  };
  message?: string;
};


function statusPill(active: boolean) {
  return (
    <span className={cn("px-2 py-1 rounded-full text-sm", active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800")}>
      {active ? t("Active") : t("Inactive")}
    </span>
  );
}

function sortChevron(active: boolean, dir: "asc" | "desc") {
  return <ChevronDown className={cn("h-3 w-3 ml-1 transition-transform", active && dir === "desc" ? "rotate-180" : "")} />;
}

export default function HelpdeskCategoriesAdmin({ permissions }: { permissions: string[] }) {
  const canCreate = permissions.includes("*") || permissions.includes("create-helpdesk-categories");
  const canEdit = permissions.includes("*") || permissions.includes("edit-helpdesk-categories");
  const canDelete = permissions.includes("*") || permissions.includes("delete-helpdesk-categories");

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [items, setItems] = React.useState<CategoryRow[]>([]);
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [total, setTotal] = React.useState(0);

  const [searchName, setSearchName] = React.useState("");
  const [sortField, setSortField] = React.useState("");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");

  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalMode, setModalMode] = React.useState<"add" | "edit">("add");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ name: "", description: "", color: "#3B82F6", is_active: true });
  const [processing, setProcessing] = React.useState(false);

  async function load(opts?: { nextPage?: number; nextPerPage?: number }) {
    const p = opts?.nextPage ?? page;
    const pp = opts?.nextPerPage ?? perPage;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("per_page", String(pp));
      if (searchName.trim()) params.set("name", searchName.trim());
      if (sortField) {
        params.set("sort", sortField);
        params.set("direction", sortDirection);
      }
      const res = await fetch(`/api/helpdesk-categories?${params.toString()}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as CategoriesResponse | null;
      if (!res.ok || !json?.ok) throw new Error((json as any)?.message || "Failed to load categories.");

      setItems(Array.isArray(json.categories?.data) ? json.categories.data : []);
      setPage(json.categories.meta.current_page);
      setPerPage(json.categories.meta.per_page);
      setTotal(json.categories.meta.total);
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load({ nextPage: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const onCreate = () => openCreate();
    window.addEventListener("pf:helpdesk-categories:create", onCreate as any);
    return () => window.removeEventListener("pf:helpdesk-categories:create", onCreate as any);
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  function apply() {
    setPage(1);
    void load({ nextPage: 1 });
  }

  function handleSort(field: string) {
    const dir = sortField === field && sortDirection === "asc" ? "desc" : "asc";
    setSortField(field);
    setSortDirection(dir);
    setPage(1);
    void load({ nextPage: 1 });
  }

  function openCreate() {
    setModalMode("add");
    setEditingId(null);
    setForm({ name: "", description: "", color: "#3B82F6", is_active: true });
    setModalOpen(true);
  }

  function openEdit(cat: CategoryRow) {
    setModalMode("edit");
    setEditingId(cat.id);
    setForm({ name: cat.name, description: cat.description ?? "", color: cat.color ?? "#3B82F6", is_active: Boolean(cat.is_active) });
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (modalMode === "add" && !canCreate) return;
    if (modalMode === "edit" && !canEdit) return;
    setProcessing(true);
    setError(null);
    try {
      const res = await fetch(modalMode === "add" ? "/api/helpdesk-categories" : `/api/helpdesk-categories/${String(editingId)}`, {
        method: modalMode === "add" ? "POST" : "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok || !json?.ok) throw new Error(json?.message || "Save failed.");
      setModalOpen(false);
      await load();
    } catch (e: any) {
      setError(e?.message || "Save failed.");
    } finally {
      setProcessing(false);
    }
  }

  async function remove(id: string) {
    if (!canDelete) return;
    if (!(await appConfirm(t("Are you sure you want to delete this Helpdesk category?")))) return;
    const res = await fetch(`/api/helpdesk-categories/${id}`, { method: "DELETE" });
    const json = (await res.json().catch(() => null)) as any;
    if (!res.ok || !json?.ok) {
      setError(json?.message || "Delete failed.");
      return;
    }
    await load();
  }

  function gotoPage(next: number) {
    const clamped = Math.max(1, Math.min(totalPages, next));
    setPage(clamped);
    void load({ nextPage: clamped });
  }

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}

      <Card className="shadow-sm">
        <CardContent className="p-6 border-b bg-gray-50/50">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1 max-w-md min-w-[280px]">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    placeholder={t("Search categories...")}
                    className="pl-9"
                  />
                </div>
                <Button type="button" onClick={apply}>
                  {t("Search")}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                value={String(perPage)}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10) || 10;
                  setPerPage(v);
                  setPage(1);
                  void load({ nextPage: 1, nextPerPage: v });
                }}
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={String(n)}>
                    {n} {t("per page")}
                  </option>
                ))}
              </select>

              {canCreate ? (
                <Button size="sm" onClick={openCreate} aria-label={t("Create")}>
                  <Plus className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr className="border-b">
                  <th className="text-left font-medium px-4 py-3">
                    <button type="button" className="inline-flex items-center hover:text-foreground" onClick={() => handleSort("name")}>
                      {t("Name")}
                      {sortChevron(sortField === "name", sortDirection)}
                    </button>
                  </th>
                  <th className="text-left font-medium px-4 py-3">{t("Description")}</th>
                  <th className="text-left font-medium px-4 py-3">{t("Color")}</th>
                  <th className="text-left font-medium px-4 py-3">
                    <button type="button" className="inline-flex items-center hover:text-foreground" onClick={() => handleSort("is_active")}>
                      {t("Status")}
                      {sortChevron(sortField === "is_active", sortDirection)}
                    </button>
                  </th>
                  <th className="text-right font-medium px-4 py-3">{t("Actions")}</th>
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
                    <td colSpan={5} className="px-4 py-12">
                      <div className="mx-auto max-w-sm text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                          <Tag className="h-8 w-8 text-gray-400" />
                        </div>
                        <div className="font-medium">{t("No categories found")}</div>
                        <div className="text-sm text-muted-foreground mt-1">{t("Get started by creating your first category.")}</div>
                        {canCreate ? (
                          <div className="mt-4 flex justify-center">
                            <Button onClick={openCreate}>
                              <Plus className="h-4 w-4 mr-2" />
                              {t("Create Category")}
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((c) => (
                    <tr key={c.id} className="border-b hover:bg-accent/20">
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.description || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: c.color }} />
                          <span className="text-xs text-muted-foreground">{c.color}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{statusPill(Boolean(c.is_active))}</td>
                      <td className="px-4 py-3 text-right">
                        {canEdit || canDelete ? (
                          <TableActionButton
                            label={canEdit ? t("Edit") : t("Actions")}
                            onPrimaryClick={canEdit ? () => openEdit(c) : undefined}
                            disabled={!canEdit}
                            items={[
                              { label: t("Edit"), onSelect: () => openEdit(c), disabled: !canEdit },
                              { label: t("Delete"), onSelect: () => remove(c.id), disabled: !canDelete, destructive: true, icon: <Trash2 className="h-4 w-4" /> },
                            ]}
                          />
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>

        <CardContent className="px-4 py-2 border-t bg-gray-50/30">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-muted-foreground">
              {t("Showing")} {from} {t("to")} {to} {t("of")} {total} {t("results")}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => gotoPage(page - 1)} disabled={page <= 1}>
                {t("Previous")}
              </Button>
              <Button type="button" variant="secondary" size="sm" className="min-w-9" disabled>
                {page}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => gotoPage(page + 1)} disabled={page >= totalPages}>
                {t("Next")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{modalMode === "add" ? t("Create Helpdesk Category") : t("Edit Helpdesk Category")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("Name")}</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>{t("Description")}</Label>
              <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("Color")}</Label>
                <Input type="color" value={form.color} onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))} />
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
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                {t("Cancel")}
              </Button>
              <Button type="submit" disabled={processing || (modalMode === "add" ? !canCreate : !canEdit)}>
                {processing ? (modalMode === "add" ? t("Creating...") : t("Updating...")) : modalMode === "add" ? t("Create") : t("Update")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

