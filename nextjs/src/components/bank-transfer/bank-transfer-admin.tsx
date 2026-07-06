"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import { Download, Eye, FileText, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableActionButton } from "@/components/ui/table-action-button";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency } from "@/lib/format-currency";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import { t } from "@/lib/admin-t";


type BankTransferRow = {
  id: string;
  order_id: string;
  status: "pending" | "approved" | "rejected";
  price_currency: string;
  attachment?: string | null;
  price: string;
  created_at: string | null;
  user?: { id: string; name: string; email: string } | null;
  request?: any;
  plan?: { id: string; name: string } | null;
};

type BankTransferResponse = {
  ok: boolean;
  requests: { data: BankTransferRow[]; meta: { total: number; per_page: number; current_page: number; last_page: number } };
  message?: string;
};

function statusBadge(status: string) {
  const cls =
    status === "pending"
      ? "px-2 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800"
      : status === "approved"
        ? "px-2 py-1 rounded-full text-sm bg-green-100 text-green-800"
        : "px-2 py-1 rounded-full text-sm bg-red-100 text-red-800";
  return <span className={cls}>{t(status.charAt(0).toUpperCase() + status.slice(1))}</span>;
}

export default function BankTransferAdmin({ permissions }: { permissions: string[] }) {
  const { settings } = useAppSettings();
  const fmtDate = (d: string | null | undefined) => fmtDateLib(d, settings);
  const canApprove = permissions.includes("*") || permissions.includes("approve-bank-transfer-requests");
  const canDelete = permissions.includes("*") || permissions.includes("delete-bank-transfer-requests");

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<BankTransferRow[]>([]);

  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [total, setTotal] = React.useState(0);

  const [filters, setFilters] = React.useState({ order_number: "", status: "", user_name: "" });
  const [showFilters, setShowFilters] = React.useState(false);

  const [viewing, setViewing] = React.useState<BankTransferRow | null>(null);
  const [processingId, setProcessingId] = React.useState<string | null>(null);

  async function load(opts?: { nextPage?: number; nextPerPage?: number }) {
    const p = opts?.nextPage ?? page;
    const pp = opts?.nextPerPage ?? perPage;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("per_page", String(pp));
      if (filters.order_number.trim()) params.set("order_number", filters.order_number.trim());
      if (filters.status.trim()) params.set("status", filters.status.trim());
      if (filters.user_name.trim()) params.set("user_name", filters.user_name.trim());
      const res = await fetch(`/api/bank-transfer?${params.toString()}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as BankTransferResponse | null;
      if (!res.ok || !json?.ok) throw new Error((json as any)?.message || "Failed to load requests.");
      setItems(Array.isArray(json.requests?.data) ? json.requests.data : []);
      setPage(json.requests.meta.current_page);
      setPerPage(json.requests.meta.per_page);
      setTotal(json.requests.meta.total);
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load({ nextPage: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  function apply() {
    setPage(1);
    void load({ nextPage: 1 });
  }

  function clear() {
    setFilters({ order_number: "", status: "", user_name: "" });
    setPage(1);
    void load({ nextPage: 1 });
  }

  function goto(next: number) {
    const clamped = Math.max(1, Math.min(totalPages, next));
    setPage(clamped);
    void load({ nextPage: clamped });
  }

  async function updateStatus(row: BankTransferRow, status: "approved" | "rejected") {
    if (!canApprove) return;
    setProcessingId(row.id);
    setError(null);
    try {
      const res = await fetch(`/api/bank-transfer/${row.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok || !json?.ok) throw new Error(json?.message || "Update failed.");
      await load();
    } catch (e: any) {
      setError(e?.message || "Update failed.");
    } finally {
      setProcessingId(null);
    }
  }

  async function remove(row: BankTransferRow) {
    if (!canDelete) return;
    if (!(await appConfirm(t("Are you sure you want to delete this bank transfer request?")))) return;
    setProcessingId(row.id);
    setError(null);
    try {
      const res = await fetch(`/api/bank-transfer/${row.id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok || !json?.ok) throw new Error(json?.message || "Delete failed.");
      await load();
    } catch (e: any) {
      setError(e?.message || "Delete failed.");
    } finally {
      setProcessingId(null);
    }
  }

  function downloadReceipt(row: BankTransferRow) {
    if (!row.attachment) return;
    const url = row.attachment.startsWith("/") ? row.attachment : `/${row.attachment}`;
    window.open(url, "_blank");
  }

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}

      <Card className="shadow-sm">
        <CardContent className="p-6 border-b bg-gray-50/50">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1 max-w-md min-w-[280px]">
              <div className="flex gap-2">
                <Input value={filters.order_number} onChange={(e) => setFilters((p) => ({ ...p, order_number: e.target.value }))} placeholder={t("Search by order number...")} />
                <Button type="button" onClick={apply}>
                  {t("Search")}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                value={String(perPage)}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10) || 10;
                  setPerPage(v);
                  setPage(1);
                  void load({ nextPage: 1, nextPerPage: v });
                }}
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={String(n)}>
                    {n} {t("per page")}
                  </option>
                ))}
              </select>

              <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => setShowFilters((v) => !v)}>
                {t("Filters")}
              </Button>
            </div>
          </div>

          {showFilters ? (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
              <Input value={filters.user_name} onChange={(e) => setFilters((p) => ({ ...p, user_name: e.target.value }))} placeholder={t("User name")} />
              <Select value={filters.status} onValueChange={(v) => setFilters((p) => ({ ...p, status: v }))}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={t("Status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t("All")}</SelectItem>
                  <SelectItem value="pending">{t("Pending")}</SelectItem>
                  <SelectItem value="approved">{t("Approved")}</SelectItem>
                  <SelectItem value="rejected">{t("Rejected")}</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2 md:col-span-2">
                <Button type="button" onClick={apply} className="flex-1">
                  {t("Apply")}
                </Button>
                <Button type="button" variant="outline" onClick={clear}>
                  {t("Clear")}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr className="border-b">
                  <th className="text-left font-medium px-4 py-3">{t("Order Number")}</th>
                  <th className="text-left font-medium px-4 py-3">{t("User")}</th>
                  <th className="text-left font-medium px-4 py-3">{t("Plan")}</th>
                  <th className="text-left font-medium px-4 py-3">{t("Amount")}</th>
                  <th className="text-left font-medium px-4 py-3">{t("Status")}</th>
                  <th className="text-left font-medium px-4 py-3">{t("Date")}</th>
                  <th className="text-right font-medium px-4 py-3">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      {t("Loading...")}
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-14">
                      <div className="flex flex-col items-center justify-center text-center gap-2">
                        <FileText className="h-12 w-12 text-muted-foreground" />
                        <div className="font-medium">{t("No bank transfer requests found")}</div>
                        <div className="text-sm text-muted-foreground">{t("Bank transfer requests will appear here when users submit them.")}</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-accent/20">
                      <td className="px-4 py-3">{r.order_id}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.user?.name || "N/A"}</div>
                        <div className="text-sm text-muted-foreground">{r.user?.email || "N/A"}</div>
                      </td>
                      <td className="px-4 py-3">{r.plan?.name || String(r.request?.plan_id ?? "N/A")}</td>
                      <td className="px-4 py-3">{formatCurrency(parseFloat(String(r.price)) || 0, settings)}</td>
                      <td className="px-4 py-3">{statusBadge(r.status)}</td>
                      <td className="px-4 py-3">{r.created_at ? fmtDate(r.created_at) : "-"}</td>
                      <td className="px-4 py-3 text-right">
                        <TableActionButton
                          label={t("Edit")}
                          onPrimaryClick={() => updateStatus(r, "approved")}
                          disabled={!canApprove || processingId === r.id}
                          items={[
                            { label: t("View"), onSelect: () => setViewing(r), icon: <Eye className="h-4 w-4" /> },
                            { label: t("Download Receipt"), onSelect: () => downloadReceipt(r), disabled: !r.attachment, icon: <Download className="h-4 w-4" /> },
                            { label: t("Approve"), onSelect: () => updateStatus(r, "approved"), disabled: !canApprove || processingId === r.id },
                            { label: t("Reject"), onSelect: () => updateStatus(r, "rejected"), disabled: !canApprove || processingId === r.id, destructive: true },
                            { label: t("Delete"), onSelect: () => remove(r), disabled: !canDelete || processingId === r.id, destructive: true, icon: <Trash2 className="h-4 w-4" /> },
                          ]}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>

        <CardContent className="px-4 py-2 border-t bg-gray-50/30">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-muted-foreground">
              {t("Showing")} {from} {t("to")} {to} {t("of")} {total} {t("results")}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => goto(page - 1)} disabled={page <= 1}>
                {t("Previous")}
              </Button>
              <Button type="button" variant="secondary" size="sm" className="min-w-9" disabled>
                {page}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => goto(page + 1)} disabled={page >= totalPages}>
                {t("Next")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {viewing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setViewing(null)}>
          <div className="w-full max-w-2xl rounded-lg border bg-background shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <div className="font-semibold">{t("Bank Transfer Request")}</div>
              <Button variant="ghost" onClick={() => setViewing(null)}>
                {t("Close")}
              </Button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">{t("Order Number")}</div>
                  <div className="font-medium">{viewing.order_id}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t("Status")}</div>
                  <div>{statusBadge(viewing.status)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t("User")}</div>
                  <div className="font-medium">{viewing.user?.name || "N/A"}</div>
                  <div className="text-xs text-muted-foreground">{viewing.user?.email || ""}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t("Amount")}</div>
                  <div className="font-medium">{formatCurrency(parseFloat(String(viewing.price)) || 0, settings)}</div>
                </div>
              </div>
              {viewing.attachment ? (
                <div className="pt-2">
                  <Button variant="outline" onClick={() => downloadReceipt(viewing)}>
                    <Download className="h-4 w-4 mr-2" />
                    {t("Download Receipt")}
                  </Button>
                </div>
              ) : null}
              <pre className="mt-3 rounded-md bg-muted p-3 text-xs overflow-auto">{JSON.stringify(viewing.request ?? {}, null, 2)}</pre>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

