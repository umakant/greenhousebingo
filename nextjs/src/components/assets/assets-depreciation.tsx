"use client";

import * as React from "react";
import { Plus, Search, Pencil, Trash2, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TableActionButton } from "@/components/ui/table-action-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency } from "@/lib/format-currency";
import { t } from "@/lib/admin-t";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";


const METHODS = ["Straight Line", "Declining Balance"];
const STATUS_OPTIONS = [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }];

type AssetOption = { id: string; name: string; purchaseCost?: string | null };
type DepreciationRow = {
  id: string; method: string; usefulLife: number; salvageValue: string; startDate: string; status: string;
  annualDepreciation?: number; accumulated?: number; bookValue?: number;
  asset?: { id: string; name: string; purchaseCost?: string | null } | null;
};

const emptyForm = {
  asset_id: "__none__", method: "Straight Line", useful_life: "5",
  salvage_value: "0", start_date: "", notes: "", status: "active",
};

export default function AssetsDepreciation({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-assets");
  const { settings } = useAppSettings();
  const fmtCur = (v: number) => formatCurrency(v, settings);

  const [items, setItems] = React.useState<DepreciationRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [perPage] = React.useState(10);
  const [assets, setAssets] = React.useState<AssetOption[]>([]);

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
      const res = await fetch(`/api/assets/depreciation?${params}`);
      const json = await res.json();
      setItems(json.data ?? []);
      setTotal(json.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search]);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    fetch("/api/assets/assets?per_page=200").then(r => r.json()).then(j => setAssets(j.data ?? []));
  }, []);

  function openAdd() { setMode("add"); setEditId(null); setForm(emptyForm); setOpen(true); }
  function openEdit(row: DepreciationRow) {
    setMode("edit"); setEditId(row.id);
    setForm({
      asset_id: row.asset?.id ?? "__none__",
      method: row.method,
      useful_life: String(row.usefulLife),
      salvage_value: String(row.salvageValue ?? "0"),
      start_date: row.startDate?.slice(0, 10) ?? "",
      notes: "",
      status: row.status,
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.asset_id === "__none__") { toast.error("Asset is required"); return; }
    if (!form.start_date) { toast.error("Start date is required"); return; }
    setProcessing(true);
    try {
      const url = mode === "add" ? "/api/assets/depreciation" : `/api/assets/depreciation/${editId}`;
      const method = mode === "add" ? "POST" : "PUT";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
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
      const res = await fetch(`/api/assets/depreciation/${deleteId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
      toast.success("Record deleted");
      setDeleteId(null); load();
    } finally {
      setDeleteLoading(false);
    }
  }

  const f = (k: keyof typeof emptyForm, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t("Search...")} className="pl-9 w-56" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        {can("create-asset-depreciation") && (
          <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />{t("Add Depreciation")}</Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">{t("Asset")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("Method")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("Useful Life")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("Salvage Value")}</th>
                  <th className="text-right px-4 py-3 font-medium">{t("Annual Dep.")}</th>
                  <th className="text-right px-4 py-3 font-medium">{t("Accumulated")}</th>
                  <th className="text-right px-4 py-3 font-medium">{t("Book Value")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("Status")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-10 text-muted-foreground">{t("Loading...")}</td></tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2">
                        <TrendingDown className="h-10 w-10 text-muted-foreground/40" />
                        <p className="text-muted-foreground">{t("No depreciation records found")}</p>
                      </div>
                    </td>
                  </tr>
                ) : items.map(row => (
                  <tr key={row.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{row.asset?.name ?? "—"}</td>
                    <td className="px-4 py-3">{row.method}</td>
                    <td className="px-4 py-3">{row.usefulLife} {t("yr")}</td>
                    <td className="px-4 py-3">{fmtCur(Number(row.salvageValue))}</td>
                    <td className="px-4 py-3 text-right">{row.annualDepreciation != null ? fmtCur(row.annualDepreciation) : "—"}</td>
                    <td className="px-4 py-3 text-right">{row.accumulated != null ? fmtCur(row.accumulated) : "—"}</td>
                    <td className="px-4 py-3 text-right font-medium">{row.bookValue != null ? fmtCur(row.bookValue) : "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={row.status === "active" ? "default" : "secondary"}>
                        {row.status === "active" ? t("Active") : t("Inactive")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <TableActionButton label={t("Actions")} items={[
                        ...(can("edit-asset-depreciation") ? [{ label: t("Edit"), icon: <Pencil className="h-4 w-4" />, onSelect: () => openEdit(row) }] : []),
                        ...(can("delete-asset-depreciation") ? [{ label: t("Delete"), icon: <Trash2 className="h-4 w-4" />, onSelect: () => setDeleteId(row.id), destructive: true }] : []),
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
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{mode === "add" ? t("Add Depreciation") : t("Edit Depreciation")}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-1">
              <Label required>{t("Asset")}</Label>
              <Select value={form.asset_id} onValueChange={v => f("asset_id", v)}>
                <SelectTrigger><SelectValue placeholder={t("Select asset")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("Select asset")}</SelectItem>
                  {assets.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("Depreciation Method")}</Label>
              <Select value={form.method} onValueChange={v => f("method", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>{t("Useful Life (years)")}</Label>
                <Input type="number" min="1" value={form.useful_life} onChange={e => f("useful_life", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>{t("Salvage Value")}</Label>
                <Input type="number" step="0.01" value={form.salvage_value} onChange={e => f("salvage_value", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label required>{t("Start Date")}</Label>
                <Input type="date" value={form.start_date} onChange={e => f("start_date", e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>{t("Status")}</Label>
                <Select value={form.status} onValueChange={v => f("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("Notes")}</Label>
              <Textarea value={form.notes} onChange={e => f("notes", e.target.value)} rows={2} />
            </div>
            <div className="flex gap-2 pt-2">
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
            <AlertDialogTitle>{t("Delete Depreciation Record")}</AlertDialogTitle>
            <AlertDialogDescription>{t("This will permanently delete this depreciation record.")}</AlertDialogDescription>
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
