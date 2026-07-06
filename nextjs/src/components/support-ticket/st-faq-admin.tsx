"use client";

import * as React from "react";
import { Plus, Search, HelpCircle, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TableActionButton } from "@/components/ui/table-action-button";
import { toast } from "sonner";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import { t } from "@/lib/admin-t";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";


type FaqRow = { id: string; title: string; answer?: string | null; createdAt: string };
const emptyForm = { title: "", answer: "" };

export default function StFaqAdmin({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-support-ticket");

  const { settings } = useAppSettings();
  const fmtDate = (d: string | null | undefined) => fmtDateLib(d, settings);
  const [items, setItems] = React.useState<FaqRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [perPage] = React.useState(10);

  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  React.useEffect(() => { void load(); }, []); // eslint-disable-line

  async function load(opts?: { p?: number; s?: string }) {
    const p = opts?.p ?? page;
    const s = opts?.s ?? search;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), per_page: String(perPage) });
      if (s) params.set("search", s);
      const res = await fetch(`/api/support-ticket/faq?${params}`, { credentials: "include" });
      const data = await res.json();
      setItems(data.data ?? []); setTotal(data.total ?? 0); setPage(p);
    } catch { toast.error("Failed to load FAQ"); } finally { setLoading(false); }
  }

  function openAdd() { setMode("add"); setEditId(null); setForm(emptyForm); setOpen(true); }
  function openEdit(row: FaqRow) {
    setMode("edit"); setEditId(row.id);
    setForm({ title: row.title, answer: row.answer ?? "" }); setOpen(true);
  }

  async function handleSave() {
    if (!form.title) { toast.error("Title is required"); return; }
    setProcessing(true);
    try {
      const res = mode === "add"
        ? await fetch("/api/support-ticket/faq", {
            method: "POST",
            credentials: "include",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(form),
          })
        : await fetch(`/api/support-ticket/faq/${editId}`, {
            method: "PUT",
            credentials: "include",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(form),
          });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
      toast.success(json.message ?? "Saved"); setOpen(false); void load();
    } finally { setProcessing(false); }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/support-ticket/faq/${id}`, { method: "DELETE", credentials: "include" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
      toast.success(json.message ?? "Deleted"); void load();
    } catch { toast.error("Failed to delete"); } finally { setDeleteId(null); }
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t("Manage FAQ")}</h2>
        {can("create-support-faq") && (
          <Button onClick={openAdd} size="sm"><Plus className="h-4 w-4 mr-1.5" /> {t("Add")}</Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t("Search FAQ...")} value={search}
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
                  <th className="px-4 py-3 text-left font-medium">{t("Description")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("Created")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="text-center py-12 text-muted-foreground">{t("Loading...")}</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-12">
                    <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">{t("No FAQ entries found")}</p>
                  </td></tr>
                ) : items.map(row => (
                  <tr key={row.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium max-w-[250px]">{row.title}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[400px] truncate">
                      {row.answer ? row.answer.replace(/<[^>]*>/g, "").slice(0, 120) + (row.answer.length > 120 ? "..." : "") : "-"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(row.createdAt)}</td>
                    <td className="px-4 py-3">
                      <TableActionButton
                        label="Actions"
                        items={[
                          ...(can("edit-support-faq") ? [{ label: "Edit", icon: <Pencil className="h-3.5 w-3.5" />, onSelect: () => openEdit(row) }] : []),
                          ...(can("delete-support-faq") ? [{ label: "Delete", icon: <Trash2 className="h-3.5 w-3.5" />, onSelect: () => setDeleteId(row.id), destructive: true }] : []),
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
            <SheetTitle>{mode === "add" ? t("Create FAQ") : t("Edit FAQ")}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label htmlFor="faq-title" className="mb-1.5 block">{t("Title")}</Label>
              <Input id="faq-title" placeholder="Enter FAQ title" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="faq-answer" className="mb-1.5 block">{t("Answer")}</Label>
              <Textarea id="faq-answer" rows={8} placeholder="Enter answer..."
                value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} />
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
            <AlertDialogTitle>{t("Delete FAQ")}</AlertDialogTitle>
            <AlertDialogDescription>{t("Are you sure you want to delete this FAQ entry?")}</AlertDialogDescription>
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
