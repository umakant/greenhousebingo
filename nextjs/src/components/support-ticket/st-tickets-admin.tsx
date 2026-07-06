"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Search, Eye, Pencil, Trash2, Ticket } from "lucide-react";
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
import { formatDate, formatDateTime } from "@/lib/format-date";
import { t } from "@/lib/admin-t";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";


const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "on_hold", label: "On Hold" },
  { value: "closed", label: "Closed" },
];

const ACCOUNT_TYPES = [
  { value: "custom", label: "Custom" },
  { value: "staff", label: "Staff" },
  { value: "client", label: "Client" },
  { value: "vendor", label: "Vendor" },
  { value: "lms_student", label: "LMS student" },
  { value: "storefront_customer", label: "Storefront customer" },
];

function statusBadge(s: string) {
  const map: Record<string, string> = {
    open: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    on_hold: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    closed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  };
  const labels: Record<string, string> = { open: "Open", in_progress: "In Progress", on_hold: "On Hold", closed: "Closed" };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${map[s] ?? "bg-gray-100 text-gray-700"}`}>
      {labels[s] ?? s}
    </span>
  );
}

type Category = { id: string; name: string; color: string };
type TicketRow = {
  id: string; ticketCode: string; accountType: string; name: string; email: string;
  subject: string; status: string; createdAt: string;
  category?: { id: string; name: string; color: string } | null;
  websiteId?: string | null;
  storefrontCustomerId?: string | null;
  storefrontOrderId?: string | null;
};

const emptyForm = {
  account_type: "custom", name: "", email: "", subject: "",
  category_id: "__none__", status: "open", description: "",
};

export default function StTicketsAdmin({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-support-ticket");
  const { settings } = useAppSettings();
  const fmtDate = (d: string | Date | null | undefined) => formatDate(d, settings);
  const fmtDateTime = (d: string | Date | null | undefined) => formatDateTime(d, settings);

  const [items, setItems] = React.useState<TicketRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [perPage] = React.useState(10);
  const [categories, setCategories] = React.useState<Category[]>([]);

  async function loadCategories() {
    try {
      const res = await fetch("/api/support-ticket/categories?per_page=100");
      const d = await res.json();
      if (!res.ok) {
        toast.error(typeof d.error === "string" ? d.error : "Failed to load categories");
        setCategories([]);
        return;
      }
      setCategories(d.data ?? []);
    } catch {
      toast.error(t("Failed to load categories"));
      setCategories([]);
    }
  }

  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);

  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [viewTicket, setViewTicket] = React.useState<TicketRow | null>(null);

  React.useEffect(() => {
    void load();
  }, []); // eslint-disable-line

  React.useEffect(() => {
    if (open) void loadCategories();
  }, [open]);

  async function load(opts?: { p?: number; s?: string; st?: string }) {
    const p = opts?.p ?? page;
    const s = opts?.s ?? search;
    const st = opts?.st ?? statusFilter;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), per_page: String(perPage) });
      if (s) params.set("search", s);
      if (st && st !== "all") params.set("status", st);
      const res = await fetch(`/api/support-ticket/tickets?${params}`);
      const data = await res.json();
      setItems(data.data ?? []);
      setTotal(data.total ?? 0);
      setPage(p);
    } catch {
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setMode("add"); setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(row: TicketRow) {
    setMode("edit"); setEditId(row.id);
    setForm({
      account_type: row.accountType,
      name: row.name,
      email: row.email,
      subject: row.subject,
      category_id: row.category?.id ? String(row.category.id) : "__none__",
      status: row.status,
      description: "",
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.name || !form.email || !form.subject) {
      toast.error("Name, email and subject are required"); return;
    }
    setProcessing(true);
    try {
      const body = {
        ...form,
        category_id: form.category_id === "__none__" ? null : form.category_id,
      };
      const res = mode === "add"
        ? await fetch("/api/support-ticket/tickets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
        : await fetch(`/api/support-ticket/tickets/${editId}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
      toast.success(json.message ?? "Saved successfully");
      setOpen(false);
      void load();
    } finally {
      setProcessing(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/support-ticket/tickets/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
      toast.success(json.message ?? "Deleted");
      void load();
    } catch {
      toast.error("Failed to delete ticket");
    } finally {
      setDeleteId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t("Manage Tickets")}</h2>
        {can("create-tickets") && (
          <Button onClick={openAdd} size="sm">
            <Plus className="h-4 w-4 mr-1.5" /> {t("Create Ticket")}
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("Search tickets...")}
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && load({ p: 1, s: search })}
                className="pl-9"
              />
            </div>
            <Button onClick={() => load({ p: 1, s: search })} variant="default" size="sm">
              {t("Search")}
            </Button>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); load({ p: 1, st: v }); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All Status")}</SelectItem>
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">{t("Ticket ID")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("Account Type")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("Name")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("Email")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("Subject")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("Storefront")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("Category")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("Status")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("Created")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-12 text-muted-foreground">{t("Loading...")}</td></tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12">
                      <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">{t("No tickets found")}</p>
                    </td>
                  </tr>
                ) : items.map(row => (
                  <tr key={row.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => setViewTicket(row)}
                        className="text-primary hover:underline font-medium">
                        {row.ticketCode}
                      </button>
                    </td>
                    <td className="px-4 py-3 capitalize">{row.accountType}</td>
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.email}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{row.subject}</td>
                    <td className="px-4 py-3 max-w-[140px] text-xs text-muted-foreground">
                      {row.websiteId || row.storefrontOrderId || row.storefrontCustomerId ? (
                        <span className="block space-y-0.5">
                          {row.websiteId ? <span>W {row.websiteId}</span> : null}
                          {row.storefrontOrderId ? <span>O {row.storefrontOrderId}</span> : null}
                          {row.storefrontCustomerId ? <span>C {row.storefrontCustomerId}</span> : null}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">{row.category?.name ?? "-"}</td>
                    <td className="px-4 py-3">{statusBadge(row.status)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {fmtDate(row.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <TableActionButton
                        label="Actions"
                        items={[
                          ...(can("view-tickets") ? [{ label: "View", icon: <Eye className="h-3.5 w-3.5" />, onSelect: () => setViewTicket(row) }] : []),
                          ...(can("edit-tickets") ? [{ label: "Edit", icon: <Pencil className="h-3.5 w-3.5" />, onSelect: () => openEdit(row) }] : []),
                          ...(can("delete-tickets") ? [{ label: "Delete", icon: <Trash2 className="h-3.5 w-3.5" />, onSelect: () => setDeleteId(row.id), destructive: true }] : []),
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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

      {/* Add/Edit Drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{mode === "add" ? t("Create Ticket") : t("Edit Ticket")}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label className="mb-1.5 block">{t("Account Type")}</Label>
              <div className="flex gap-4 flex-wrap">
                {ACCOUNT_TYPES.map(at => (
                  <label key={at.value} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="radio" name="account_type" value={at.value}
                      checked={form.account_type === at.value}
                      onChange={() => setForm(f => ({ ...f, account_type: at.value }))}
                      className="accent-primary" />
                    {at.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="st-name" className="mb-1.5 block">{t("Name")}</Label>
                <Input id="st-name" placeholder="Enter Name" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="st-email" className="mb-1.5 block">{t("Email")}</Label>
                <Input id="st-email" placeholder="Enter Email" type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
                <p className="text-xs text-muted-foreground mt-1.5">
                  <Link href="/support-ticket/system-setup/categories" className="text-primary hover:underline">
                    {t("Add or edit categories")}
                  </Link>
                  {categories.length === 0 ? (
                    <span className="block mt-1">{t("No categories yet — create some in System Setup.")}</span>
                  ) : null}
                </p>
              </div>
              <div>
                <Label htmlFor="st-subject" className="mb-1.5 block">{t("Subject")}</Label>
                <Input id="st-subject" placeholder="Enter Subject" value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">{t("Status")}</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="st-desc" className="mb-1.5 block">{t("Description")}</Label>
              <Textarea id="st-desc" rows={5} placeholder="Enter description..."
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

      {/* View Ticket Drawer */}
      <Sheet open={!!viewTicket} onOpenChange={v => !v && setViewTicket(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t("Ticket Details")}</SheetTitle>
          </SheetHeader>
          {viewTicket && (
            <div className="space-y-4 mt-6 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("Ticket ID")}</span>
                <span className="font-mono font-medium">{viewTicket.ticketCode}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("Status")}</span>
                {statusBadge(viewTicket.status)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("Account Type")}</span>
                <span className="capitalize">{viewTicket.accountType}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("Name")}</span>
                <span>{viewTicket.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("Email")}</span>
                <span>{viewTicket.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("Subject")}</span>
                <span className="text-right max-w-[60%]">{viewTicket.subject}</span>
              </div>
              {viewTicket.category && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("Category")}</span>
                  <span>{viewTicket.category.name}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("Created")}</span>
                <span>{fmtDateTime(viewTicket.createdAt)}</span>
              </div>
              {(viewTicket.websiteId || viewTicket.storefrontOrderId || viewTicket.storefrontCustomerId) && (
                <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1">
                  <p className="font-medium text-foreground">{t("Storefront linkage")}</p>
                  {viewTicket.websiteId ? (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{t("Website ID")}</span>
                      <span className="font-mono">{viewTicket.websiteId}</span>
                    </div>
                  ) : null}
                  {viewTicket.storefrontOrderId ? (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{t("Order ID")}</span>
                      <span className="font-mono">{viewTicket.storefrontOrderId}</span>
                    </div>
                  ) : null}
                  {viewTicket.storefrontCustomerId ? (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{t("Customer ID")}</span>
                      <span className="font-mono">{viewTicket.storefrontCustomerId}</span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete Ticket")}</AlertDialogTitle>
            <AlertDialogDescription>{t("Are you sure you want to delete this ticket? This action cannot be undone.")}</AlertDialogDescription>
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
