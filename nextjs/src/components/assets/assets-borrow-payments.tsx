"use client";

import * as React from "react";
import { Plus, Search, Pencil, Trash2, CreditCard } from "lucide-react";
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
import { formatCurrency } from "@/lib/format-currency";
import { t } from "@/lib/admin-t";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";


const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
];

type BorrowOption = { id: string; userId: string; asset?: { name: string } | null };
type PaymentRow = {
  id: string; customerName: string; paymentAmount: string; paymentDate: string;
  referenceNumber?: string | null; status: string;
  borrowRent?: { id: string; userId: string; asset?: { id: string; name: string } | null } | null;
};

const emptyForm = {
  borrow_rent_id: "__none__", customer_name: "", payment_amount: "",
  payment_date: "", reference_number: "", status: "draft", notes: "",
};

function statusBadge(s: string) {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    paid: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };
  return <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${map[s] ?? "bg-gray-100 text-gray-700"}`}>{s}</span>;
}

export default function AssetsBorrowPayments({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-assets");
  const { settings } = useAppSettings();
  const fmtDate = (d: string | null | undefined) => fmtDateLib(d, settings);
  const fmtCur = (v: number) => formatCurrency(v, settings);

  const [items, setItems] = React.useState<PaymentRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [perPage] = React.useState(10);
  const [borrowRecords, setBorrowRecords] = React.useState<BorrowOption[]>([]);

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
      const res = await fetch(`/api/assets/borrow-payments?${params}`);
      const json = await res.json();
      setItems(json.data ?? []);
      setTotal(json.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, statusFilter]);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    fetch("/api/assets/borrow-rent?per_page=200").then(r => r.json()).then(j => setBorrowRecords(j.data ?? []));
  }, []);

  function openAdd() { setMode("add"); setEditId(null); setForm(emptyForm); setOpen(true); }
  function openEdit(row: PaymentRow) {
    setMode("edit"); setEditId(row.id);
    setForm({
      borrow_rent_id: row.borrowRent?.id ?? "__none__",
      customer_name: row.customerName,
      payment_amount: String(row.paymentAmount),
      payment_date: row.paymentDate?.slice(0, 10) ?? "",
      reference_number: row.referenceNumber ?? "",
      status: row.status,
      notes: "",
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.borrow_rent_id === "__none__") { toast.error("Borrow/rent record is required"); return; }
    if (!form.customer_name.trim()) { toast.error("Customer name is required"); return; }
    if (!form.payment_amount) { toast.error("Payment amount is required"); return; }
    if (!form.payment_date) { toast.error("Payment date is required"); return; }
    setProcessing(true);
    try {
      const url = mode === "add" ? "/api/assets/borrow-payments" : `/api/assets/borrow-payments/${editId}`;
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
      const res = await fetch(`/api/assets/borrow-payments/${deleteId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
      toast.success("Payment deleted");
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
        {can("create-borrow-payment") && (
          <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />{t("Add Payment")}</Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">{t("Asset")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("Customer Name")}</th>
                  <th className="text-right px-4 py-3 font-medium">{t("Amount")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("Payment Date")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("Reference")}</th>
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
                        <CreditCard className="h-10 w-10 text-muted-foreground/40" />
                        <p className="text-muted-foreground">{t("No payments found")}</p>
                      </div>
                    </td>
                  </tr>
                ) : items.map(row => (
                  <tr key={row.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{row.borrowRent?.asset?.name ?? "—"}</td>
                    <td className="px-4 py-3">{row.customerName}</td>
                    <td className="px-4 py-3 text-right font-medium">{fmtCur(Number(row.paymentAmount))}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(row.paymentDate)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.referenceNumber ?? "—"}</td>
                    <td className="px-4 py-3">{statusBadge(row.status)}</td>
                    <td className="px-4 py-3">
                      <TableActionButton label={t("Actions")} items={[
                        ...(can("edit-borrow-payment") ? [{ label: t("Edit"), icon: <Pencil className="h-4 w-4" />, onSelect: () => openEdit(row) }] : []),
                        ...(can("manage-borrow-payments") ? [{ label: t("Delete"), icon: <Trash2 className="h-4 w-4" />, onSelect: () => setDeleteId(row.id), destructive: true }] : []),
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
            <SheetTitle>{mode === "add" ? t("Add Payment") : t("Edit Payment")}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {mode === "add" && (
              <div className="space-y-1">
                <Label required>{t("Borrow/Rent Record")}</Label>
                <Select value={form.borrow_rent_id} onValueChange={v => f("borrow_rent_id", v)}>
                  <SelectTrigger><SelectValue placeholder={t("Select record")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("Select record")}</SelectItem>
                    {borrowRecords.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.asset?.name ? `${b.asset.name} - ` : ""}{b.userId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label required>{t("Customer Name")}</Label>
              <Input value={form.customer_name} onChange={e => f("customer_name", e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label required>{t("Payment Amount")}</Label>
                <Input type="number" step="0.01" value={form.payment_amount} onChange={e => f("payment_amount", e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label required>{t("Payment Date")}</Label>
                <Input type="date" value={form.payment_date} onChange={e => f("payment_date", e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>{t("Reference Number")}</Label>
                <Input value={form.reference_number} onChange={e => f("reference_number", e.target.value)} />
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
                {processing ? t("Saving...") : mode === "add" ? t("Create Payment") : t("Update Payment")}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("Cancel")}</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete Payment")}</AlertDialogTitle>
            <AlertDialogDescription>{t("This will permanently delete this payment record.")}</AlertDialogDescription>
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
