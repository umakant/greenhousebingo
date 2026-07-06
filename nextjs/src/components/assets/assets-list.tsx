"use client";

import * as React from "react";
import { Plus, Search, Pencil, Trash2, Package } from "lucide-react";
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
import { formatCurrency } from "@/lib/format-currency";
import { t } from "@/lib/admin-t";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";


type Category = { id: string; name: string };
type Location = { id: string; name: string };
type AssetRow = {
  id: string; name: string; serialCode?: string | null;
  quantity: number; unitPrice?: string | null; purchaseCost?: string | null;
  purchaseDate?: string | null; warrantyPeriod?: string | null;
  category?: Category | null; location?: Location | null;
  description?: string | null; image?: string | null; createdAt: string;
};

const emptyForm = {
  name: "", category_id: "__none__", purchase_date: "", supported_date: "",
  serial_code: "", quantity: "1", unit_price: "", purchase_cost: "",
  warranty_period: "", location_id: "__none__", description: "", image: "",
};

export default function AssetsList({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-assets");
  const { settings } = useAppSettings();
  const fmtCur = (v: number) => formatCurrency(v, settings);

  const [items, setItems] = React.useState<AssetRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [perPage] = React.useState(10);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [locations, setLocations] = React.useState<Location[]>([]);

  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);

  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage), search });
      if (categoryFilter !== "all") params.set("category_id", categoryFilter);
      const res = await fetch(`/api/assets/assets?${params}`);
      const json = await res.json();
      setItems(json.data ?? []);
      setTotal(json.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, categoryFilter]);

  React.useEffect(() => { load(); }, [load]);

  React.useEffect(() => {
    fetch("/api/assets/categories?per_page=100").then(r => r.json()).then(j => setCategories(j.data ?? []));
    fetch("/api/assets/locations?per_page=100").then(r => r.json()).then(j => setLocations(j.data ?? []));
  }, []);

  function openAdd() {
    setMode("add"); setEditId(null);
    setForm(emptyForm); setOpen(true);
  }

  function openEdit(row: AssetRow) {
    setMode("edit"); setEditId(row.id);
    setForm({
      name: row.name,
      category_id: row.category?.id ?? "__none__",
      purchase_date: row.purchaseDate ? row.purchaseDate.slice(0, 10) : "",
      supported_date: "",
      serial_code: row.serialCode ?? "",
      quantity: String(row.quantity ?? 1),
      unit_price: row.unitPrice ?? "",
      purchase_cost: row.purchaseCost ?? "",
      warranty_period: row.warrantyPeriod ?? "",
      location_id: row.location?.id ?? "__none__",
      description: row.description ?? "",
      image: row.image ?? "",
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Asset name is required"); return; }
    setProcessing(true);
    try {
      const payload = {
        ...form,
        category_id: form.category_id === "__none__" ? null : form.category_id,
        location_id: form.location_id === "__none__" ? null : form.location_id,
        quantity: parseInt(form.quantity) || 1,
      };
      const url = mode === "add" ? "/api/assets/assets" : `/api/assets/assets/${editId}`;
      const method = mode === "add" ? "POST" : "PUT";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
      toast.success(json.message ?? "Saved");
      setOpen(false);
      load();
    } finally {
      setProcessing(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/assets/assets/${deleteId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
      toast.success("Asset deleted");
      setDeleteId(null);
      load();
    } finally {
      setDeleteLoading(false);
    }
  }

  const f = (k: keyof typeof emptyForm, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t("Search assets...")} className="pl-9 w-56" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setPage(1); }}>
            <SelectTrigger className="w-44"><SelectValue placeholder={t("All Categories")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All Categories")}</SelectItem>
              {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {can("create-asset") && (
          <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />{t("Add Asset")}</Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">{t("Name")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("Category")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("Serial Code")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("Qty")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("Unit Price")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("Purchase Cost")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("Location")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">{t("Loading...")}</td></tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="h-10 w-10 text-muted-foreground/40" />
                        <p className="text-muted-foreground">{t("No assets found")}</p>
                      </div>
                    </td>
                  </tr>
                ) : items.map(row => (
                  <tr key={row.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.category?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.serialCode ?? "—"}</td>
                    <td className="px-4 py-3">{row.quantity}</td>
                    <td className="px-4 py-3">{row.unitPrice ? fmtCur(Number(row.unitPrice)) : "—"}</td>
                    <td className="px-4 py-3">{row.purchaseCost ? fmtCur(Number(row.purchaseCost)) : "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.location?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <TableActionButton label={t("Actions")} items={[
                        ...(can("edit-asset") ? [{ label: t("Edit"), icon: <Pencil className="h-4 w-4" />, onSelect: () => openEdit(row) }] : []),
                        ...(can("delete-asset") ? [{ label: t("Delete"), icon: <Trash2 className="h-4 w-4" />, onSelect: () => setDeleteId(row.id), destructive: true }] : []),
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">{t("Page")} {page} {t("of")} {totalPages} ({total} {t("total")})</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t("Previous")}</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>{t("Next")}</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{mode === "add" ? t("Add Asset") : t("Edit Asset")}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-1">
              <Label required>{t("Name")}</Label>
              <Input value={form.name} onChange={e => f("name", e.target.value)} placeholder={t("Asset name")} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>{t("Category")}</Label>
                <Select value={form.category_id} onValueChange={v => f("category_id", v)}>
                  <SelectTrigger><SelectValue placeholder={t("Select category")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("None")}</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t("Location")}</Label>
                <Select value={form.location_id} onValueChange={v => f("location_id", v)}>
                  <SelectTrigger><SelectValue placeholder={t("Select location")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("None")}</SelectItem>
                    {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>{t("Purchase Date")}</Label>
                <Input type="date" value={form.purchase_date} onChange={e => f("purchase_date", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>{t("Serial Code")}</Label>
                <Input value={form.serial_code} onChange={e => f("serial_code", e.target.value)} placeholder="SN-123456" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>{t("Quantity")}</Label>
                <Input type="number" min="1" value={form.quantity} onChange={e => f("quantity", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>{t("Unit Price")}</Label>
                <Input type="number" step="0.01" value={form.unit_price} onChange={e => f("unit_price", e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1">
                <Label>{t("Purchase Cost")}</Label>
                <Input type="number" step="0.01" value={form.purchase_cost} onChange={e => f("purchase_cost", e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("Warranty Period")}</Label>
              <Input value={form.warranty_period} onChange={e => f("warranty_period", e.target.value)} placeholder="e.g. 2 years" />
            </div>
            <div className="space-y-1">
              <Label>{t("Description")}</Label>
              <Textarea value={form.description} onChange={e => f("description", e.target.value)} rows={3} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={processing} className="flex-1">
                {processing ? t("Saving...") : mode === "add" ? t("Create Asset") : t("Update Asset")}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("Cancel")}</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete Asset")}</AlertDialogTitle>
            <AlertDialogDescription>{t("This will permanently delete the asset and all related records. This action cannot be undone.")}</AlertDialogDescription>
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
