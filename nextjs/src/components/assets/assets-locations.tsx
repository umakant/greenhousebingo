"use client";

import * as React from "react";
import { Plus, Search, Pencil, Trash2, MapPin } from "lucide-react";
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
import { formatPhone } from "@/lib/phone";
import { t } from "@/lib/admin-t";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";


const LOCATION_TYPES = ["Building", "Warehouse", "Site", "Floor", "Room", "Other"];
const STATUS_OPTIONS = [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }];

type LocationRow = {
  id: string; name: string; code: string; type: string; status: string;
  city?: string | null; country?: string | null; contactPerson?: string | null;
  contactPhone?: string | null;
  parent?: { id: string; name: string } | null;
  _count?: { assets: number };
};

const emptyForm = {
  name: "", code: "", type: "Building", parent_id: "__none__",
  address: "", city: "", state: "", country: "", postal_code: "",
  contact_person: "", contact_phone: "", contact_email: "",
  description: "", status: "active",
};

export default function AssetsLocations({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-assets");

  const [items, setItems] = React.useState<LocationRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [perPage] = React.useState(10);

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
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/assets/locations?${params}`);
      const json = await res.json();
      setItems(json.data ?? []);
      setTotal(json.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, statusFilter]);

  React.useEffect(() => { load(); }, [load]);

  function openAdd() { setMode("add"); setEditId(null); setForm(emptyForm); setOpen(true); }
  function openEdit(row: LocationRow) {
    setMode("edit"); setEditId(row.id);
    setForm({
      name: row.name, code: row.code, type: row.type,
      parent_id: row.parent?.id ?? "__none__",
      address: "", city: row.city ?? "", state: "", country: row.country ?? "",
      postal_code: "", contact_person: row.contactPerson ?? "",
        contact_phone: row.contactPhone ?? "", contact_email: "", description: "", status: row.status,
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!form.code.trim()) { toast.error("Code is required"); return; }
    setProcessing(true);
    try {
      const payload = { ...form, parent_id: form.parent_id === "__none__" ? null : form.parent_id };
      const url = mode === "add" ? "/api/assets/locations" : `/api/assets/locations/${editId}`;
      const method = mode === "add" ? "POST" : "PUT";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
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
      const res = await fetch(`/api/assets/locations/${deleteId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
      toast.success("Location deleted");
      setDeleteId(null); load();
    } finally {
      setDeleteLoading(false);
    }
  }

  const f = (k: keyof typeof emptyForm, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t("Search locations...")} className="pl-9 w-56" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All Status")}</SelectItem>
              {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {can("create-asset-location") && (
          <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />{t("Add Location")}</Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">{t("Name")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("Code")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("Type")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("Assets")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("Status")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">{t("Loading...")}</td></tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2">
                        <MapPin className="h-10 w-10 text-muted-foreground/40" />
                        <p className="text-muted-foreground">{t("No locations found")}</p>
                      </div>
                    </td>
                  </tr>
                ) : items.map(row => (
                  <tr key={row.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.code}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.type}</td>
                    <td className="px-4 py-3">{row._count?.assets ?? 0}</td>
                    <td className="px-4 py-3">
                      <Badge variant={row.status === "active" ? "default" : "secondary"}>
                        {row.status === "active" ? t("Active") : t("Inactive")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <TableActionButton label={t("Actions")} items={[
                        ...(can("edit-asset-location") ? [{ label: t("Edit"), icon: <Pencil className="h-4 w-4" />, onSelect: () => openEdit(row) }] : []),
                        ...(can("delete-asset-location") ? [{ label: t("Delete"), icon: <Trash2 className="h-4 w-4" />, onSelect: () => setDeleteId(row.id), destructive: true }] : []),
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
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{mode === "add" ? t("Add Location") : t("Edit Location")}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label required>{t("Name")}</Label>
                <Input value={form.name} onChange={e => f("name", e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label required>{t("Code")}</Label>
                <Input value={form.code} onChange={e => f("code", e.target.value)} placeholder="LOC-001" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>{t("Type")}</Label>
                <Select value={form.type} onValueChange={v => f("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LOCATION_TYPES.map(tp => <SelectItem key={tp} value={tp}>{tp}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t("Status")}</Label>
                <Select value={form.status} onValueChange={v => f("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>{t("City")}</Label>
                <Input value={form.city} onChange={e => f("city", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>{t("Country")}</Label>
                <Input value={form.country} onChange={e => f("country", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("Address")}</Label>
              <Textarea value={form.address} onChange={e => f("address", e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>{t("Contact Person")}</Label>
                <Input value={form.contact_person} onChange={e => f("contact_person", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>{t("Contact Phone")}</Label>
                <Input
                  value={form.contact_phone}
                  onChange={e => f("contact_phone", formatPhone(e.target.value))}
                  placeholder="(000) 000-0000"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={processing} className="flex-1">
                {processing ? t("Saving...") : mode === "add" ? t("Create Location") : t("Update Location")}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("Cancel")}</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete Location")}</AlertDialogTitle>
            <AlertDialogDescription>{t("This will permanently delete this location. This action cannot be undone.")}</AlertDialogDescription>
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
