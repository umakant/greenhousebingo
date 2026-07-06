"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, ArrowRight, FileX } from "lucide-react";
import { TableActionButton } from "@/components/ui/table-action-button";
import { useTranslation } from "@/contexts/translation-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import NoRecordsFound from "@/components/no-records-found";
import { Pagination } from "@/components/ui/pagination";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency, parseCurrencyToNumber } from "@/lib/format-currency";
import { formatDate as fmtDateLib } from "@/lib/format-date";

type BankAccountOption = { id: number; account_name: string; bank_name: string };
type TransferRow = {
  id: number; from_account_id: number; to_account_id: number; transfer_date: string;
  amount: number; reference_number: string | null; description: string | null; fees: number;
  from_account: { account_name: string; bank_name: string } | null;
  to_account: { account_name: string; bank_name: string } | null;
};


const emptyForm = () => ({
  from_account_id: "", to_account_id: "", transfer_date: new Date().toISOString().slice(0, 10),
  amount: "", fees: "0", reference_number: "", description: "",
});

export default function AccountBankTransfersAdmin({ permissions }: { permissions: string[] }) {
  const { t } = useTranslation();
  const { settings } = useAppSettings();
  const canWrite = permissions.includes("*") || permissions.includes("manage-bank-accounts");
  const formatMoney = (v: unknown) => formatCurrency(typeof v === "number" ? v : Number(v) || 0, settings);
  const formatDate = (v: unknown) => fmtDateLib(v as string | null, settings);

  const [data, setData] = React.useState<TransferRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [lastPage, setLastPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [bankAccounts, setBankAccounts] = React.useState<BankAccountOption[]>([]);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TransferRow | null>(null);
  const [form, setForm] = React.useState(emptyForm());
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState<TransferRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [amountFocused, setAmountFocused] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/account/bank-accounts?per_page=100").then((r) => r.json()).then((j) => {
      setBankAccounts((j.data ?? []).map((b: Record<string, unknown>) => ({ id: Number(b.id), account_name: String(b.account_name ?? ""), bank_name: String(b.bank_name ?? "") })));
    }).catch(() => {});
  }, []);

  const load = React.useCallback(async ({ nextPage = page, nextSearch = search } = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(nextPage), per_page: "10" });
      if (nextSearch) params.set("search", nextSearch);
      const res = await fetch(`/api/account/bank-transfers?${params}`);
      const json = await res.json();
      setData(json.data ?? []); setTotal(json.total ?? 0); setLastPage(json.last_page ?? 1); setPage(nextPage);
    } finally { setLoading(false); }
  }, [page, search]);

  React.useEffect(() => { load({ nextPage: 1, nextSearch: "" }); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError("");
    setAmountFocused(false);
    setDialogOpen(true);
  };
  const openEdit = (row: TransferRow) => {
    setEditing(row);
    setAmountFocused(false);
    setForm({ from_account_id: String(row.from_account_id), to_account_id: String(row.to_account_id), transfer_date: row.transfer_date ? new Date(row.transfer_date).toISOString().slice(0, 10) : "", amount: String(row.amount), fees: String(row.fees ?? 0), reference_number: row.reference_number ?? "", description: row.description ?? "" });
    setFormError(""); setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true); setFormError("");
    try {
      const amountNum = parseCurrencyToNumber(String(form.amount), settings);
      if (!Number.isFinite(amountNum) || amountNum < 0) {
        setFormError(t("Enter a valid amount."));
        return;
      }
      if (amountNum <= 0) {
        setFormError(t("Enter an amount greater than zero."));
        return;
      }
      const feesNum = parseCurrencyToNumber(String(form.fees), settings);
      const feesFinal = Number.isFinite(feesNum) && feesNum >= 0 ? feesNum : 0;
      const body = {
        from_account_id: Number(form.from_account_id),
        to_account_id: Number(form.to_account_id),
        transfer_date: form.transfer_date,
        amount: amountNum,
        fees: feesFinal,
        reference_number: form.reference_number || null,
        description: form.description || null,
      };
      const url = editing ? `/api/account/bank-transfers/${editing.id}` : "/api/account/bank-transfers";
      const res = await fetch(url, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) { setFormError(json.error ?? "Failed to save"); return; }
      setDialogOpen(false); load({ nextPage: editing ? page : 1 });
    } catch { setFormError("An error occurred"); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return; setDeleting(true);
    try { await fetch(`/api/account/bank-transfers/${deleteTarget.id}`, { method: "DELETE" }); setDeleteTarget(null); load({ nextPage: 1 }); }
    finally { setDeleting(false); }
  };

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput placeholder={t("Search transfers...")} value={search} onChange={(v) => setSearch(v)} onSearch={() => load({ nextPage: 1, nextSearch: search })} />
            {canWrite && <Button onClick={openCreate} size="sm"><Plus className="mr-1 h-4 w-4" />{t("Add Transfer")}</Button>}
          </div>
          {loading ? <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">{t("Loading...")}</div>
            : data.length === 0 ? <NoRecordsFound icon={FileX} title={t("No transfers found")} description={t("Add your first bank transfer.")} hasFilters={!!search} onClearFilters={() => { setSearch(""); load({ nextPage: 1, nextSearch: "" }); }} /> : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left">
                      <tr>{[t("Reference"), t("From"), t("To"), t("Date"), t("Amount"), t("Fees")].map((h, i) => <th key={i} className="px-4 py-3 font-medium">{h}</th>)}
                        {canWrite && <th className="px-4 py-3 font-medium text-right">{t("Actions")}</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row) => (
                        <tr key={row.id} className="border-t hover:bg-muted/30">
                          <td className="px-4 py-3 font-mono text-xs">{row.reference_number ?? "—"}</td>
                          <td className="px-4 py-3">{row.from_account?.account_name ?? "—"}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1">
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              {row.to_account?.account_name ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3">{formatDate(row.transfer_date)}</td>
                          <td className="px-4 py-3 font-medium">{formatMoney(row.amount)}</td>
                          <td className="px-4 py-3">{formatMoney(row.fees)}</td>
                          {canWrite && (
                            <td className="px-4 py-3 text-right">
                              <TableActionButton
                                label={t("Edit")}
                                onPrimaryClick={() => openEdit(row)}
                                items={[
                                  { label: t("Edit"), icon: <Pencil className="h-4 w-4" />, onSelect: () => openEdit(row) },
                                  { label: t("Delete"), icon: <Trash2 className="h-4 w-4" />, onSelect: () => setDeleteTarget(row), destructive: true },
                                ]}
                              />
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {lastPage > 1 && (
                  <div className="flex items-center justify-between p-4">
                    <p className="text-sm text-muted-foreground">{t("Showing")} {(page - 1) * 10 + 1}–{Math.min(page * 10, total)} {t("of")} {total}</p>
                    <Pagination page={page} lastPage={lastPage} total={total} from={(page - 1) * 10 + 1} to={Math.min(page * 10, total)} onPageChange={(p) => load({ nextPage: p })} />
                  </div>
                )}
              </>
            )}
        </CardContent>
      </Card>

      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent className="sm:max-w-lg flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>{editing ? t("Edit Transfer") : t("Add Transfer")}</SheetTitle>
            <SheetDescription>{t("Transfer funds between bank accounts.")}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 grid gap-3 content-start">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-0.5">
                <Label required>{t("From Account")}</Label>
                <Select value={form.from_account_id} onValueChange={(v) => setForm((p) => ({ ...p, from_account_id: v }))}>
                  <SelectTrigger><SelectValue placeholder={t("Select...")} /></SelectTrigger>
                  <SelectContent>{bankAccounts.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.account_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-0.5">
                <Label required>{t("To Account")}</Label>
                <Select value={form.to_account_id} onValueChange={(v) => setForm((p) => ({ ...p, to_account_id: v }))}>
                  <SelectTrigger><SelectValue placeholder={t("Select...")} /></SelectTrigger>
                  <SelectContent>{bankAccounts.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.account_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-0.5">
                <Label required>{t("Transfer Date")}</Label>
                <Input type="date" value={form.transfer_date} onChange={(e) => setForm((p) => ({ ...p, transfer_date: e.target.value }))} />
              </div>
              <div className="grid gap-0.5">
                <Label required>{t("Amount")}</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  className="font-mono tabular-nums"
                  placeholder={formatMoney(0)}
                  value={
                    amountFocused
                      ? form.amount
                      : form.amount.trim() === ""
                        ? ""
                        : formatCurrency(Number(form.amount) || 0, settings)
                  }
                  onFocus={() => setAmountFocused(true)}
                  onBlur={() => {
                    setAmountFocused(false);
                    const raw = form.amount.trim();
                    if (raw === "") return;
                    const n = parseCurrencyToNumber(form.amount, settings);
                    if (Number.isFinite(n)) setForm((p) => ({ ...p, amount: String(n) }));
                  }}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-0.5">
                <Label>{t("Fees")}</Label>
                <Input type="number" step="0.01" min="0" value={form.fees} onChange={(e) => setForm((p) => ({ ...p, fees: e.target.value }))} />
              </div>
              <div className="grid gap-0.5">
                <Label>{t("Reference Number")}</Label>
                <Input value={form.reference_number} onChange={(e) => setForm((p) => ({ ...p, reference_number: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-0.5">
              <Label>{t("Description")}</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <SheetFooter className="px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>{t("Cancel")}</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? t("Saving...") : t("Save")}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t("Confirm Delete")}</DialogTitle><DialogDescription>{t("Are you sure you want to delete this transfer?")}</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>{t("Cancel")}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? t("Deleting...") : t("Delete")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
