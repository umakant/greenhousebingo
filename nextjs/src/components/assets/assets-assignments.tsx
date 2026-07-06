"use client";

import * as React from "react";
import { Plus, Search, Pencil, Trash2, UserCheck } from "lucide-react";
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
import { formatDate as fmtDateLib } from "@/lib/format-date";
import { t } from "@/lib/admin-t";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";


const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "returned", label: "Returned" },
  { value: "damaged", label: "Damaged" },
];
const CONDITION_OPTIONS = [
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
];

type AssetOption = { id: string; name: string; serialCode?: string | null };
type AssignmentRow = {
  id: string; assignedTo: string; assignedDate: string; expectedReturn?: string | null;
  status: string; condition: string; notes?: string | null;
  asset?: { id: string; name: string; serialCode?: string | null } | null;
};

const emptyForm = {
  asset_id: "__none__", assigned_to: "", assigned_date: "", expected_return: "",
  status: "active", condition: "excellent", notes: "",
};

function statusBadge(s: string) {
  const map: Record<string, string> = {
    active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    returned: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    damaged: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${map[s] ?? "bg-gray-100 text-gray-700"}`}>{s}</span>;
}

export default function AssetsAssignments({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-assets");
  const { settings } = useAppSettings();
  const fmtDate = (d: string | null | undefined) => fmtDateLib(d, settings);

  const [items, setItems] = React.useState<AssignmentRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
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
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/assets/assignments?${params}`);
      const json = await res.json();
      setItems(json.data ?? []);
      setTotal(json.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, statusFilter]);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    fetch("/api/assets/assets?per_page=200").then(r => r.json()).then(j => setAssets(j.data ?? []));
  }, []);

  function openAdd() { setMode("add"); setEditId(null); setForm(emptyForm); setOpen(true); }
  function openEdit(row: AssignmentRow) {
    setMode("edit"); setEditId(row.id);
    setForm({
      asset_id: row.asset?.id ?? "__none__",
      assigned_to: row.assignedTo,
      assigned_date: row.assignedDate?.slice(0, 10) ?? "",
      expected_return: row.expectedReturn?.slice(0, 10) ?? "",
      status: row.status,
      condition: row.condition,
      notes: row.notes ?? "",
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.asset_id === "__none__") { toast.error("Asset is required"); return; }
    if (!form.assigned_to.trim()) { toast.error("Assigned to is required"); return; }
    if (!form.assigned_date) { toast.error("Assigned date is required"); return; }
    setProcessing(true);
    try {
      const payload = { ...form, asset_id: form.asset_id };
      const url = mode === "add" ? "/api/assets/assignments" : `/api/assets/assignments/${editId}`;
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
      const res = await fetch(`/api/assets/assignments/${deleteId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
      toast.success("Assignment deleted");
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
            <Input placeholder={t("Search...")} className="pl-9 w-56" value={search}
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
        {can("create-asset-assignment") && (
          <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />{t("Add Assignment")}</Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">{t("Asset")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("Assigned To")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("Assigned Date")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("Expected Return")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("Condition")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("Status")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">{t("Loading...")}</td></tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2">
                        <UserCheck className="h-10 w-10 text-muted-foreground/40" />
                        <p className="text-muted-foreground">{t("No assignments found")}</p>
                      </div>
                    </td>
                  </tr>
                ) : items.map(row => (
                  <tr key={row.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{row.asset?.name ?? "—"}</td>
                    <td className="px-4 py-3">{row.assignedTo}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.assignedDate ? fmtDate(row.assignedDate) : "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.expectedReturn ? fmtDate(row.expectedReturn) : "—"}</td>
                    <td className="px-4 py-3 capitalize">{row.condition}</td>
                    <td className="px-4 py-3">{statusBadge(row.status)}</td>
                    <td className="px-4 py-3">
                      <TableActionButton label={t("Actions")} items={[
                        ...(can("edit-asset-assignment") ? [{ label: t("Edit"), icon: <Pencil className="h-4 w-4" />, onSelect: () => openEdit(row) }] : []),
                        ...(can("delete-asset-assignment") ? [{ label: t("Delete"), icon: <Trash2 className="h-4 w-4" />, onSelect: () => setDeleteId(row.id), destructive: true }] : []),
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
            <SheetTitle>{mode === "add" ? t("Add Assignment") : t("Edit Assignment")}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-1">
              <Label required>{t("Asset")}</Label>
              <Select value={form.asset_id} onValueChange={v => f("asset_id", v)}>
                <SelectTrigger><SelectValue placeholder={t("Select asset")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("Select asset")}</SelectItem>
                  {assets.map(a => <SelectItem key={a.id} value={a.id}>{a.name}{a.serialCode ? ` (${a.serialCode})` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label required>{t("Assigned To")}</Label>
              <Input value={form.assigned_to} onChange={e => f("assigned_to", e.target.value)} placeholder={t("Employee or person name")} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label required>{t("Assigned Date")}</Label>
                <Input type="date" value={form.assigned_date} onChange={e => f("assigned_date", e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>{t("Expected Return")}</Label>
                <Input type="date" value={form.expected_return} onChange={e => f("expected_return", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>{t("Status")}</Label>
                <Select value={form.status} onValueChange={v => f("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t("Condition")}</Label>
                <Select value={form.condition} onValueChange={v => f("condition", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CONDITION_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("Notes")}</Label>
              <Textarea value={form.notes} onChange={e => f("notes", e.target.value)} rows={3} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={processing} className="flex-1">
                {processing ? t("Saving...") : mode === "add" ? t("Create Assignment") : t("Update Assignment")}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("Cancel")}</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete Assignment")}</AlertDialogTitle>
            <AlertDialogDescription>{t("This will permanently delete this assignment record. This action cannot be undone.")}</AlertDialogDescription>
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
