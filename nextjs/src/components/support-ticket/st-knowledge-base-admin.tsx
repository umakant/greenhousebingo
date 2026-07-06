"use client";

import * as React from "react";
import { Plus, Search, BookOpen, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TableActionButton } from "@/components/ui/table-action-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import { t } from "@/lib/admin-t";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";


type Category = { id: string; name: string };
type KbRow = { id: string; title: string; description?: string | null; createdAt: string; category?: Category | null };

const emptyForm = { title: "", category_id: "__none__", description: "" };

export default function StKnowledgeBaseAdmin({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-support-ticket");

  const { settings } = useAppSettings();
  const fmtDate = (d: string | null | undefined) => fmtDateLib(d, settings);
  const [items, setItems] = React.useState<KbRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [perPage] = React.useState(10);
  const [categories, setCategories] = React.useState<Category[]>([]);

  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/support-ticket/kb-categories")
      .then(r => r.json()).then(d => setCategories(d.data ?? [])).catch(() => {});
    void load();
  }, []); // eslint-disable-line

  async function load(opts?: { p?: number; s?: string }) {
    const p = opts?.p ?? page;
    const s = opts?.s ?? search;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), per_page: String(perPage) });
      if (s) params.set("search", s);
      const res = await fetch(`/api/support-ticket/knowledge-base?${params}`);
      const data = await res.json();
      setItems(data.data ?? []);
      setTotal(data.total ?? 0);
      setPage(p);
    } catch {
      toast.error("Failed to load knowledge base");
    } finally {
      setLoading(false);
    }
  }

  function openAdd() { setMode("add"); setEditId(null); setForm(emptyForm); setOpen(true); }
  function openEdit(row: KbRow) {
    setMode("edit"); setEditId(row.id);
    setForm({ title: row.title, category_id: row.category?.id ? String(row.category.id) : "__none__", description: row.description ?? "" });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.title) { toast.error("Title is required"); return; }
    setProcessing(true);
    try {
      const body = { ...form, category_id: form.category_id === "__none__" ? null : form.category_id };
      const res = mode === "add"
        ? await fetch("/api/support-ticket/knowledge-base", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
        : await fetch(`/api/support-ticket/knowledge-base/${editId}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
      toast.success(json.message ?? "Saved");
      setOpen(false); void load();
    } finally { setProcessing(false); }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/support-ticket/knowledge-base/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
      toast.success(json.message ?? "Deleted"); void load();
    } catch { toast.error("Failed to delete"); } finally { setDeleteId(null); }
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t("Manage Knowledge Base")}</h2>
        {can("create-knowledge-base") && (
          <Button onClick={openAdd} size="sm"><Plus className="h-4 w-4 mr-1.5" /> {t("Add")}</Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t("Search knowledge base...")} value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && load({ p: 1, s: search })}
                className="pl-9" />
            </div>
            <Button onClick={() => load({ p: 1, s: search })} size="sm">{t("Search")}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">{t("Title")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("Category")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("Description")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("Created")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">{t("Loading...")}</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">{t("No knowledge base entries found")}</p>
                  </td></tr>
                ) : items.map(row => (
                  <tr key={row.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium max-w-[200px]">{row.title}</td>
                    <td className="px-4 py-3">{row.category?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[300px] truncate">
                      {row.description ? row.description.replace(/<[^>]*>/g, "").slice(0, 100) + (row.description.length > 100 ? "..." : "") : "-"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(row.createdAt)}</td>
                    <td className="px-4 py-3">
                      <TableActionButton
                        label="Actions"
                        items={[
                          ...(can("edit-knowledge-base") ? [{ label: "Edit", icon: <Pencil className="h-3.5 w-3.5" />, onSelect: () => openEdit(row) }] : []),
                          ...(can("delete-knowledge-base") ? [{ label: "Delete", icon: <Trash2 className="h-3.5 w-3.5" />, onSelect: () => setDeleteId(row.id), destructive: true }] : []),
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {total > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
              <span>Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => load({ p: page - 1 })}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => load({ p: page + 1 })}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{mode === "add" ? t("Create Knowledge Base") : t("Edit Knowledge Base")}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label htmlFor="kb-title" className="mb-1.5 block">{t("Title")}</Label>
              <Input id="kb-title" placeholder="Enter knowledge base title" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <Label className="mb-1.5 block">{t("Category")}</Label>
              <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("No Category")}</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="kb-desc" className="mb-1.5 block">{t("Description")}</Label>
              <Textarea id="kb-desc" rows={6} placeholder="Enter description..."
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={processing} className="flex-1">
                {processing ? t("Saving...") : mode === "add" ? t("Create") : t("Update")}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">{t("Cancel")}</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete Entry")}</AlertDialogTitle>
            <AlertDialogDescription>{t("Are you sure you want to delete this knowledge base entry?")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
