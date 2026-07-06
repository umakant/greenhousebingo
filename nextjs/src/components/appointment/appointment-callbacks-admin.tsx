"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import { Trash2, Phone, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { TableActionButton } from "@/components/ui/table-action-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate } from "@/lib/format-date";
import { t } from "@/lib/admin-t";



const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  completed: { label: "Completed", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

type CBRow = {
  id: string; uniqueCode: string; reason: string | null;
  date: string | null; startTime: string | null; endTime: string | null; status: string;
  schedule: { id: string; name: string | null; email: string | null } | null;
  appointment: { id: string; appointmentName: string } | null;
};

export default function AppointmentCallbacksAdmin({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-appointment");
  const { settings } = useAppSettings();
  const fmtDate = (d: string | Date | null | undefined) => formatDate(d, settings);
  const [rows, setRows] = React.useState<CBRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filterStatus, setFilterStatus] = React.useState("");
  const [actionOpen, setActionOpen] = React.useState(false);
  const [actionRow, setActionRow] = React.useState<CBRow | null>(null);
  const [actionStatus, setActionStatus] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [processing, setProcessing] = React.useState(false);
  const perPage = 15;

  async function load() {
    setLoading(true); setError(null);
    try {
      let url = `/api/appointment/callbacks?page=${page}&per_page=${perPage}`;
      if (filterStatus) url += `&status=${encodeURIComponent(filterStatus)}`;
      const r = await fetch(url, { cache: "no-store" });
      const d = await r.json();
      setRows(d.data ?? []); setTotal(d.total ?? 0);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  React.useEffect(() => { void load(); }, [page, filterStatus]); // eslint-disable-line

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  function openAction(row: CBRow, status: string) {
    setActionRow(row); setActionStatus(status); setReason(""); setActionOpen(true);
  }

  async function applyAction(e: React.FormEvent) {
    e.preventDefault(); if (!actionRow) return;
    setProcessing(true);
    try {
      const body: any = { status: actionStatus };
      if (reason) body.reason = reason;
      const res = await fetch(`/api/appointment/callbacks/${actionRow.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Update failed");
      setActionOpen(false); await load();
    } catch (err: any) { setError(err.message); } finally { setProcessing(false); }
  }

  async function del(id: string) {
    if (!(await appConfirm(t("Delete this callback request?")))) return;
    const res = await fetch(`/api/appointment/callbacks/${id}`, { method: "DELETE" });
    if (!res.ok) { const j = await res.json().catch(() => null); setError(j?.error || "Delete failed"); return; }
    await load();
  }

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
      <Card className="shadow-sm">
        <CardContent className="p-4 border-b bg-gray-50/50">
          <div className="flex gap-3">
            <Select value={filterStatus || "all"} onValueChange={v => { setFilterStatus(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue placeholder={t("All Status")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All Status")}</SelectItem>
                <SelectItem value="pending">{t("Pending")}</SelectItem>
                <SelectItem value="approved">{t("Approved")}</SelectItem>
                <SelectItem value="completed">{t("Completed")}</SelectItem>
                <SelectItem value="cancelled">{t("Cancelled")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr className="border-b">
                  <th className="text-left font-medium px-4 py-3">{t("Client")}</th>
                  <th className="text-left font-medium px-4 py-3">{t("Appointment")}</th>
                  <th className="text-left font-medium px-4 py-3">{t("Requested Date")}</th>
                  <th className="text-left font-medium px-4 py-3">{t("Reason")}</th>
                  <th className="text-left font-medium px-4 py-3">{t("Status")}</th>
                  <th className="text-right font-medium px-4 py-3">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">{t("Loading...")}</td></tr>
                  : rows.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Phone className="h-10 w-10 text-gray-300" />
                        <div>{t("No callback requests found")}</div>
                      </div>
                    </td></tr>
                  ) : rows.map(row => {
                    const b = STATUS_BADGE[row.status] ?? { label: row.status, variant: "secondary" as const };
                    return (
                      <tr key={row.id} className="border-b hover:bg-accent/20">
                        <td className="px-4 py-3">
                          <div className="font-medium">{row.schedule?.name ?? "-"}</div>
                          <div className="text-xs text-muted-foreground">{row.schedule?.email ?? ""}</div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{row.appointment?.appointmentName ?? "-"}</td>
                        <td className="px-4 py-3">{fmtDate(row.date)}{row.startTime ? ` ${row.startTime}` : ""}</td>
                        <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{row.reason ?? "-"}</td>
                        <td className="px-4 py-3"><Badge variant={b.variant}>{t(b.label)}</Badge></td>
                        <td className="px-4 py-3 text-right">
                          <TableActionButton label={t("Actions")}
                            items={[
                              { label: t("Approve"), onSelect: () => openAction(row, "approved"), disabled: !can("manage-appointment-callbacks") || row.status === "approved" },
                              { label: t("Complete"), onSelect: () => openAction(row, "completed"), disabled: !can("manage-appointment-callbacks") || row.status === "completed" },
                              { label: t("Cancel"), onSelect: () => openAction(row, "cancelled"), disabled: !can("manage-appointment-callbacks") || row.status === "cancelled", destructive: true },
                              { label: t("Delete"), onSelect: () => del(row.id), disabled: !can("delete-appointment-callbacks"), destructive: true, icon: <Trash2 className="h-4 w-4" /> },
                            ]} />
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </CardContent>
        <CardContent className="px-4 py-2 border-t bg-gray-50/30">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">{from}–{to} {t("of")} {total}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>{t("Prev")}</Button>
              <Button variant="secondary" size="sm" className="min-w-8" disabled>{page}</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>{t("Next")}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Sheet open={actionOpen} onOpenChange={setActionOpen}>
        <SheetContent className="w-full sm:max-w-[400px] overflow-y-auto flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>{actionStatus === "approved" ? t("Approve Callback") : actionStatus === "completed" ? t("Mark Completed") : t("Cancel Callback")}</SheetTitle>
          </SheetHeader>
          <form onSubmit={applyAction} className="flex flex-col flex-1">
            <div className="flex-1 px-6 py-5 space-y-4">
              {actionRow && (
                <div className="rounded-lg border p-3 bg-muted/30 space-y-1 text-sm">
                  <p><span className="text-muted-foreground">{t("Client:")}</span> {actionRow.schedule?.name ?? "-"}</p>
                  {actionRow.date && <p><span className="text-muted-foreground">{t("Requested:")}</span> {fmtDate(actionRow.date)}</p>}
                </div>
              )}
              <div className="space-y-2">
                <Label>{t("Notes")}</Label>
                <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder={t("Optional notes...")} />
              </div>
            </div>
            <div className="border-t px-6 py-4 flex justify-end gap-2 bg-background">
              <Button type="button" variant="outline" onClick={() => setActionOpen(false)}>{t("Cancel")}</Button>
              <Button type="submit" disabled={processing} variant={actionStatus === "cancelled" ? "destructive" : "default"}>
                {processing ? t("Saving...") : t("Confirm")}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
