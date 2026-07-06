"use client";

import * as React from "react";
import { Plus, Search, Pencil, Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableActionButton } from "@/components/ui/table-action-button";
import { toast } from "sonner";
import { t } from "@/lib/admin-t";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";


type CategoryRow = { id: string; name: string; createdAt: string; _count?: { assets: number } };

export default function AssetsCategories({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-assets");

  const [items, setItems] = React.useState<CategoryRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [perPage] = React.useState(20);

  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [processing, setProcessing] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage), search });
      const res = await fetch(`/api/assets/categories?${params}`);
      const json = await res.json();
      setItems(json.data ?? []);
      setTotal(json.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search]);

  React.useEffect(() => { load(); }, [load]);

  function openAdd() { setMode("add"); setEditId(null); setName(""); setOpen(true); }
  function openEdit(row: CategoryRow) { setMode("edit"); setEditId(row.id); setName(row.name); setOpen(true); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name is required"); return; }
    setProcessing(true);
    try {
      const url = mode === "add" ? "/api/assets/categories" : `/api/assets/categories/${editId}`;
      const method = mode === "add" ? "POST" : "PUT";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
      toast.success(json.message ?? "Saved");
      setOpen(false); load();
    } finally {
      setProcessing(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/assets/categories/${deleteId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
      toast.success("Category deleted");
      setDeleteId(null); load();
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t("Search categories...")} className="pl-9 w-56" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        {can("create-asset-category") && (
          <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />{t("Add Category")}</Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">#</th>
                  <th className="text-left px-4 py-3 font-medium">{t("Name")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("Assets")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="text-center py-10 text-muted-foreground">{t("Loading...")}</td></tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2">
                        <Tag className="h-10 w-10 text-muted-foreground/40" />
                        <p className="text-muted-foreground">{t("No categories found")}</p>
                      </div>
                    </td>
                  </tr>
                ) : items.map((row, i) => (
                  <tr key={row.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{(page - 1) * perPage + i + 1}</td>
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3">{row._count?.assets ?? 0}</td>
                    <td className="px-4 py-3">
                      <TableActionButton label={t("Actions")} items={[
                        ...(can("edit-asset-category") ? [{ label: t("Edit"), icon: <Pencil className="h-4 w-4" />, onSelect: () => openEdit(row) }] : []),
                        ...(can("delete-asset-category") ? [{ label: t("Delete"), icon: <Trash2 className="h-4 w-4" />, onSelect: () => setDeleteId(row.id), destructive: true }] : []),
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">{t("Page")} {page} {t("of")} {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t("Previous")}</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>{t("Next")}</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{mode === "add" ? t("Add Category") : t("Edit Category")}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-1">
              <Label required>{t("Name")}</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder={t("Category name")} required />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={processing} className="flex-1">
                {processing ? t("Saving...") : mode === "add" ? t("Create") : t("Update")}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("Cancel")}</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete Category")}</AlertDialogTitle>
            <AlertDialogDescription>{t("This will permanently delete this category. Assets in this category will become uncategorized.")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteLoading ? t("Deleting...") : t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
