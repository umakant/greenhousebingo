"use client";

import * as React from "react";
import { Search, Mail, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { TableActionButton } from "@/components/ui/table-action-button";
import { toast } from "sonner";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import { formatDateTime as fmtDateTimeLib } from "@/lib/format-date";
import { t } from "@/lib/admin-t";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";


type ContactRow = { id: string; name: string; email: string; subject: string; message?: string | null; createdAt: string };

export default function StContactAdmin({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-support-ticket");

  const { settings } = useAppSettings();
  const fmtDate = (d: string | null | undefined) => fmtDateLib(d, settings);
  const fmtDateTime = (d: string | null | undefined) => fmtDateTimeLib(d, settings);
  const [items, setItems] = React.useState<ContactRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [perPage] = React.useState(10);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [viewItem, setViewItem] = React.useState<ContactRow | null>(null);

  React.useEffect(() => { void load(); }, []); // eslint-disable-line

  async function load(opts?: { p?: number; s?: string }) {
    const p = opts?.p ?? page;
    const s = opts?.s ?? search;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), per_page: String(perPage) });
      if (s) params.set("search", s);
      const res = await fetch(`/api/support-ticket/contact?${params}`);
      const data = await res.json();
      setItems(data.data ?? []); setTotal(data.total ?? 0); setPage(p);
    } catch { toast.error("Failed to load contacts"); } finally { setLoading(false); }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/support-ticket/contact/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
      toast.success(json.message ?? "Deleted"); void load();
    } catch { toast.error("Failed to delete"); } finally { setDeleteId(null); }
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t("Manage Contact")}</h2>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t("Search contacts...")} value={search}
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
                  <th className="px-4 py-3 text-left font-medium">{t("Name")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("Email")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("Subject")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("Message")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("Date")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">{t("Loading...")}</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12">
                    <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">{t("No contacts found")}</p>
                  </td></tr>
                ) : items.map(row => (
                  <tr key={row.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.email}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{row.subject}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[250px] truncate">
                      {row.message ? row.message.slice(0, 80) + (row.message.length > 80 ? "..." : "") : "-"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(row.createdAt)}</td>
                    <td className="px-4 py-3">
                      <TableActionButton
                        label="Actions"
                        items={[
                          ...(can("view-support-contact") ? [{ label: "View", icon: <Eye className="h-3.5 w-3.5" />, onSelect: () => setViewItem(row) }] : []),
                          ...(can("delete-support-contact") ? [{ label: "Delete", icon: <Trash2 className="h-3.5 w-3.5" />, onSelect: () => setDeleteId(row.id), destructive: true }] : []),
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

      {/* View Drawer */}
      <Sheet open={!!viewItem} onOpenChange={v => !v && setViewItem(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>{t("Contact Details")}</SheetTitle></SheetHeader>
          {viewItem && (
            <div className="space-y-4 mt-6 text-sm">
              {[
                { label: "Name", value: viewItem.name },
                { label: "Email", value: viewItem.email },
                { label: "Subject", value: viewItem.subject },
                { label: "Date", value: fmtDateTime(viewItem.createdAt) },
              ].map(item => (
                <div key={item.label} className="flex items-start justify-between gap-4">
                  <span className="text-muted-foreground min-w-[80px]">{t(item.label)}</span>
                  <span className="text-right">{item.value}</span>
                </div>
              ))}
              {viewItem.message && (
                <div>
                  <p className="text-muted-foreground mb-2">{t("Message")}</p>
                  <div className="rounded-lg bg-muted p-3 text-sm whitespace-pre-wrap">{viewItem.message}</div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete Contact")}</AlertDialogTitle>
            <AlertDialogDescription>{t("Are you sure you want to delete this contact?")}</AlertDialogDescription>
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
